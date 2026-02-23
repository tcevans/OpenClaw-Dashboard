import { useState } from 'react';
import './Sidebar.css';

export default function Sidebar({ activeTab, setActiveTab, isOpen, closeSidebar }) {
    const tabs = [
        { id: 'overview', label: 'Overview', icon: '◱' },
        { id: 'agents', label: 'Agents Control', icon: '🤖' },
        { id: 'models', label: 'Model Usage', icon: '📊' },
        { id: 'settings', label: 'Settings', icon: '⚙️' }
    ];

    return (
        <div className={`sidebar glass-panel ${isOpen ? 'open' : ''}`}>
            <div className="sidebar-header">
                <div className="logo pulse-glow">✦</div>
                <h2>OpenClaw <span className="text-gradient">Dash</span></h2>
                <button className="close-sidebar-btn" onClick={closeSidebar}>×</button>
            </div>

            <nav className="sidebar-nav">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`nav-btn ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        <span className="icon">{tab.icon}</span>
                        <span className="label">{tab.label}</span>
                    </button>
                ))}
            </nav>

            <div className="sidebar-footer">
                <div className="status-indicator">
                    <span className="dot animate-fade-in" style={{ background: 'var(--success)', boxShadow: '0 0 10px var(--success)' }}></span>
                    <span className="status-text">System Online</span>
                </div>
            </div>
        </div>
    );
}
