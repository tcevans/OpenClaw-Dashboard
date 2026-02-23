import { useState, useEffect } from 'react';
import './SettingsPage.css';

export default function SettingsPage() {
    const [settings, setSettings] = useState({
        gatewayUrl: 'ws://127.0.0.1:18789',
        password: 'qtclaw',
        autoRefresh: true,
        refreshInterval: 30
    });
    const [isEditing, setIsEditing] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    const handleSettingChange = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
        setHasChanges(true);
    };

    const saveSettings = () => {
        // Save to localStorage
        try {
            localStorage.setItem('openclaw_dashboard_settings', JSON.stringify(settings));
            alert('Settings saved successfully!\n\nNote: Some changes may require a page reload to take effect.');
            setHasChanges(false);
        } catch (e) {
            alert('Failed to save settings: ' + e.message);
        }
    };

    const loadSettings = () => {
        try {
            const saved = localStorage.getItem('openclaw_dashboard_settings');
            if (saved) {
                setSettings(prev => ({ ...prev, ...JSON.parse(saved) }));
            }
        } catch (e) {
            console.warn('Failed to load saved settings:', e);
        }
    };

    useEffect(() => {
        loadSettings();
    }, []);

    return (
        <div className="page-container settings-page">
            <header className="page-header">
                <h1 className="animate-fade-in">Dashboard <span className="text-gradient">Settings</span></h1>
                <p className="subtitle">Configure your OpenClaw Dashboard preferences.</p>
            </header>

            <div className="settings-content">
                <div className="settings-section glass-panel animate-fade-in">
                    <h2 className="section-title">Gateway Connection</h2>
                    
                    <div className="setting-row">
                        <label className="setting-label">
                            Gateway URL:
                            <input
                                type="text"
                                className="setting-input"
                                value={settings.gatewayUrl}
                                onChange={(e) => handleSettingChange('gatewayUrl', e.target.value)}
                                placeholder="ws://127.0.0.1:18789"
                            />
                        </label>
                        <p className="setting-help">WebSocket URL of your OpenClaw Gateway</p>
                    </div>

                    <div className="setting-row">
                        <label className="setting-label">
                            Gateway Password:
                            <input
                                type="password"
                                className="setting-input"
                                value={settings.password}
                                onChange={(e) => handleSettingChange('password', e.target.value)}
                                placeholder="Enter password"
                            />
                        </label>
                        <p className="setting-help">Password for Gateway authentication</p>
                    </div>
                </div>

                <div className="settings-section glass-panel animate-fade-in" style={{ animationDelay: '0.1s' }}>
                    <h2 className="section-title">Display Preferences</h2>
                    
                    <div className="setting-row">
                        <label className="setting-label checkbox-label">
                            <input
                                type="checkbox"
                                className="setting-checkbox"
                                checked={settings.autoRefresh}
                                onChange={(e) => handleSettingChange('autoRefresh', e.target.checked)}
                            />
                            <span>Enable auto-refresh</span>
                        </label>
                        <p className="setting-help">Automatically refresh dashboard data</p>
                    </div>

                    {settings.autoRefresh && (
                        <div className="setting-row">
                            <label className="setting-label">
                                Refresh interval (seconds):
                                <input
                                    type="number"
                                    className="setting-input"
                                    value={settings.refreshInterval}
                                    onChange={(e) => handleSettingChange('refreshInterval', parseInt(e.target.value) || 30)}
                                    min="5"
                                    max="300"
                                />
                            </label>
                            <p className="setting-help">How often to refresh data (5-300 seconds)</p>
                        </div>
                    )}
                </div>

                <div className="settings-section glass-panel animate-fade-in" style={{ animationDelay: '0.2s' }}>
                    <h2 className="section-title">About</h2>
                    <div className="about-section">
                        <p><strong>OpenClaw Dashboard</strong> v1.0.0</p>
                        <p>Web interface for monitoring and managing OpenClaw Gateway</p>
                        <div className="links">
                            <a href="https://github.com/tcevans/OpenClaw-Dashboard" target="_blank" rel="noopener noreferrer">
                                GitHub Repository
                            </a>
                            <a href="https://docs.openclaw.ai" target="_blank" rel="noopener noreferrer">
                                Documentation
                            </a>
                        </div>
                    </div>
                </div>

                <div className="settings-actions">
                    <button 
                        className={`btn-save ${hasChanges ? 'has-changes' : ''}`}
                        onClick={saveSettings}
                        disabled={!hasChanges}
                    >
                        {hasChanges ? '💾 Save Changes' : '✓ Saved'}
                    </button>
                </div>
            </div>
        </div>
    );
}
