import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Box,
  Card,
  CardContent,
  Typography,
  useTheme,
  Chip,
  Avatar,
  AvatarGroup,
  Stack
} from '@mui/material';

// Types
interface Assignee {
  id: string;
  name: string;
  initials: string;
  color?: string;
  avatarUrl?: string;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  assignees: Assignee[];
}

// Mock Data
const ASSIGNEES: Record<string, Assignee> = {
  alice: { id: 'u1', name: 'Alice Admin', initials: 'AA', color: '#ff5722' },
  bob: { id: 'u2', name: 'Bob Builder', initials: 'BB', color: '#2196f3' },
  charlie: { id: 'u3', name: 'Charlie Coder', initials: 'CC', color: '#4caf50' },
  agent1: { id: 'a1', name: 'Support Bot', initials: 'SB', color: '#9c27b0' },
  agent2: { id: 'a2', name: 'Dev Agent', initials: 'DA', color: '#607d8b' },
};

const initialTasks: Task[] = [
  {
    id: '1',
    title: 'Implement Kanban',
    description: 'Add drag and drop support',
    status: 'in-progress',
    priority: 'high',
    assignees: [ASSIGNEES.charlie, ASSIGNEES.bob]
  },
  {
    id: '2',
    title: 'Fix API endpoints',
    description: 'Resolve CORS issues on /api/v1',
    status: 'todo',
    priority: 'medium',
    assignees: [ASSIGNEES.alice]
  },
  {
    id: '3',
    title: 'Design new logo',
    status: 'done',
    priority: 'low',
    assignees: [ASSIGNEES.bob]
  },
  {
    id: '4',
    title: 'Add dark mode',
    status: 'done',
    priority: 'medium',
    assignees: [ASSIGNEES.charlie]
  },
  {
    id: '5',
    title: 'Refactor Agent Service',
    description: 'Improve error handling and retry logic',
    status: 'todo',
    priority: 'high',
    assignees: [ASSIGNEES.agent2, ASSIGNEES.alice]
  },
  {
    id: '6',
    title: 'Write tests',
    status: 'todo',
    priority: 'medium',
    assignees: [ASSIGNEES.charlie]
  },
  {
    id: '7',
    title: 'Model Fine-tuning',
    description: 'Train Llama 3 on custom dataset',
    status: 'in-progress',
    priority: 'high',
    assignees: [ASSIGNEES.agent1]
  },
  {
    id: '8',
    title: 'Gateway Security Audit',
    status: 'todo',
    priority: 'high',
    assignees: [ASSIGNEES.alice, ASSIGNEES.bob]
  }
];

const getPriorityColor = (priority: string): "error" | "warning" | "info" | "primary" => {
    switch(priority) {
        case 'high': return 'error';
        case 'medium': return 'warning';
        case 'low': return 'info';
        default: return 'primary';
    }
};

// UI Component for Task
function TaskCardUI({ task, isOverlay, ...props }: { task: Task, isOverlay?: boolean, [key: string]: any }) {
    const theme = useTheme();
    const priorityColor = getPriorityColor(task.priority);
    return (
        <Card
            {...props}
            sx={{
                mb: 2,
                bgcolor: theme.palette.background.paper,
                cursor: isOverlay ? 'grabbing' : 'grab',
                opacity: isOverlay ? 0.9 : 1,
                transform: isOverlay ? 'scale(1.05)' : 'none',
                boxShadow: isOverlay ? 10 : 1,
                borderLeft: `4px solid ${theme.palette[priorityColor].main}`,
                '&:hover': { boxShadow: 4 },
                ...props.sx
            }}
        >
            <CardContent sx={{ p: '12px !important' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
                        {task.title}
                    </Typography>
                </Box>

                {task.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontSize: '0.85rem' }}>
                        {task.description}
                    </Typography>
                )}

                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
                    <Chip
                        label={task.priority}
                        size="small"
                        color={priorityColor}
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.7rem', textTransform: 'capitalize' }}
                    />

                    <AvatarGroup max={3} sx={{ '& .MuiAvatar-root': { width: 24, height: 24, fontSize: '0.75rem' } }}>
                        {task.assignees.map(user => (
                            <Avatar
                                key={user.id}
                                sx={{ bgcolor: user.color || theme.palette.primary.main }}
                                title={user.name}
                            >
                                {user.initials}
                            </Avatar>
                        ))}
                    </AvatarGroup>
                </Stack>
            </CardContent>
        </Card>
    );
}

