import { createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit';
import { ProxyTask, TaskPipelineState, RootState } from '../types';
import { TASK_CONFIG, TASK_MODELS, SAMPLE_PROMPTS, STORAGE_KEYS, generateTaskId, logger } from '../config';

// Initial state
const initialState: TaskPipelineState = {
  tasks: [],
  stats: {
    completed: 0,
    processing: 0,
    pending: 0,
    failed: 0,
  },
  isGenerating: false,
  lastTaskGeneration: null,
  autoMode: true,
  // Add completed tasks tracking for global stats
  completedTasksForStats: {
    three_d: 0,
    video: 0,
    text: 0,
    image: 0,
  },
};

// Load state from localStorage
const loadTaskState = (): TaskPipelineState => {
  if (typeof window === 'undefined') return initialState;
  
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.TASK_STATE);
    if (saved) {
      const parsed = JSON.parse(saved);
      
      // Recalculate stats from tasks
      const stats = {
        completed: 0,
        processing: 0,
        pending: 0,
        failed: 0,
      };
      
      parsed.tasks.forEach((task: ProxyTask) => {
        stats[task.status]++;
      });
      
      return {
        ...parsed,
        stats,
        // Ensure completedTasksForStats exists
        completedTasksForStats: parsed.completedTasksForStats || {
          three_d: 0,
          video: 0,
          text: 0,
          image: 0,
        }
      };
    }
  } catch (error) {
    logger.error('Failed to load task state', error);
  }
  
  return initialState;
};

// Save state to localStorage
const saveTaskState = (state: TaskPipelineState) => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEYS.TASK_STATE, JSON.stringify(state));
  } catch (error) {
    logger.error('Failed to save task state', error);
  }
};

const taskSlice = createSlice({
  name: 'tasks',
  initialState: loadTaskState(),
  reducers: {
    generateTasks: (state, action: PayloadAction<{ nodeId: string; hardwareTier: string }>) => {
      const { nodeId, hardwareTier } = action.payload;
      
      // Don't generate if already at max pending
      if (state.stats.pending >= TASK_CONFIG.GENERATION.PENDING_QUEUE_SIZE) {
        return;
      }
      
      state.isGenerating = true;
      
      // Generate 2-5 tasks
      const taskCount = Math.floor(Math.random() * (TASK_CONFIG.GENERATION.MAX_TASKS - TASK_CONFIG.GENERATION.MIN_TASKS + 1)) + TASK_CONFIG.GENERATION.MIN_TASKS;
      const tasksToGenerate = Math.min(taskCount, TASK_CONFIG.GENERATION.PENDING_QUEUE_SIZE - state.stats.pending);
      
      const taskTypes: ('image' | 'text' | 'three_d' | 'video')[] = ['image', 'text', 'three_d', 'video'];
      
      for (let i = 0; i < tasksToGenerate; i++) {
        // Select random task type with weighted distribution
        const randomValue = Math.random();
        let selectedType: typeof taskTypes[number];
        
        if (randomValue < TASK_CONFIG.DISTRIBUTION.image) {
          selectedType = 'image';
        } else if (randomValue < TASK_CONFIG.DISTRIBUTION.image + TASK_CONFIG.DISTRIBUTION.text) {
          selectedType = 'text';
        } else if (randomValue < TASK_CONFIG.DISTRIBUTION.image + TASK_CONFIG.DISTRIBUTION.text + TASK_CONFIG.DISTRIBUTION.three_d) {
          selectedType = 'three_d';
        } else {
          selectedType = 'video';
        }
        
        // Get random prompt
        const prompts = SAMPLE_PROMPTS[selectedType];
        const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
        
        const task: ProxyTask = {
          id: generateTaskId(),
          type: selectedType,
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          compute_time: 0,
          node_id: nodeId,
          model: TASK_MODELS[selectedType],
          prompt: randomPrompt
        };
        
        state.tasks.push(task);
        state.stats.pending++;
      }
      
      state.lastTaskGeneration = new Date().toISOString();
      state.isGenerating = false;
      
      logger.log(`Generated ${tasksToGenerate} tasks for ${hardwareTier} tier`);
      saveTaskState(state);
    },
    
    startProcessingTasks: (state, action: PayloadAction<string>) => {
      const hardwareTier = action.payload;
      
      // Start processing pending tasks (max concurrent limit)
      const pendingTasks = state.tasks.filter(task => task.status === 'pending');
      const processingTasks = state.tasks.filter(task => task.status === 'processing');
      
      const canProcess = Math.min(
        TASK_CONFIG.GENERATION.MAX_CONCURRENT_PROCESSING - processingTasks.length,
        pendingTasks.length
      );
      
      for (let i = 0; i < canProcess; i++) {
        const task = pendingTasks[i];
        task.status = 'processing';
        task.processing_start = new Date().toISOString();
        task.updated_at = new Date().toISOString();
        
        state.stats.pending--;
        state.stats.processing++;
      }
      
      if (canProcess > 0) {
        logger.log(`Started processing ${canProcess} tasks`);
        saveTaskState(state);
      }
    },
    
    updateProcessingTasks: (state, action: PayloadAction<string>) => {
      const hardwareTier = action.payload as 'webgpu' | 'wasm' | 'webgl' | 'cpu';
      const now = Date.now();
      
      const processingTasks = state.tasks.filter(task => task.status === 'processing');
      
      processingTasks.forEach(task => {
        if (!task.processing_start) return;
        
        const processingStart = new Date(task.processing_start).getTime();
        const elapsed = now - processingStart;
        const completionTime = TASK_CONFIG.COMPLETION_TIMES[hardwareTier][task.type] * 1000;
        
        // Complete task if enough time has passed
        if (elapsed >= completionTime) {
          const baseReward = TASK_CONFIG.BASE_REWARDS[task.type];
          const multiplier = TASK_CONFIG.HARDWARE_MULTIPLIERS[hardwareTier];
          const rewardAmount = baseReward * multiplier;
          
          task.status = 'completed';
          task.completed_at = new Date().toISOString();
          task.compute_time = Math.floor(completionTime / 1000);
          task.reward_amount = rewardAmount;
          
          state.stats.processing--;
          state.stats.completed++;
          
          // Increment completed tasks for global stats
          state.completedTasksForStats[task.type as keyof typeof state.completedTasksForStats]++;
        }
      });
      
      saveTaskState(state);
    },
    
    clearCompletedTasks: (state) => {
      // Keep only recent completed tasks (last 10)
      const completedTasks = state.tasks.filter(task => task.status === 'completed');
      if (completedTasks.length > 10) {
        const tasksToRemove = completedTasks.slice(0, completedTasks.length - 10);
        tasksToRemove.forEach(taskToRemove => {
          const index = state.tasks.findIndex(t => t.id === taskToRemove.id);
          if (index !== -1) {
            state.tasks.splice(index, 1);
            state.stats.completed--;
          }
        });
        
        logger.log(`Cleared ${tasksToRemove.length} old completed tasks`);
        saveTaskState(state);
      }
    },
    
    // Add action to reset completed tasks for stats (after successful backend update)
    resetCompletedTasksForStats: (state) => {
      state.completedTasksForStats = {
        three_d: 0,
        video: 0,
        text: 0,
        image: 0,
      };
      saveTaskState(state);
    },
    
    resetTasks: (state) => {
      Object.assign(state, initialState);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEYS.TASK_STATE);
      }
      logger.log('Tasks reset');
    },
    
    setAutoMode: (state, action: PayloadAction<boolean>) => {
      state.autoMode = action.payload;
      saveTaskState(state);
    }
  }
});

