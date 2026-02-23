import { useState, useEffect, useRef } from 'react';
import { openClawApi } from '../services/api';
import './AgentsPage.css';

// ─── Agent messaging + thinking modal ────────────────────────────────────────
function AgentModal({ agent, onClose, liveRun }) {
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [log, setLog] = useState([]);
    const [showThinking, setShowThinking] = useState(false);
    const logRef = useRef(null);

    // Scroll to bottom on new entries
    useEffect(() => {
        if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
    }, [log]);

    // Subscribe to live run events for THIS agent
    useEffect(() => {
        const agentId = agent.agentId || agent.id;
        const unsub = openClawApi.subscribe((data) => {
            if (data.type !== 'event') return;
            const p = data.payload;

            // Match events that belong to this agent
            const evtAgentId = p?.agentId || p?.agent?.id || p?.sessionKey?.split(':')[0];
            if (evtAgentId && evtAgentId !== agentId) return;

            if (data.event === 'chat.stream' || data.event === 'run.delta' || data.event === 'agent.delta') {
                const state = p?.state;
                const thinking = p?.thinking || p?.message?.thinking;
                const text = typeof p?.message === 'string' ? p.message
                    : p?.message?.text || p?.message?.content || p?.delta || '';

                if (state === 'delta') {
                    setLog(l => {
                        const last = l[l.length - 1];
                        // Accumulate into existing streaming entry
                        if (last?.role === 'agent' && last?.streaming) {
                            return [...l.slice(0, -1), {
                                ...last,
                                text: last.text + text,
                                thinking: thinking ? (last.thinking || '') + thinking : last.thinking,
                            }];
                        }
                        return [...l, { role: 'agent', text, thinking, streaming: true }];
                    });
                } else if (state === 'final' || state === 'aborted') {
                    setLog(l => {
                        const last = l[l.length - 1];
                        if (last?.streaming) return [...l.slice(0, -1), { ...last, streaming: false }];
                        return l;
                    });
                }
            }
        });
        return () => unsub();
    }, [agent]);

    const handleSend = async () => {
        if (!message.trim() || sending) return;
        const msg = message.trim();
        setMessage('');
        setSending(true);
        setLog(l => [...l, { role: 'user', text: msg }]);
        try {
            await openClawApi.sendToAgent(agent.agentId || agent.id, msg);
            // Response arrives via live event subscription above
        } catch (err) {
            setLog(l => [...l, { role: 'error', text: err?.message || 'Failed to send.' }]);
        } finally {
            setSending(false);
        }
    };

    const agentName = agent.name || agent.agentId || agent.id;
    const hasThinking = log.some(e => e.thinking);

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-panel glass-panel" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <h3>💬 {agentName}</h3>
                        {agent.model && <span className="modal-model">🧠 {agent.model}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {hasThinking && (
                            <button
                                className={`btn btn-secondary thinking-toggle ${showThinking ? 'active' : ''}`}
                                onClick={() => setShowThinking(s => !s)}
                                title="Toggle thinking"
                            >
                                🧠 {showThinking ? 'Hide' : 'Show'} Thinking
                            </button>
                        )}
                        {liveRun && (
                            <span className="modal-run-badge">
                                <span className="pulse-dot" /> Running
                            </span>
                        )}
                        <button className="modal-close" onClick={onClose}>✕</button>
                    </div>
                </div>

                <div className="modal-log" ref={logRef}>
                    {log.length === 0 && (
                        <div className="log-empty">
                            {liveRun
                                ? '⚡ Agent is currently running — live output will appear here.'
                                : 'Send a message to interact with this agent.'}
                        </div>
                    )}
                    {log.map((entry, i) => (
                        <div key={i} className={`log-entry log-${entry.role}`}>
                            <div className="log-role-row">
                                <span className="log-role">
                                    {entry.role === 'user' ? 'You'
                                        : entry.role === 'error' ? '⚠️ Error'
                                            : agentName}
                                </span>
                                {entry.streaming && <span className="streaming-indicator" />}
                            </div>

                            {/* Thinking block */}
                            {showThinking && entry.thinking && (
                                <div className="thinking-block">
                                    <div className="thinking-label">💭 Thinking</div>
                                    <p className="thinking-text">{entry.thinking}</p>
                                </div>
                            )}

                            <p className="log-text">{entry.text || <em className="muted">…</em>}</p>
                        </div>
                    ))}
                </div>

                <div className="modal-input-row">
                    <input
                        className="modal-input"
                        type="text"
                        placeholder={liveRun ? 'Agent is running...' : 'Send a message...'}
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                        disabled={sending}
                    />
                    <button
                        className="btn btn-primary modal-send"
                        onClick={handleSend}
                        disabled={sending || !message.trim()}
                    >
                        {sending ? '…' : '▶'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Utility ──────────────────────────────────────────────────────────────────
function getAgentIcon(agent) {
    const id = (agent.agentId || agent.id || '').toLowerCase();
    if (id === 'main' || id.includes('main')) return '🧠';
    if (id.includes('code') || id.includes('dev')) return '💻';
    if (id.includes('web') || id.includes('browse')) return '🌐';
    if (id.includes('write') || id.includes('doc')) return '📝';
    return '🤖';
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AgentsPage() {
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedAgent, setSelectedAgent] = useState(null);
    const [search, setSearch] = useState('');
    // Map of agentId → { running: bool, model?: string, runId?: string }
    const [liveStates, setLiveStates] = useState({});

    const doFetch = () => {
        setLoading(true);
        openClawApi.fetchAgents()
            .then(res => {
                let list = [];
                if (Array.isArray(res)) list = res;
                else if (res?.agents) list = res.agents;
                else if (res?.list) list = res.list;
                setAgents(list);
            })
            .catch(err => console.error('Agent fetch failed:', err))
            .finally(() => setLoading(false));
    };

    // Interpret static agent status
    const resolveStaticStatus = (agent) => {
        const s = (agent.status || agent.state || '').toLowerCase();
        if (s.includes('run') || s.includes('active') || s.includes('busy')) return 'running';
        if (s.includes('stop') || s.includes('off') || s.includes('error')) return 'stopped';
        return 'idle';
    };

    // Merge static + live状态
    const resolveStatus = (agent) => {
        const id = agent.agentId || agent.id;
        if (liveStates[id]?.running) return 'running';
        return resolveStaticStatus(agent);
    };

    useEffect(() => {
        if (openClawApi.connected) doFetch();

        const unsub = openClawApi.subscribe((data) => {
            // Connection events
            if (data.type === 'connection_change' && data.connected) { doFetch(); return; }

            // Gateway live events
            if (data.type === 'event') {
                const evt = data.event || '';
                const p = data.payload || {};

                // Identify affected agent
                const agentId = p.agentId || p.agent?.id
                    || (p.sessionKey ? p.sessionKey.split(':')[0] : null);

                // Run started
                if (evt.includes('run.start') || evt.includes('agent.start') ||
                    (evt.includes('chat') && p.state === 'delta') ||
                    evt.includes('run.delta') || evt.includes('agent.delta')) {
                    if (agentId) {
                        setLiveStates(prev => ({
                            ...prev,
                            [agentId]: { running: true, runId: p.runId, model: p.model || prev[agentId]?.model }
                        }));
                    }
                }

                // Run finished
                if (evt.includes('run.end') || evt.includes('agent.end') ||
                    evt.includes('run.done') || evt.includes('agent.done') ||
                    (evt.includes('chat') && (p.state === 'final' || p.state === 'aborted' || p.state === 'error'))) {
                    if (agentId) {
                        setLiveStates(prev => ({
                            ...prev,
                            [agentId]: { ...prev[agentId], running: false }
                        }));
                    }
                }

                // State changed events
                if (evt.includes('agent.state') || evt.includes('agents.')) {
                    doFetch();
                }
            }
        });

        return () => unsub();
    }, []);

    const filtered = agents.filter(a => {
        const q = search.toLowerCase();
        return !q || (a.name || a.agentId || a.id || '').toLowerCase().includes(q);
    });

    const counts = agents.reduce((acc, a) => {
        const s = resolveStatus(a);
        acc[s] = (acc[s] || 0) + 1;
        return acc;
    }, {});

    return (
        <div className="page-container agents-page">
            <header className="page-header">
                <h1 className="animate-fade-in"><span className="text-gradient">Agent</span> Fleet</h1>
                <p className="subtitle">Live status, model usage, and direct agent interaction.</p>
            </header>

            <div className="agents-toolbar animate-fade-in" style={{ animationDelay: '0.1s' }}>
                <div className="agent-stats-row">
                    <span className="stat-pill total">{agents.length} Agents</span>
                    {counts.running > 0 && <span className="stat-pill running">{counts.running} Running</span>}
                    {counts.idle > 0 && <span className="stat-pill idle">{counts.idle} Idle</span>}
                    {counts.stopped > 0 && <span className="stat-pill stopped">{counts.stopped} Stopped</span>}
                </div>
                <input className="agent-search" type="text" placeholder="🔍 Search agents..."
                    value={search} onChange={e => setSearch(e.target.value)} />
                <button className="btn btn-primary" onClick={doFetch}>↻ Refresh</button>
            </div>

            {loading && agents.length === 0 ? (
                <div className="loading-state animate-fade-in">
                    <div className="loading-spinner" /> Connecting to gateway...
                </div>
            ) : filtered.length === 0 ? (
                <div className="loading-state animate-fade-in">
                    {search ? `No agents matching "${search}"` : 'No agents found.'}
                </div>
            ) : (
                <div className="agents-grid">
                    {filtered.map((agent, index) => {
                        const agentId = agent.agentId || agent.id;
                        const live = liveStates[agentId] || {};
                        const status = resolveStatus(agent);
                        const model = live.model || agent.model || agent.settings?.model;

                        return (
                            <div key={agentId || index}
                                className={`agent-card glass-panel animate-fade-in ${status === 'running' ? 'card-running' : ''}`}
                                style={{ animationDelay: `${index * 0.08}s` }}>

                                <div className="agent-header">
                                    <div className="agent-icon">{getAgentIcon(agent)}</div>
                                    <div className={`status-badge ${status}`}>
                                        {status === 'running' && <span className="pulse-dot" />}
                                        {status}
                                    </div>
                                </div>

                                <h3 className="agent-name">{agent.name || agentId}</h3>
                                <p className="agent-id">ID: {agentId}</p>

                                {model && (
                                    <div className="agent-model-tag">
                                        🧠 {model}
                                    </div>
                                )}

                                {status === 'running' && (
                                    <div className="agent-running-bar">
                                        <div className="running-bar-fill" />
                                        <span>Processing…</span>
                                    </div>
                                )}

                                {(agent.currentTask || agent.task || agent.description) && status !== 'running' && (
                                    <div className="agent-task">
                                        <span>Last Task</span>
                                        <div className="task-desc">{agent.currentTask || agent.task || agent.description}</div>
                                    </div>
                                )}

                                <div className="agent-controls">
                                    <button className="btn btn-primary" onClick={() => setSelectedAgent(agent)}>
                                        💬 Message
                                    </button>
                                    <button className="btn btn-secondary" onClick={doFetch}>↻</button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {selectedAgent && (
                <AgentModal
                    agent={selectedAgent}
                    onClose={() => setSelectedAgent(null)}
                    liveRun={liveStates[selectedAgent.agentId || selectedAgent.id]?.running}
                />
            )}
        </div>
    );
}
