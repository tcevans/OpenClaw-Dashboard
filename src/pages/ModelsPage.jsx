import { useState, useEffect } from 'react';
import { openClawApi } from '../services/api';
import './ModelsPage.css';

const PROVIDER_META = {
    openai: { label: 'OpenAI', color: '#10a37f', icon: '🟢' },
    anthropic: { label: 'Anthropic', color: '#d4a574', icon: '🟤' },
    google: { label: 'Google', color: '#4285f4', icon: '🔵' },
    mistral: { label: 'Mistral', color: '#ff6600', icon: '🟠' },
    ollama: { label: 'Ollama', color: '#a855f7', icon: '🟣' },
    groq: { label: 'Groq', color: '#f43f5e', icon: '🔴' },
    local: { label: 'Local', color: '#6b7280', icon: '⚫' },
};

function getProviderMeta(providerId = '', modelId = '') {
    const key = (providerId || modelId || '').toLowerCase();
    for (const [k, v] of Object.entries(PROVIDER_META)) {
        if (key.includes(k)) return v;
    }
    return { label: providerId || 'Unknown', color: '#6b7280', icon: '⚬' };
}

function categorizeModel(model) {
    const id = (model.id || model.modelId || '').toLowerCase();
    const name = (model.name || '').toLowerCase();
    const combined = id + ' ' + name;
    if (combined.includes('vision') || combined.includes('image') || combined.includes('4o') || combined.includes('opus')) return 'multimodal';
    if (combined.includes('embed')) return 'embedding';
    if (combined.includes('code') || combined.includes('codex') || combined.includes('starcoder')) return 'code';
    if (combined.includes('mini') || combined.includes('small') || combined.includes('tiny') || combined.includes('haiku') || combined.includes('flash')) return 'fast';
    return 'general';
}

const CATEGORIES = ['all', 'in use', 'general', 'multimodal', 'code', 'fast', 'embedding'];

const CAT_LABELS = {
    'all': 'All Models',
    'in use': '⚡ In Use',
    general: '🧠 General',
    multimodal: '🌅 Multimodal',
    code: '💻 Code',
    fast: '⚡ Fast',
    embedding: '📐 Embedding',
};

