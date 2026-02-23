import { useState, useEffect } from 'react';
import { openClawApi } from '../services/api';
import './SettingsPage.css';

const SECTION_ICONS = { gateway: '🔌', agents: '🤖', models: '🧠', auth: '🔐', advanced: '⚙️' };

function ConfigSection({ title, icon, children }) {
    const [open, setOpen] = useState(true);
    return (
        <div className="config-section glass-panel animate-fade-in">
            <div className="config-section-header" onClick={() => setOpen(o => !o)}>
                <span className="section-icon">{icon}</span>
                <h3>{title}</h3>
                <span className="chevron">{open ? '▾' : '▸'}</span>
            </div>
            {open && <div className="config-section-body">{children}</div>}
        </div>
    );
}

function ConfigRow({ label, hint, children }) {
    return (
        <div className="config-row">
            <div className="config-label-group">
                <span className="config-label">{label}</span>
                {hint && <span className="config-hint">{hint}</span>}
            </div>
            <div className="config-control">{children}</div>
        </div>
    );
}

function ReadOnlyValue({ value }) {
    return <span className="config-readonly">{value === undefined || value === null ? <em>not set</em> : String(value)}</span>;
}

export default function SettingsPage() {
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saveStatus, setSaveStatus] = useState(null); // null | 'saving' | 'saved' | 'error'
    const [pendingPatch, setPendingPatch] = useState({});

    const doFetch = () => {
        setLoading(true);
        openClawApi.fetchConfig()
            .then(res => setConfig(res))
            .catch(err => console.error('Config fetch failed:', err))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        if (openClawApi.connected) doFetch();
        const unsub = openClawApi.subscribe(d => {
            if (d.type === 'connection_change' && d.connected) doFetch();
        });
        return () => unsub();
    }, []);

    const patch = (path, value) => {
        // Build a nested patch object from a dot-separated path
        const keys = path.split('.');
        const update = {};
        let cur = update;
        keys.forEach((k, i) => {
            if (i === keys.length - 1) cur[k] = value;
            else { cur[k] = {}; cur = cur[k]; }
        });
        setPendingPatch(prev => deepMerge(prev, update));
    };

    const deepMerge = (base, overlay) => {
        const out = { ...base };
        Object.entries(overlay).forEach(([k, v]) => {
            out[k] = (v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object')
                ? deepMerge(base[k], v) : v;
        });
        return out;
    };

    const get = (path) => {
        const keys = path.split('.');
        let cur = config;
        for (const k of keys) {
            if (cur == null) return undefined;
            cur = cur[k];
        }
        return cur;
    };

    const handleSave = async () => {
        if (!Object.keys(pendingPatch).length) return;
        setSaveStatus('saving');
        try {
            await openClawApi.patchConfig(pendingPatch);
            setPendingPatch({});
            setSaveStatus('saved');
            doFetch();
            setTimeout(() => setSaveStatus(null), 2000);
        } catch (err) {
            console.error('Config save failed:', err);
            setSaveStatus('error');
            setTimeout(() => setSaveStatus(null), 3000);
        }
    };

    const hasPending = Object.keys(pendingPatch).length > 0;

    if (loading && !config) {
        return (
            <div className="page-container settings-page">
                <div className="loading-state animate-fade-in">
                    <div className="loading-spinner" />Fetching configuration...
                </div>
            </div>
        );
    }

    return (
        <div className="page-container settings-page">
            <header className="page-header">
                <h1 className="animate-fade-in"><span className="text-gradient">System</span> Configuration</h1>
                <p className="subtitle">Live gateway settings — changes apply immediately.</p>
            </header>

            {/* Save bar */}
            {hasPending && (
                <div className="save-bar animate-fade-in">
                    <span>You have unsaved changes</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-ghost" onClick={() => setPendingPatch({})}>Discard</button>
                        <button className="btn btn-primary" onClick={handleSave} disabled={saveStatus === 'saving'}>
                            {saveStatus === 'saving' ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            )}
            {saveStatus === 'saved' && !hasPending && (
                <div className="save-bar save-bar-success animate-fade-in">✓ Configuration saved successfully.</div>
            )}
            {saveStatus === 'error' && (
                <div className="save-bar save-bar-error animate-fade-in">✗ Failed to save. Check gateway logs.</div>
            )}

            {!config ? (
                <div className="loading-state">
                    No configuration data available. Verify the gateway connection and operator.admin scope.
                </div>
            ) : (
                <div className="config-sections">

                    <ConfigSection title="Gateway" icon={SECTION_ICONS.gateway}>
                        <ConfigRow label="Gateway Version" hint="Read-only">
                            <ReadOnlyValue value={config?.version} />
                        </ConfigRow>
                        <ConfigRow label="Hostname / Host" hint="Read-only">
                            <ReadOnlyValue value={config?.host || config?.hostname} />
                        </ConfigRow>
                        <ConfigRow label="Port" hint="Listening port">
                            <ReadOnlyValue value={config?.port || config?.gateway?.port} />
                        </ConfigRow>
                        <ConfigRow label="Auth Mode" hint="How clients authenticate">
                            <ReadOnlyValue value={config?.authMode || config?.gateway?.authMode || config?.auth?.mode} />
                        </ConfigRow>
                        <ConfigRow label="Log Level" hint="Gateway log verbosity">
                            <select className="config-select"
                                defaultValue={get('logLevel') || get('gateway.logLevel') || 'info'}
                                onChange={e => patch('logLevel', e.target.value)}>
                                {['error', 'warn', 'info', 'debug'].map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                        </ConfigRow>
                    </ConfigSection>

                    <ConfigSection title="Agent Defaults" icon={SECTION_ICONS.agents}>
                        <ConfigRow label="Default Model" hint="Model used when none is specified">
                            <input className="config-input" type="text"
                                defaultValue={get('agent.model') || get('agents.defaultModel') || ''}
                                placeholder="e.g. gpt-4o"
                                onBlur={e => patch('agent.model', e.target.value)} />
                        </ConfigRow>
                        <ConfigRow label="Max Tokens" hint="Response token limit">
                            <input className="config-input" type="number"
                                defaultValue={get('agent.maxTokens') || get('agents.maxTokens') || ''}
                                placeholder="e.g. 4096"
                                onBlur={e => patch('agent.maxTokens', Number(e.target.value))} />
                        </ConfigRow>
                        <ConfigRow label="Temperature" hint="Model creativity (0–2)">
                            <input className="config-input" type="number" step="0.1" min="0" max="2"
                                defaultValue={get('agent.temperature') || ''}
                                placeholder="e.g. 0.7"
                                onBlur={e => patch('agent.temperature', parseFloat(e.target.value))} />
                        </ConfigRow>
                        <ConfigRow label="System Prompt" hint="Default system prompt">
                            <textarea className="config-textarea" rows={4}
                                defaultValue={get('agent.systemPrompt') || get('agents.systemPrompt') || ''}
                                placeholder="You are a helpful AI assistant..."
                                onBlur={e => patch('agent.systemPrompt', e.target.value)} />
                        </ConfigRow>
                    </ConfigSection>

                    <ConfigSection title="Model Providers" icon={SECTION_ICONS.models}>
                        {['openai', 'anthropic', 'google', 'mistral', 'groq', 'ollama'].map(provider => {
                            const keyPath = `providers.${provider}.apiKey`;
                            const enabledPath = `providers.${provider}.enabled`;
                            const isEnabled = get(enabledPath);
                            return (
                                <ConfigRow key={provider} label={provider.charAt(0).toUpperCase() + provider.slice(1)}
                                    hint="API key + enable/disable">
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <input
                                            className="config-input"
                                            type="password"
                                            placeholder={get(keyPath) ? '••••••••••••' : 'API Key'}
                                            onBlur={e => e.target.value && patch(keyPath, e.target.value)}
                                        />
                                        <label className="toggle-label">
                                            <input type="checkbox"
                                                defaultChecked={isEnabled !== false}
                                                onChange={e => patch(enabledPath, e.target.checked)}
                                            />
                                            <span className="toggle-track" />
                                        </label>
                                    </div>
                                </ConfigRow>
                            );
                        })}
                    </ConfigSection>

                    <ConfigSection title="Security & Auth" icon={SECTION_ICONS.auth}>
                        <ConfigRow label="Allowed Origins" hint="CORS origins (comma-separated)">
                            <input className="config-input" type="text"
                                defaultValue={(get('allowedOrigins') || []).join(', ')}
                                placeholder="e.g. http://localhost:3000"
                                onBlur={e => patch('allowedOrigins', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} />
                        </ConfigRow>
                        <ConfigRow label="Allow Tailscale" hint="Auto-trust tailnet addresses">
                            <label className="toggle-label">
                                <input type="checkbox"
                                    defaultChecked={get('allowTailscale') || false}
                                    onChange={e => patch('allowTailscale', e.target.checked)} />
                                <span className="toggle-track" />
                            </label>
                        </ConfigRow>
                        <ConfigRow label="Max Payload (bytes)" hint="Max WS frame size">
                            <input className="config-input" type="number"
                                defaultValue={get('gateway.maxPayload') || ''}
                                placeholder="e.g. 1048576"
                                onBlur={e => patch('gateway.maxPayload', Number(e.target.value))} />
                        </ConfigRow>
                    </ConfigSection>

                    <ConfigSection title="Raw Config" icon={SECTION_ICONS.advanced}>
                        <div className="raw-config">
                            <pre>{JSON.stringify(config, null, 2)}</pre>
                        </div>
                    </ConfigSection>

                </div>
            )}
        </div>
    );
}
