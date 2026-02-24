import { useState, useEffect } from 'react';
import { openClawApi } from '../services/api';
import './AgentsPage.css';

export default function AgentsPage() {
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAgents = async () => {
            if (!openClawApi.connected) {
                setError('Not connected to Gateway');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);
                
                const response = await openClawApi.fetchAgents();
                console.log('[AgentsPage] fetchAgents response:', response);
                
                // Parse response - handle different formats
                // Gateway returns: { agents: [...], defaultId, mainKey, scope }
                const agentList = Array.isArray(response) ? response : (response?.agents || response?.list || []);
                
                setAgents(agentList);
            } catch (err) {
                console.error('[AgentsPage] Failed to fetch agents:', err);
                setError(err.message || 'Failed to load agents');
            } finally {
                setLoading(false);
            }
        };

        fetchAgents();
    }, []);

    return (
        <div className="page-container agents-page">
            <header className="page-header">
                <h1 className="animate-fade-in">Agent <span className="text-gradient">Control</span></h1>
                <p className="subtitle">Manage and monitor your OpenClaw agents.</p>
            </header>

            {loading && (
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading agents...</p>
                </div>
            )}

            {error && (
                <div className="error-state">
                    <div className="error-icon">❌</div>
                    <p>{error}</p>
                </div>
            )}

            {!loading && !error && agents.length === 0 && (
                <div className="empty-state">
                    <div className="empty-icon">🤖</div>
                    <h3>No agents found</h3>
                    <p>There are no agents configured in OpenClaw Gateway.</p>
                </div>
            )}

            {!loading && !error && agents.length > 0 && (
                <div className="agents-grid">
                    {agents.map((agent, index) => (
                        <div 
                            key={agent.id || index} 
                            className="agent-card glass-panel animate-fade-in"
                            style={{ animationDelay: `${index * 0.1}s` }}
                        >
                            <div className="agent-header">
                                <div className="agent-icon">🤖</div>
                                <div className="agent-info">
                                    <h3 className="agent-name">{agent.name || 'Unnamed Agent'}</h3>
                                    <p className="agent-id">ID: {agent.id}</p>
                                </div>
                            </div>
                            
                            <div className="agent-details">
                                <div className="detail-row">
                                    <span className="detail-label">Model:</span>
                                    <span className="detail-value">{agent.model || 'default'}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Default:</span>
                                    <span className="detail-value">{agent.default ? 'Yes' : 'No'}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Workspace:</span>
                                    <span className="detail-value">{agent.workspace || 'Not set'}</span>
                                </div>
                            </div>

                            <div className="agent-actions">
                                <button 
                                    className="btn-primary"
                                    onClick={() => window.alert(`Agent ${agent.id} selected. Feature coming soon!`)}
                                >
                                    Select
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
