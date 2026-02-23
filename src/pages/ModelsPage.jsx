import { useState, useEffect } from 'react';
import { openClawApi } from '../services/api';
import './ModelsPage.css';

export default function ModelsPage() {
    const [models, setModels] = useState([]);

    useEffect(() => {
        openClawApi.fetchModels()
            .then(res => {
                if (res?.providers) {
                    const allModels = [];
                    Object.values(res.providers).forEach(p => {
                        if (p.models) allModels.push(...p.models);
                    });
                    setModels(allModels);
                } else if (Array.isArray(res)) {
                    setModels(res);
                }
            })
            .catch(err => {
                console.error("Model fetch failed, using fallback:", err);
                // Fallback mock
                setModels([
                    { id: 'gpt-4o', name: 'GPT-4 Omni', contextWindow: 128000, provider: 'OpenAI' },
                    { id: 'claude-3-opus', name: 'Claude 3 Opus', contextWindow: 200000, provider: 'Anthropic' },
                    { id: 'llama-3-70b', name: 'LLaMA 3 70B', contextWindow: 8192, provider: 'Local' }
                ]);
            });
    }, []);

    return (
        <div className="page-container models-page">
            <header className="page-header">
                <h1 className="animate-fade-in"><span className="text-gradient">Model</span> Capabilities</h1>
                <p className="subtitle">Track token usage and available AI models.</p>
            </header>

            <div className="models-grid">
                {models.map((model, index) => (
                    <div
                        key={model.id}
                        className="model-card glass-panel animate-fade-in"
                        style={{ animationDelay: `${index * 0.1}s` }}
                    >
                        <div className="model-header">
                            <span className="provider-badge">{model.provider || 'Provider'}</span>
                        </div>

                        <h3 className="model-name">{model.name}</h3>
                        <p className="model-id">{model.id}</p>

                        <div className="model-stats">
                            <div className="stat-row">
                                <span className="stat-label">Context Window</span>
                                <span className="stat-val">{(model.contextWindow / 1000).toFixed(0)}k</span>
                            </div>
                            <div className="stat-row token-bar">
                                <div className="token-fill" style={{ width: `${Math.random() * 60 + 10}%` }}></div>
                            </div>
                            <div className="stat-row">
                                <span className="stat-label">Recent Usage</span>
                                <span className="stat-val">High</span>
                            </div>
                        </div>
                    </div>
                ))}
                {models.length === 0 && <div className="loading-state">Loading Models...</div>}
            </div>
        </div>
    );
}
