import { useState, useEffect } from 'react';
import { openClawApi } from '../services/api';
import './AgentsPage.css';

export default function AgentsPage() {
    const [agents, setAgents] = useState([]);

    useEffect(() => {
        // Attempt real fetch
        openClawApi.fetchAgents()
            .then(res => {
                if (Array.isArray(res)) setAgents(res);
                else if (res?.list) setAgents(res.list);
            })
            .catch(err => {
                console.error("Agent fetch failed, using fallback:", err);
                // Fallback for visual mock
                setAgents([
                    { id: 'main', name: 'Master Agent', status: 'Active', task: 'Monitoring' },
                    { id: 'sub-1', name: 'Code Worker', status: 'Idle', task: '-' },
                    { id: 'sub-2', name: 'Analyzer', status: 'Active', task: 'Processing Logs' }
                ]);
            });
    }, []);

    return (
        <div className="page-container agents-page">
            <header className="page-header">
                <h1 className="animate-fade-in"><span className="text-gradient">Agent</span> Fleet</h1>
                <p className="subtitle">Manage primary and subagent clusters.</p>
            </header>

            <div className="agents-grid">
                {agents.map((agent, index) => (
                    <div
                        key={agent.id}
                        className="agent-card glass-panel animate-fade-in"
                        style={{ animationDelay: `${index * 0.15}s` }}
                    >
                        <div className="agent-header">
                            <div className="agent-icon">🤖</div>
                            <div className={`status-badge ${agent.status?.toLowerCase() === 'active' ? 'active' : 'idle'}`}>
                                {agent.status || 'Unknown'}
                            </div>
                        </div>

                        <h3 className="agent-name">{agent.name}</h3>
                        <p className="agent-id">ID: {agent.id}</p>

                        <div className="agent-task">
                            <span>Current Task:</span>
                            <div className="task-desc">{agent.task || 'Awaiting orders'}</div>
                        </div>

                        <div className="agent-controls">
                            <button className="btn btn-primary">Config</button>
                            <button className="btn btn-danger">Stop</button>
                        </div>
                    </div>
                ))}
                {agents.length === 0 && <div className="loading-state">Loading Agents...</div>}
            </div>
        </div>
    );
}