export const { 
  generateTasks, 
  startProcessingTasks, 
  updateProcessingTasks, 
  clearCompletedTasks, 
  resetTasks, 
  setAutoMode,
  resetCompletedTasksForStats
} = taskSlice.actions;

// Selectors
export const selectTasks = (state: { tasks: TaskPipelineState }) => state.tasks;
export const selectTasksArray = (state: { tasks: TaskPipelineState }) => state.tasks.tasks;
export const selectTasksStats = (state: { tasks: TaskPipelineState }) => state.tasks.stats;
export const selectTasksAutoMode = (state: { tasks: TaskPipelineState }) => state.tasks.autoMode;
export const selectTasksIsGenerating = (state: { tasks: TaskPipelineState }) => state.tasks.isGenerating;

// Memoized selectors to prevent unnecessary re-renders
export const selectRecentTasks = createSelector(
  [selectTasksArray, (state: { tasks: TaskPipelineState }, count: number) => count],
  (tasks, count = 5) => tasks.slice(-count).reverse()
);

export const selectProcessingTasks = createSelector(
  [selectTasksArray],
  (tasks) => tasks.filter(task => task.status === 'processing')
);

export const selectPendingTasks = createSelector(
  [selectTasksArray],
  (tasks) => tasks.filter(task => task.status === 'pending')
);

export const selectTaskProgress = (task: ProxyTask, hardwareTier: 'webgpu' | 'wasm' | 'webgl' | 'cpu'): number => {
  if (task.status !== 'processing' || !task.processing_start) return 0;
  
  const now = Date.now();
  const processingStart = new Date(task.processing_start).getTime();
  const elapsed = now - processingStart;
  const completionTime = TASK_CONFIG.COMPLETION_TIMES[hardwareTier][task.type] * 1000;
  
  return Math.min((elapsed / completionTime) * 100, 100);
};

// Add selector for completed tasks for stats
export const selectCompletedTasksForStats = (state: { tasks: TaskPipelineState }) => {
  return state.tasks.completedTasksForStats;
};

export default taskSlice.reducer;