export default function ModelsPage() {
    const [models, setModels] = useState([]);
    const [inUseIds, setInUseIds] = useState(new Set());
    const [category, setCategory] = useState('all');
    const [sort, setSort] = useState('provider');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    const doFetch = () => {
        setLoading(true);
        Promise.all([
            openClawApi.fetchModels().catch(() => null),
            openClawApi.fetchAgents().catch(() => null),
        ]).then(([modelsRes, agentsRes]) => {
            let allModels = [];
            if (modelsRes?.providers) {
                Object.entries(modelsRes.providers).forEach(([providerId, p]) => {
                    const models = p.models || p.list || [];
                    models.forEach(m => allModels.push({ ...m, _provider: providerId }));
                });
            } else if (Array.isArray(modelsRes)) {
                allModels = modelsRes;
            } else if (modelsRes?.models) {
                allModels = modelsRes.models;
            }
            setModels(allModels);

            // Determine "in use" from agents' model field
            const inUse = new Set();
            const agentList = Array.isArray(agentsRes) ? agentsRes : (agentsRes?.agents || agentsRes?.list || []);
            agentList.forEach(a => {
                if (a.model) inUse.add(a.model);
                if (a.settings?.model) inUse.add(a.settings.model);
            });
            setInUseIds(inUse);
        }).finally(() => setLoading(false));
    };

    useEffect(() => {
        if (openClawApi.connected) doFetch();
        const unsub = openClawApi.subscribe(d => {
            if (d.type === 'connection_change' && d.connected) doFetch();
        });
        return () => unsub();
    }, []);

    const filtered = models.filter(m => {
        const q = search.toLowerCase();
        const id = m.id || m.modelId || '';
        const name = m.name || '';
        const provider = m._provider || m.provider || '';
        if (q && !(id + name + provider).toLowerCase().includes(q)) return false;
        if (category === 'in use') return inUseIds.has(id) || inUseIds.has(name);
        if (category !== 'all') return categorizeModel(m) === category;
        return true;
    });

    const sorted = [...filtered].sort((a, b) => {
        if (sort === 'provider') {
            const pa = (a._provider || a.provider || '').toLowerCase();
            const pb = (b._provider || b.provider || '').toLowerCase();
            return pa.localeCompare(pb) || (a.id || '').localeCompare(b.id || '');
        }
        if (sort === 'name') return (a.name || a.id || '').localeCompare(b.name || b.id || '');
        if (sort === 'context') return (b.contextWindow || b.context_length || 0) - (a.contextWindow || a.context_length || 0);
        return 0;
    });

    const providerCount = {};
    models.forEach(m => {
        const p = m._provider || m.provider || 'unknown';
        providerCount[p] = (providerCount[p] || 0) + 1;
    });

    return (
        <div className="page-container models-page">
            <header className="page-header">
                <h1 className="animate-fade-in"><span className="text-gradient">Model</span> Catalog</h1>
                <p className="subtitle">Browse and filter AI models across all providers.</p>
            </header>

            {/* Summary pills */}
            <div className="models-summary animate-fade-in" style={{ animationDelay: '0.05s' }}>
                <span className="stat-pill total">{models.length} models</span>
                {inUseIds.size > 0 && <span className="stat-pill active">{inUseIds.size} in use</span>}
                {Object.entries(providerCount).map(([p, c]) => {
                    const meta = getProviderMeta(p);
                    return <span key={p} className="stat-pill provider-pill" style={{ borderColor: meta.color + '66' }}>{meta.icon} {meta.label}: {c}</span>;
                })}
            </div>

            {/* Toolbar */}
            <div className="models-toolbar animate-fade-in" style={{ animationDelay: '0.1s' }}>
                <div className="category-tabs">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat}
                            className={`cat-tab ${category === cat ? 'active' : ''}`}
                            onClick={() => setCategory(cat)}
                        >
                            {CAT_LABELS[cat] || cat}
                            {cat === 'in use' && inUseIds.size > 0 && <span className="cat-badge">{inUseIds.size}</span>}
                        </button>
                    ))}
                </div>
                <div className="models-controls">
                    <input
                        className="model-search"
                        type="text"
                        placeholder="🔍 Search models..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    <select className="sort-select" value={sort} onChange={e => setSort(e.target.value)}>
                        <option value="provider">Sort: Provider</option>
                        <option value="name">Sort: Name</option>
                        <option value="context">Sort: Context Window</option>
                    </select>
                    <button className="btn btn-primary" onClick={doFetch}>↻</button>
                </div>
            </div>

            {loading && models.length === 0 ? (
                <div className="loading-state animate-fade-in">
                    <div className="loading-spinner" />Connecting...
                </div>
            ) : sorted.length === 0 ? (
                <div className="loading-state animate-fade-in">
                    {search || category !== 'all' ? 'No models match your filters.' : 'No models found.'}
                </div>
            ) : (
                <div className="models-grid">
                    {sorted.map((model, i) => {
                        const id = model.id || model.modelId || `model-${i}`;
                        const providerId = model._provider || model.provider || '';
                        const meta = getProviderMeta(providerId, id);
                        const ctx = model.contextWindow || model.context_length;
                        const cat = categorizeModel(model);
                        const isInUse = inUseIds.has(id) || inUseIds.has(model.name);
                        return (
                            <div
                                key={id}
                                className={`model-card glass-panel animate-fade-in ${isInUse ? 'in-use' : ''}`}
                                style={{ animationDelay: `${i * 0.04}s`, '--provider-color': meta.color }}
                            >
                                <div className="model-card-top">
                                    <span className="provider-badge" style={{ borderColor: meta.color + '88', color: meta.color }}>
                                        {meta.icon} {meta.label}
                                    </span>
                                    <div className="model-tags">
                                        {isInUse && <span className="tag tag-inuse">IN USE</span>}
                                        <span className="tag">{cat}</span>
                                    </div>
                                </div>

                                <h3 className="model-name">{model.name || id}</h3>
                                {model.name && model.name !== id && <p className="model-id">{id}</p>}

                                {ctx && (
                                    <div className="model-ctx">
                                        <span className="ctx-label">Context</span>
                                        <span className="ctx-val">{ctx >= 1000 ? `${(ctx / 1000).toFixed(0)}k` : ctx}</span>
                                    </div>
                                )}

                                {model.description && (
                                    <p className="model-desc">{model.description}</p>
                                )}

                                <div className="model-footer">
                                    {model.maxOutputTokens && (
                                        <span className="footer-chip">Out: {(model.maxOutputTokens / 1000).toFixed(0)}k</span>
                                    )}
                                    {model.inputCost !== undefined && (
                                        <span className="footer-chip">${model.inputCost}/1M in</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
