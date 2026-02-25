import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  InputAdornment,
  CircularProgress,
  useTheme
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import MemoryIcon from '@mui/icons-material/Memory';
import { openClawApi, Model } from '../services/api';

const PROVIDER_META: Record<string, { label: string; color: string }> = {
    openai: { label: 'OpenAI', color: '#10a37f' },
    anthropic: { label: 'Anthropic', color: '#d4a574' },
    google: { label: 'Google', color: '#4285f4' },
    mistral: { label: 'Mistral', color: '#ff6600' },
    ollama: { label: 'Ollama', color: '#a855f7' },
    groq: { label: 'Groq', color: '#f43f5e' },
    local: { label: 'Local', color: '#6b7280' },
};

const getProviderMeta = (providerId = '') => {
    const key = providerId.toLowerCase();
    for (const [k, v] of Object.entries(PROVIDER_META)) {
        if (key.includes(k)) return v;
    }
    return { label: providerId || 'Unknown', color: '#6b7280' };
};

export default function ModelsPage() {
  const theme = useTheme();
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('provider');

  useEffect(() => {
    const fetchModels = async () => {
      try {
        setLoading(true);
        if (!openClawApi.connected && !openClawApi.demoMode) {
             openClawApi.connect();
             await new Promise(r => setTimeout(r, 500));
        }

        const response = await openClawApi.fetchModels();
        let list: Model[] = [];
        if (response?.providers) {
            Object.values(response.providers).forEach((p: any) => {
                list = list.concat(p.models || []);
            });
        } else if (Array.isArray(response)) {
            list = response;
        } else if (response?.models) {
            list = response.models;
        }
        setModels(list);
      } catch (err) {
        console.error("Failed to fetch models", err);
      } finally {
        setLoading(false);
      }
    };
    fetchModels();
  }, []);

  const filteredModels = models.filter(model => {
      const q = search.toLowerCase();
      const matchSearch = model.name.toLowerCase().includes(q) || model.id.toLowerCase().includes(q) || model.provider.toLowerCase().includes(q);
      if (!matchSearch) return false;
      return true; // Simple search for now
  }).sort((a, b) => {
      if (sort === 'provider') return a.provider.localeCompare(b.provider);
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'context') return (b.contextWindow || 0) - (a.contextWindow || 0);
      return 0;
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          Model <span style={{ color: theme.palette.primary.main }}>Catalog</span>
        </Typography>
        <Chip label={`${models.length} Models`} color="primary" variant="outlined" />
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
        <TextField
          label="Search Models"
          variant="outlined"
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ flexGrow: 1, minWidth: 200 }}
        />
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Sort By</InputLabel>
          <Select
            value={sort}
            label="Sort By"
            onChange={(e) => setSort(e.target.value)}
          >
            <MenuItem value="provider">Provider</MenuItem>
            <MenuItem value="name">Name</MenuItem>
            <MenuItem value="context">Context Window</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {loading && <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}

      {!loading && filteredModels.length === 0 && (
          <Typography variant="body1" align="center" color="text.secondary">No models found matching your criteria.</Typography>
      )}

      <Grid container spacing={3}>
        {filteredModels.map((model, index) => {
            const meta = getProviderMeta(model.provider);
            return (
                <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={model.id + index}>
                    <Card sx={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        position: 'relative',
                        overflow: 'visible',
                        mt: 2,
                        '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 }
                    }}>
                        <Box sx={{
                            position: 'absolute',
                            top: -12,
                            left: 16,
                            bgcolor: meta.color,
                            color: 'white',
                            px: 1,
                            py: 0.5,
                            borderRadius: 1,
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            zIndex: 1
                        }}>
                            {meta.label}
                        </Box>
                        <CardContent sx={{ pt: 3, flexGrow: 1 }}>
                            <Typography variant="h6" gutterBottom noWrap title={model.name}>
                                {model.name}
                            </Typography>
                            <Typography variant="caption" display="block" color="text.secondary" gutterBottom>
                                ID: {model.id}
                            </Typography>
                            {model.description && (
                                <Typography variant="body2" color="text.secondary" sx={{
                                    mt: 1,
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden'
                                }}>
                                    {model.description}
                                </Typography>
                            )}

                            <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                {model.contextWindow && (
                                    <Chip
                                        icon={<MemoryIcon sx={{ fontSize: '1rem !important' }} />}
                                        label={`${(model.contextWindow / 1000).toFixed(0)}k Ctx`}
                                        size="small"
                                        variant="outlined"
                                    />
                                )}
                                {model.inputCost && (
                                    <Chip
                                        label={`$${model.inputCost}/1M`}
                                        size="small"
                                        color="success"
                                        variant="outlined"
                                    />
                                )}
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            );
        })}
      </Grid>
    </Box>
  );
}
