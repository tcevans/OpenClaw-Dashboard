import { useState, useEffect } from 'react';
import DashboardCard from '../components/DashboardCard';
import { openClawApi } from '../services/api';
import './OverviewPage.css';

export default function OverviewPage() {
    const [stats, setStats] = useState({
        agentsCount: 0,
        modelsCount: 0,
        systemStatus: 'Unknown'
    });

    useEffect(() => {
        // Fetch initial data
        const fetchOverviewData = async () => {
            try {
                const [agents, models] = await Promise.all([
                    openClawApi.fetchAgents().catch(() => ({ list: [] })),
                    openClawApi.fetchModels().catch(() => ({ providers: {} }))
                ]);

                // Very basic parsing, will be refined as we see real payloads from Gateway
                let agentsCount = Array.isArray(agents) ? agents.length : (agents?.list?.length || 0);
                let modelsCount = models?.providers ? Object.values(models.providers).reduce((acc, p) => acc + (p.models?.length || 0), 0) : 0;

                setStats({
                    agentsCount,
                    modelsCount,
                    systemStatus: 'Healthy'
                });
            } catch (e) {
                console.error("Failed to load overview data", e);
            }
        };

        if (openClawApi.connected) {
            fetchOverviewData();
        }
    }, []);

    return (
        <div className="page-container overview-page">
            <header className="page-header">
                <h1 className="animate-fade-in">System <span className="text-gradient">Overview</span></h1>
                <p className="subtitle">Real-time metrics and system health.</p>
                {loading && <div className="loading-indicator">📊 Loading data...</div>}
                {error && <div className="error-message">❌ {error}</div>}
            </header>

            <div className="dashboard-grid">
                <DashboardCard
                    title="Active Agents"
                    value={loading ? "..." : stats.agentsCount}
                    subtitle="All systems nominal"
                    icon="🤖"
                    delay={0.1}
                />
                <DashboardCard
                    title="Available Models"
                    value={loading ? "..." : stats.modelsCount}
                    subtitle="Across all providers"
                    icon="🧠"
                    delay={0.2}
                />
                <DashboardCard
                    title="Requests Today"
                    value={loading ? "..." : stats.requestsToday.toLocaleString()}
                    subtitle="Today's activity"
                    icon="⚡"
                    delay={0.3}
                />
                <DashboardCard
                    title="Avg Latency"
                    value={loading ? "..." : `${stats.avgLatency}ms`}
                    subtitle="Response time"
                    icon="📡"
                    delay={0.4}
                />
            </div>

            <div className="main-panel glass-panel animate-fade-in" style={{ animationDelay: '0.5s', marginTop: '32px' }}>
                <h2>Connection Status</h2>
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    padding: '20px',
                    fontSize: '18px'
                }}>
                    <span style={{ 
                        width: '12px', 
                        height: '12px', 
                        borderRadius: '50%', 
                        backgroundColor: stats.systemStatus === 'Connected' ? '#4ade80' : '#ef4444',
                        boxShadow: `0 0 8px ${stats.systemStatus === 'Connected' ? '#4ade80' : '#ef4444'}`
                    }}></span>
                    <span>{stats.systemStatus}</span>
                    {stats.uptime && stats.systemStatus === 'Connected' && (
                        <span style={{ marginLeft: 'auto', opacity: 0.7 }}>Uptime: {stats.uptime}</span>
                    )}
                </div>
            </div>
        </div>
    );
}
