import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import OverviewPage from './pages/OverviewPage';
import AgentsPage from './pages/AgentsPage';
import ModelsPage from './pages/ModelsPage';
import SettingsPage from './pages/SettingsPage';
import { openClawApi } from './services/api';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [connected, setConnected] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    // Initial connect
    openClawApi.connect();

    // Subscribe to connection changes
    const unsubscribe = openClawApi.subscribe((data) => {
      if (data.type === 'connection_change') {
        setConnected(data.connected);
      }
    });

    return () => unsubscribe();
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return <OverviewPage />;
      case 'agents': return <AgentsPage />;
      case 'models': return <ModelsPage />;
      case 'settings': return <SettingsPage />;
      default: return <OverviewPage />;
    }
  };

  return (
    <div className="app-layout">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setIsSidebarOpen(false);
        }}
        connected={connected}
        isOpen={isSidebarOpen}
        closeSidebar={() => setIsSidebarOpen(false)}
      />

      {isSidebarOpen && <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>}

      <main className="main-content">
        <div className="mobile-header">
          <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(true)}>
            ☰
          </button>
          <h2>OpenClaw <span className="text-gradient">Dash</span></h2>
        </div>
        {!connected && (
          <div className="connection-warning glass-panel animate-fade-in">
            ⚠️ Disconnected from OpenClaw Gateway. Reconnecting...
          </div>
        )}
        {renderContent()}
      </main>
    </div>
  );
}

export default App;