// Sortable Item Component
function TaskCard({ task }: { task: Task }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id, data: { type: 'Task', task } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
        <TaskCardUI task={task} />
    </div>
  );
}

// Column Component
function KanbanColumn({ id, tasks }: { id: string, tasks: Task[] }) {
  const theme = useTheme();
  const { setNodeRef } = useSortable({ id: id, data: { type: 'Column' } });

  const getTitle = (id: string) => {
      switch(id) {
          case 'todo': return 'To Do';
          case 'in-progress': return 'In Progress';
          case 'done': return 'Done';
          default: return id;
      }
  };

  const getColor = (id: string) => {
      switch(id) {
          case 'todo': return theme.palette.text.secondary;
          case 'in-progress': return theme.palette.primary.main;
          case 'done': return theme.palette.success.main;
          default: return theme.palette.text.primary;
      }
  };

  return (
    <Box
      ref={setNodeRef}
      sx={{
        flex: 1,
        bgcolor: 'rgba(255,255,255,0.03)',
        borderRadius: 2,
        p: 2,
        minWidth: 280,
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, borderBottom: `2px solid ${getColor(id)}`, pb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', color: getColor(id), flexGrow: 1 }}>
            {getTitle(id)}
        </Typography>
        <Chip size="small" label={tasks.length} sx={{ height: 20, bgcolor: 'rgba(255,255,255,0.1)' }} />
      </Box>

      <Box sx={{ flexGrow: 1, overflowY: 'auto', minHeight: 100 }}>
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            {tasks.map(task => (
            <TaskCard key={task.id} task={task} />
            ))}
        </SortableContext>
      </Box>
    </Box>
  );
}

export default function KanbanPage() {
  const theme = useTheme();
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const columns = ['todo', 'in-progress', 'done'];

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragOver(event: DragOverEvent) {
      const { active, over } = event;
      if (!over) return;

      const activeId = active.id;
      const overId = over.id;

      const activeTask = tasks.find(t => t.id === activeId);
      const overTask = tasks.find(t => t.id === overId);

      if (!activeTask) return;

      if (columns.includes(overId as string)) {
          if (activeTask.status !== overId) {
             setTasks(prev => {
                 const newTasks = [...prev];
                 const index = newTasks.findIndex(t => t.id === activeId);
                 if (index !== -1) {
                     newTasks[index] = { ...newTasks[index], status: overId as any };
                 }
                 return newTasks;
             });
          }
      }
      else if (overTask && activeTask.status !== overTask.status) {
           setTasks(prev => {
             const newTasks = [...prev];
             const index = newTasks.findIndex(t => t.id === activeId);
             if (index !== -1) {
                 newTasks[index] = { ...newTasks[index], status: overTask.status };
             }
             return newTasks;
         });
      }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId !== overId) {
        const oldIndex = tasks.findIndex(t => t.id === activeId);
        const newIndex = tasks.findIndex(t => t.id === overId);

        if (oldIndex !== -1 && newIndex !== -1 && tasks[oldIndex].status === tasks[newIndex].status) {
            setTasks((items) => arrayMove(items, oldIndex, newIndex));
        }
    }
  }

  return (
    <Box sx={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h4" sx={{ mb: 4, fontWeight: 'bold' }}>
        Task <span style={{ color: theme.palette.primary.main }}>Board</span>
      </Typography>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <Box sx={{ display: 'flex', gap: 3, overflowX: 'auto', pb: 2, flexGrow: 1, alignItems: 'stretch' }}>
          {columns.map(colId => (
            <KanbanColumn
              key={colId}
              id={colId}
              tasks={tasks.filter(t => t.status === colId)}
            />
          ))}
        </Box>
        <DragOverlay>
            {activeId ? <TaskCardUI task={tasks.find(t => t.id === activeId)!} isOverlay /> : null}
        </DragOverlay>
      </DndContext>
    </Box>
  );
}
