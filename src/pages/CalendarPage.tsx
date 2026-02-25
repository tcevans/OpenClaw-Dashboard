import { useState } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Box, Typography, Card, useTheme } from '@mui/material';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const now = new Date();

const events = [
  {
    id: 0,
    title: 'System Maintenance',
    allDay: true,
    start: new Date(now.getFullYear(), now.getMonth(), 1),
    end: new Date(now.getFullYear(), now.getMonth(), 1),
    resource: 'all',
  },
  {
    id: 1,
    title: 'Model Training (GPT-4o)',
    start: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0),
    end: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0),
    resource: 'model',
  },
  {
    id: 2,
    title: 'Agent Review',
    start: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 15, 0),
    end: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 16, 0),
    resource: 'agent',
  },
  {
      id: 3,
      title: 'Database Backup',
      start: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 2, 0),
      end: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 3, 0),
  }
];

export default function CalendarPage() {
  const theme = useTheme();
  const [myEvents, setEvents] = useState(events);

  return (
    <Box sx={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h4" sx={{ mb: 2, fontWeight: 'bold' }}>
        System <span style={{ color: theme.palette.primary.main }}>Calendar</span>
      </Typography>

      <Card sx={{ flexGrow: 1, p: 2, bgcolor: 'background.paper' }}>
        <Calendar
          localizer={localizer}
          events={myEvents}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%', color: theme.palette.text.primary }}
          defaultView={Views.MONTH}
          views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
          popup
          selectable
          onSelectEvent={(event) => alert(event.title)}
          eventPropGetter={(event) => {
              let backgroundColor = theme.palette.primary.main;
              if (event.resource === 'model') backgroundColor = theme.palette.secondary.main;
              if (event.resource === 'agent') backgroundColor = theme.palette.success.main;
              return { style: { backgroundColor } };
          }}
        />
      </Card>

      {/* CSS Override for Dark Mode Calendar */}
      <style>{`
        .rbc-calendar {
            font-family: ${theme.typography.fontFamily};
        }
        .rbc-toolbar button {
            color: ${theme.palette.text.primary};
        }
        .rbc-toolbar button:active, .rbc-toolbar button.rbc-active {
            background-color: ${theme.palette.action.selected};
            color: ${theme.palette.primary.main};
        }
        .rbc-header {
            border-bottom: 1px solid ${theme.palette.divider};
        }
        .rbc-month-view, .rbc-time-view, .rbc-agenda-view {
            border: 1px solid ${theme.palette.divider};
        }
        .rbc-day-bg + .rbc-day-bg {
            border-left: 1px solid ${theme.palette.divider};
        }
        .rbc-month-row + .rbc-month-row {
            border-top: 1px solid ${theme.palette.divider};
        }
        .rbc-off-range-bg {
            background-color: ${theme.palette.action.hover};
        }
        .rbc-today {
            background-color: ${theme.palette.action.selected};
        }
      `}</style>
    </Box>
  );
}
