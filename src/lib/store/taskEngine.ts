import { AppDispatch, store } from './index';
import { generateTasks, startProcessingTasks, updateProcessingTasks, clearCompletedTasks, resetTasks } from './slices/taskSlice';
import { updateUptime } from './slices/nodeSlice';
import { addReward } from './slices/earningsSlice';
import { TASK_CONFIG, generateTaskId, logger } from './config';
import { ProxyTask, RewardTransaction } from './types';

class TaskProcessingEngine {
  private intervalId: NodeJS.Timeout | null = null;
  private dispatch: AppDispatch;
  private isRunning = false;

  constructor(dispatch: AppDispatch) {
    this.dispatch = dispatch;
  }

  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    logger.log('Task processing engine started');
    
    // Main processing loop
    this.intervalId = setInterval(() => {
      this.processTaskCycle();
    }, TASK_CONFIG.GENERATION.PROCESSING_INTERVAL);
  }

  stop() {
    if (!this.isRunning) return; // Prevent multiple stops
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    
    // Clear all proxy tasks when engine stops (but only once)
    this.dispatch(resetTasks());
    logger.log('Task processing engine stopped and all tasks cleared');
  }

  private processTaskCycle() {
    const state = store.getState();
    const { node, tasks } = state;

    // Only process if node is active
    if (!node.isActive || !node.nodeId || !node.hardwareInfo) {
      return;
    }

    // Update node uptime
    this.dispatch(updateUptime());

    const hardwareTier = node.hardwareInfo.rewardTier;

    // 1. Generate new tasks if needed (auto mode and low pending count)
    if (tasks.autoMode && tasks.stats.pending < 2 && !tasks.isGenerating) {
      this.dispatch(generateTasks({ 
        nodeId: node.nodeId, 
        hardwareTier 
      }));
    }

    // 2. Start processing pending tasks
    if (tasks.stats.pending > 0 && tasks.stats.processing < TASK_CONFIG.GENERATION.MAX_CONCURRENT_PROCESSING) {
      this.dispatch(startProcessingTasks(hardwareTier));
    }

    // 3. Update processing tasks and complete them
    this.updateAndCompleteProcessingTasks(hardwareTier);

    // 4. Clean up old completed tasks periodically
    if (tasks.stats.completed > 20) {
      this.dispatch(clearCompletedTasks());
    }
  }

  private updateAndCompleteProcessingTasks(hardwareTier: 'webgpu' | 'wasm' | 'webgl' | 'cpu') {
    const state = store.getState();
    const { tasks } = state;
    const now = Date.now();

    const processingTasks = tasks.tasks.filter(task => task.status === 'processing');

    processingTasks.forEach(task => {
      if (!task.processing_start) return;

      const processingStart = new Date(task.processing_start).getTime();
      const elapsed = now - processingStart;
      const completionTime = TASK_CONFIG.COMPLETION_TIMES[hardwareTier][task.type] * 1000;

      // Complete task if enough time has passed
      if (elapsed >= completionTime) {
        this.completeTask(task, hardwareTier);
      }
    });

    // Update processing tasks in store
    this.dispatch(updateProcessingTasks(hardwareTier));
  }

  private completeTask(task: ProxyTask, hardwareTier: 'webgpu' | 'wasm' | 'webgl' | 'cpu') {
    const baseReward = TASK_CONFIG.BASE_REWARDS[task.type];
    const multiplier = TASK_CONFIG.HARDWARE_MULTIPLIERS[hardwareTier];
    const rewardAmount = Math.round(baseReward * multiplier * 100) / 100; // Round to 2 decimal places

    // Create reward transaction
    const reward: RewardTransaction = {
      id: generateTaskId(),
      amount: rewardAmount,
      type: 'task_completion',
      task_id: task.id,
      task_type: task.type,
      hardware_tier: hardwareTier,
      multiplier,
      timestamp: new Date().toISOString()
    };

    // Add reward to earnings
    this.dispatch(addReward(reward));

    logger.log(`Task completed: ${task.type} - Reward: ${rewardAmount} NLOV (${multiplier}x multiplier)`);
  }

  // Manual task generation trigger
  generateTasksManually() {
    const state = store.getState();
    const { node } = state;

    if (!node.isActive || !node.nodeId || !node.hardwareInfo) {
      logger.error('Cannot generate tasks: Node not active');
      return;
    }

    this.dispatch(generateTasks({ 
      nodeId: node.nodeId, 
      hardwareTier: node.hardwareInfo.rewardTier 
    }));
  }
}

// Singleton instance
let taskEngine: TaskProcessingEngine | null = null;

export const initializeTaskEngine = (dispatch: AppDispatch) => {
  if (!taskEngine) {
    taskEngine = new TaskProcessingEngine(dispatch);
  }
  return taskEngine;
};

export const getTaskEngine = () => {
  return taskEngine;
};

export const startTaskEngine = (dispatch: AppDispatch) => {
  const engine = initializeTaskEngine(dispatch);
  engine.start();
  return engine;
};

export const stopTaskEngine = () => {
  if (taskEngine) {
    taskEngine.stop();
    taskEngine = null; // Clear reference after stopping
  }
};
