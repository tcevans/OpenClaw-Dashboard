import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Avatar,
  CircularProgress,
  Alert,
  useTheme
} from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import SettingsIcon from '@mui/icons-material/Settings';
import { openClawApi, Agent } from '../services/api';

export default function AgentsPage() {
  const theme = useTheme();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        setLoading(true);
        setError(null);

        // Ensure we are connected or in demo mode
        if (!openClawApi.connected && !openClawApi.demoMode) {
             openClawApi.connect();
             await new Promise(r => setTimeout(r, 500));
        }

        const response = await openClawApi.fetchAgents();
        const list = Array.isArray(response) ? response : (response?.agents || response?.list || []);
        setAgents(list);
      } catch (err: any) {
        console.error("Failed to fetch agents", err);
        setError(err.message || "Failed to load agents");
      } finally {
        setLoading(false);
      }
    };

    fetchAgents();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'success';
      case 'idle': return 'warning';
      case 'error': return 'error';
      case 'offline': return 'default';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          Agent <span style={{ color: theme.palette.primary.main }}>Control</span>
        </Typography>
        <Button variant="contained" startIcon={<SmartToyIcon />}>
          New Agent
        </Button>
      </Box>

      {loading && <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}

      {error && <Alert severity="error" sx={{ mb: 4 }}>{error}</Alert>}

      {!loading && !error && agents.length === 0 && (
        <Alert severity="info">No agents found. Create one to get started.</Alert>
      )}

      <Grid container spacing={3}>
        {agents.map((agent) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={agent.id}>
            <Card sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s',
                '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 6
                }
            }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ bgcolor: theme.palette.primary.main, mr: 2 }}>
                    <SmartToyIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" component="div">
                      {agent.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ID: {agent.id}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ mb: 2 }}>
                    <Chip
                        label={agent.status.toUpperCase()}
                        color={getStatusColor(agent.status) as any}
                        size="small"
                        sx={{ mr: 1 }}
                    />
                    {agent.default && <Chip label="DEFAULT" color="info" size="small" variant="outlined" />}
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  <strong>Model:</strong> {agent.model}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  <strong>Workspace:</strong> {agent.workspace || 'N/A'}
                </Typography>
                {agent.lastActivity && (
                    <Typography variant="body2" color="text.secondary">
                        <strong>Last Active:</strong> {new Date(agent.lastActivity).toLocaleString()}
                    </Typography>
                )}
              </CardContent>
              <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                <Button size="small" startIcon={<SettingsIcon />}>Configure</Button>
                {agent.status === 'running' ? (
                    <Button size="small" color="error" startIcon={<StopIcon />}>Stop</Button>
                ) : (
                    <Button size="small" color="success" startIcon={<PlayArrowIcon />}>Start</Button>
                )}
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
