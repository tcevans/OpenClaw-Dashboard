import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardHeader,
  TextField,
  FormControlLabel,
  Switch,
  Button,
  Divider,
  Alert,
  Snackbar,
  useTheme
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';

export default function SettingsPage() {
  const theme = useTheme();
  const [settings, setSettings] = useState({
      gatewayUrl: 'ws://127.0.0.1:18789',
      password: 'qtclaw',
      autoRefresh: true,
      refreshInterval: 30
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [openSnackbar, setOpenSnackbar] = useState(false);

  useEffect(() => {
      const saved = localStorage.getItem('openclaw_dashboard_settings');
      if (saved) {
          try {
              setSettings(prev => ({ ...prev, ...JSON.parse(saved) }));
          } catch (e) {
              console.error("Failed to parse settings", e);
          }
      }
  }, []);

  const handleChange = (key: string, value: any) => {
      setSettings(prev => ({ ...prev, [key]: value }));
      setHasChanges(true);
  };

  const saveSettings = () => {
      try {
          localStorage.setItem('openclaw_dashboard_settings', JSON.stringify(settings));
          setHasChanges(false);
          setOpenSnackbar(true);
          // Ideally trigger a reconnect or config reload in api
          window.location.reload(); // Simple way to apply new connection settings
      } catch (e) {
          console.error("Failed to save settings", e);
      }
  };

  return (
    <Box maxWidth="md" sx={{ mx: 'auto' }}>
      <Typography variant="h4" sx={{ mb: 4, fontWeight: 'bold' }}>
        Dashboard <span style={{ color: theme.palette.primary.main }}>Settings</span>
      </Typography>

      <Card sx={{ mb: 4 }}>
        <CardHeader title="Gateway Connection" subheader="Configure your OpenClaw Gateway WebSocket URL" />
        <Divider />
        <CardContent>
          <TextField
            fullWidth
            label="Gateway URL"
            value={settings.gatewayUrl}
            onChange={(e) => handleChange('gatewayUrl', e.target.value)}
            margin="normal"
            helperText="Example: ws://127.0.0.1:18789"
          />
          <TextField
            fullWidth
            label="Gateway Password"
            type="password"
            value={settings.password}
            onChange={(e) => handleChange('password', e.target.value)}
            margin="normal"
          />
        </CardContent>
      </Card>

      <Card sx={{ mb: 4 }}>
        <CardHeader title="Display Preferences" />
        <Divider />
        <CardContent>
          <FormControlLabel
            control={
              <Switch
                checked={settings.autoRefresh}
                onChange={(e) => handleChange('autoRefresh', e.target.checked)}
              />
            }
            label="Enable Auto-Refresh"
          />

          {settings.autoRefresh && (
            <TextField
                fullWidth
                type="number"
                label="Refresh Interval (seconds)"
                value={settings.refreshInterval}
                onChange={(e) => handleChange('refreshInterval', parseInt(e.target.value) || 30)}
                margin="normal"
                inputProps={{ min: 5, max: 300 }}
            />
          )}
        </CardContent>
      </Card>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={saveSettings}
            disabled={!hasChanges}
          >
              Save Changes
          </Button>
      </Box>

      <Snackbar open={openSnackbar} autoHideDuration={6000} onClose={() => setOpenSnackbar(false)}>
        <Alert onClose={() => setOpenSnackbar(false)} severity="success" sx={{ width: '100%' }}>
          Settings saved successfully! Reloading...
        </Alert>
      </Snackbar>
    </Box>
  );
}
