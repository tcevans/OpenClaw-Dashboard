import { useState, useEffect } from 'react';
import DashboardCard from '../components/DashboardCard';
import { openClawApi } from '../services/api';
import './OverviewPage.css';

export default function OverviewPage() {
    const [stats, setStats] = useState({
        agentsCount: 0,
        modelsCount: 0,
        systemStatus: 'Connecting...',
        uptime: '0h',
        requestsToday: 0,
        avgLatency: 0
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchOverviewData = async () => {
        if (!openClawApi.connected) return;
        
        setLoading(true);
        setError(null);
        
        try {
            // Fetch agents and models (system.status is not supported by Gateway yet)
            const [agents, models] = await Promise.all([
                openClawApi.fetchAgents().catch(err => {
                    console.warn('Failed to fetch agents:', err);
                    return { list: [] };
                }),
                openClawApi.fetchModels().catch(err => {
                    console.warn('Failed to fetch models:', err);
                    return { providers: {} };
                })
            ]);

            // Parse agents count
            const agentsCount = Array.isArray(agents) ? agents.length : (agents?.list?.length || 0);
            
            // Parse models count
            const modelsCount = models?.providers ? 
                Object.values(models.providers).reduce((acc, p) => acc + (p.models?.length || 0), 0) : 0;

            setStats({
                agentsCount,
                modelsCount,
                systemStatus: 'Connected',
                uptime: '0h',
                requestsToday: 0,
                avgLatency: 0
            });
        } catch (e) {
            console.error("Failed to load overview data", e);
            setError("Failed to load data. Please check connection.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Initial data fetch
        fetchOverviewData();
        
        // Subscribe to connection changes
        const unsubscribe = openClawApi.subscribe((data) => {
            if (data.type === 'connection_change') {
                if (data.connected) {
                    setStats(prev => ({ ...prev, systemStatus: 'Connected' }));
                    fetchOverviewData();
                } else {
                    setStats(prev => ({ ...prev, systemStatus: 'Disconnected' }));
                    setLoading(false);
                }
            }
        });

        // Set up periodic refresh (every 5 seconds)
        const interval = setInterval(() => {
            if (openClawApi.connected && !loading) {
                fetchOverviewData();
            }
        }, 5000);

        return () => {
            unsubscribe();
            clearInterval(interval);
        };
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
