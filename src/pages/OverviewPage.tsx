import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  useTheme,
  LinearProgress
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import ModelTrainingIcon from '@mui/icons-material/ModelTraining';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import SpeedIcon from '@mui/icons-material/Speed';
import { openClawApi } from '../services/api';

// Mock data for charts
const generateChartData = () => {
  const data = [];
  for (let i = 0; i < 24; i++) {
    data.push({
      name: `${i}:00`,
      requests: Math.floor(Math.random() * 100) + 20,
      latency: Math.floor(Math.random() * 50) + 80,
    });
  }
  return data;
};

const generateModelUsageData = () => [
  { name: 'GPT-4o', usage: 4000 },
  { name: 'Claude 3.5', usage: 3000 },
  { name: 'Gemini 1.5', usage: 2000 },
  { name: 'Llama 3', usage: 2780 },
];

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, color }) => (
  <Card sx={{ height: '100%', position: 'relative', overflow: 'visible' }}>
    <Box
      sx={{
        position: 'absolute',
        top: -20,
        left: 20,
        bgcolor: color,
        borderRadius: 2,
        p: 1.5,
        boxShadow: 3,
        color: 'white'
      }}
    >
      {icon}
    </Box>
    <CardContent sx={{ pt: 4, pb: '16px !important' }}>
      <Typography variant="body2" color="text.secondary" align="right" gutterBottom>
        {title}
      </Typography>
      <Typography variant="h4" component="div" align="right" sx={{ fontWeight: 'bold' }}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary" align="right" display="block" sx={{ mt: 1 }}>
        {subtitle}
      </Typography>
    </CardContent>
  </Card>
);

export default function OverviewPage() {
  const theme = useTheme();
  const [stats, setStats] = useState({
    agentsCount: 0,
    modelsCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);
  const [modelData, setModelData] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Force demo mode or ensure mock data returns if failed
        if (!openClawApi.connected && !openClawApi.demoMode) {
            // Trigger connection attempt which falls back to demo
            openClawApi.connect();
        }

        // Wait a bit for connection/mock
        await new Promise(r => setTimeout(r, 500));

        const [agents, models] = await Promise.all([
          openClawApi.fetchAgents().catch(() => ({ agents: [] })),
          openClawApi.fetchModels().catch(() => ({ providers: {} }))
        ]);

        const agentsCount = Array.isArray(agents?.agents) ? agents.agents.length : (Array.isArray(agents) ? agents.length : 0);

        let modelsCount = 0;
        if (models?.providers) {
            modelsCount = Object.values(models.providers).reduce((acc: number, p: any) => acc + (p.models?.length || 0), 0);
        } else if (Array.isArray(models)) {
            modelsCount = models.length;
        }

        setStats({ agentsCount, modelsCount });
        setChartData(generateChartData());
        setModelData(generateModelUsageData());
      } catch (error) {
        console.error("Failed to fetch overview data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const unsub = openClawApi.subscribe(() => {
        // Refresh on updates if needed, but for now we just load once or on mount
    });
    return () => { unsub(); };
  }, []);

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 4, fontWeight: 'bold' }}>
        System <span style={{ color: theme.palette.primary.main }}>Overview</span>
      </Typography>

      {loading && <LinearProgress sx={{ mb: 4 }} />}

      <Grid container spacing={4} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Active Agents"
            value={stats.agentsCount}
            subtitle="Running tasks"
            icon={<SmartToyIcon fontSize="medium" />}
            color={theme.palette.secondary.main}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Available Models"
            value={stats.modelsCount}
            subtitle="Ready to serve"
            icon={<ModelTrainingIcon fontSize="medium" />}
            color={theme.palette.primary.main}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Requests (24h)"
            value="1,284"
            subtitle="+14% increase"
            icon={<FlashOnIcon fontSize="medium" />}
            color="#ffb703"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Avg Latency"
            value="124ms"
            subtitle="System healthy"
            icon={<SpeedIcon fontSize="medium" />}
            color={theme.palette.success.main}
          />
        </Grid>
      </Grid>

      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ height: 400, p: 2 }}>
            <Typography variant="h6" gutterBottom>Request Traffic</Typography>
            <ResponsiveContainer width="100%" height="90%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="name" stroke={theme.palette.text.secondary} />
                <YAxis stroke={theme.palette.text.secondary} />
                <Tooltip
                    contentStyle={{ backgroundColor: theme.palette.background.paper, border: 'none', borderRadius: 8 }}
                />
                <Legend />
                <Line type="monotone" dataKey="requests" stroke={theme.palette.primary.main} strokeWidth={3} dot={false} activeDot={{ r: 8 }} />
                <Line type="monotone" dataKey="latency" stroke={theme.palette.secondary.main} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ height: 400, p: 2 }}>
            <Typography variant="h6" gutterBottom>Model Usage</Typography>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={modelData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" horizontal={false} />
                <XAxis type="number" stroke={theme.palette.text.secondary} />
                <YAxis dataKey="name" type="category" width={100} stroke={theme.palette.text.secondary} />
                <Tooltip
                    cursor={{fill: 'transparent'}}
                    contentStyle={{ backgroundColor: theme.palette.background.paper, border: 'none', borderRadius: 8 }}
                />
                <Bar dataKey="usage" fill={theme.palette.primary.main} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
