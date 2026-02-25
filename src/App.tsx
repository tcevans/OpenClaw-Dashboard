import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import MainLayout from './layouts/MainLayout';
import OverviewPage from './pages/OverviewPage';
import AgentsPage from './pages/AgentsPage';
import ModelsPage from './pages/ModelsPage';
import SettingsPage from './pages/SettingsPage';
import CalendarPage from './pages/CalendarPage';
import KanbanPage from './pages/KanbanPage';
import { openClawApi } from './services/api';
import './App.css'; // Keep for now, but most styles are moved to MUI/Tailwind

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#45f3ff',
    },
    secondary: {
      main: '#9d4edd',
    },
    background: {
      default: '#0b0c10',
      paper: '#1e2028',
    },
    text: {
      primary: '#f8f9fa',
      secondary: '#adb5bd',
    },
  },
  typography: {
    fontFamily: '"Outfit", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#0b0c10',
          borderRight: '1px solid rgba(255, 255, 255, 0.05)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#0b0c10', // Override paper
          backgroundImage: 'none',
        }
      }
    }
  },
});

function App() {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Initial connect
    openClawApi.connect();

    // Subscribe to connection changes
    const unsubscribe = openClawApi.subscribe((data: any) => {
      if (data.type === 'connection_change') {
        setConnected(data.connected);
      }
    });

    return () => { unsubscribe(); };
  }, []);

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<OverviewPage />} />
            <Route path="agents" element={<AgentsPage />} />
            <Route path="models" element={<ModelsPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="kanban" element={<KanbanPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
