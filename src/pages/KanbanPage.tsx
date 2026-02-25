import React, { useState } from 'react';
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
import { Box, Card, CardContent, Typography, useTheme, Chip } from '@mui/material';

// Types
interface Task {
  id: string;
  title: string;
  status: 'todo' | 'in-progress' | 'done';
}

const initialTasks: Task[] = [
  { id: '1', title: 'Implement Kanban', status: 'in-progress' },
  { id: '2', title: 'Fix API endpoints', status: 'todo' },
  { id: '3', title: 'Design new logo', status: 'done' },
  { id: '4', title: 'Add dark mode', status: 'done' },
  { id: '5', title: 'Refactor Agent Service', status: 'todo' },
  { id: '6', title: 'Write tests', status: 'todo' },
];

// UI Component for Task
function TaskCardUI({ task, isOverlay, ...props }: { task: Task, isOverlay?: boolean, [key: string]: any }) {
    const theme = useTheme();
    return (
        <Card
            {...props}
            sx={{
                mb: 2,
                bgcolor: theme.palette.background.paper,
                cursor: isOverlay ? 'grabbing' : 'grab',
                opacity: isOverlay ? 0.8 : 1,
                transform: isOverlay ? 'scale(1.05)' : 'none',
                boxShadow: isOverlay ? 10 : 1,
                '&:hover': { boxShadow: 3 },
                ...props.sx
            }}
        >
            <CardContent sx={{ p: '16px !important' }}>
                <Typography variant="body1">{task.title}</Typography>
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
    opacity: isDragging ? 0.5 : 1,
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
        minWidth: 280
      }}
    >
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: getColor(id), borderBottom: `2px solid ${getColor(id)}`, pb: 1 }}>
        {getTitle(id)} <Chip size="small" label={tasks.length} sx={{ ml: 1, height: 20 }} />
      </Typography>
      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        {tasks.map(task => (
          <TaskCard key={task.id} task={task} />
        ))}
      </SortableContext>
    </Box>
  );
}

export default function KanbanPage() {
  const theme = useTheme();
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), // Prevent accidental drag on click
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

      // Find containers
      const activeTask = tasks.find(t => t.id === activeId);
      const overTask = tasks.find(t => t.id === overId);

      if (!activeTask) return;

      // Dropping over a column?
      if (columns.includes(overId as string)) {
          // If task is not already in that column, move it
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
      // Dropping over another task?
      else if (overTask && activeTask.status !== overTask.status) {
           setTasks(prev => {
             const newTasks = [...prev];
             const index = newTasks.findIndex(t => t.id === activeId);
             if (index !== -1) {
                 newTasks[index] = { ...newTasks[index], status: overTask.status };
             }
             // Reorder within column logic can go here (using arrayMove)
             // But for now, just changing status is enough for basic functionality
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
        // Handle reordering within same column
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
        <Box sx={{ display: 'flex', gap: 3, overflowX: 'auto', pb: 2, flexGrow: 1, alignItems: 'flex-start' }}>
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
