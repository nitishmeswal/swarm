import { AppDispatch, store } from './index';
import { generateTasks, startProcessingTasks, updateProcessingTasks, resetTasks } from './slices/taskSlice';
import { updateUptime } from './slices/nodeSlice';
import { addReward } from './slices/earningsSlice';
import { TASK_CONFIG, generateTaskId, logger } from './config';
import { ProxyTask, RewardTransaction } from './types';
import { SubscriptionPlan } from '@/lib/api/auth';  // ✅ CRITICAL: Import type for consistency

class TaskProcessingEngine {
  private intervalId: NodeJS.Timeout | null = null;
  private dispatch: AppDispatch;
  private isRunning = false;
  private currentPlan: SubscriptionPlan = 'free';  // ✅ CRITICAL: Use imported type
  private taskTimers: Map<string, NodeJS.Timeout> = new Map(); // ✅ Individual timers for each task

  constructor(dispatch: AppDispatch) {
    this.dispatch = dispatch;
  }

  // ✅ Set user's subscription plan for rate limiting
  setPlan(plan: string) {
    const planLower = plan.toLowerCase();
    if (planLower in TASK_CONFIG.GENERATION) {
      this.currentPlan = planLower as SubscriptionPlan;  // ✅ CRITICAL: Use imported type
      
      // Restart engine with new interval if running
      if (this.isRunning) {
        this.stop();
        this.start();
      }
    }
  }

  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    const config = TASK_CONFIG.GENERATION[this.currentPlan];
    
    // Main processing loop - interval based on subscription plan
    this.intervalId = setInterval(() => {
      this.processTaskCycle();
    }, config.PROCESSING_INTERVAL);
  }

  stop() {
    if (!this.isRunning) return; // Prevent multiple stops
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    // ✅ Clear all individual task timers
    this.taskTimers.forEach((timer) => clearTimeout(timer));
    this.taskTimers.clear();
    
    this.isRunning = false;
    
    // Clear all proxy tasks when engine stops (but only once)
    this.dispatch(resetTasks());
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
    const config = TASK_CONFIG.GENERATION[this.currentPlan];

    // 1. Generate new tasks if needed (auto mode and low pending count)
    // ✅ PLAN-BASED: Use plan-specific pending queue size
    const totalActiveTasks = tasks.stats.pending + tasks.stats.processing;
    if (tasks.autoMode && totalActiveTasks < config.PENDING_QUEUE_SIZE && !tasks.isGenerating) {
      this.dispatch(generateTasks({ 
        nodeId: node.nodeId, 
        hardwareTier,
        plan: this.currentPlan // ✅ CRITICAL FIX: Pass plan to generateTasks
      }));
    }

    // 2. Start processing pending tasks
    // ✅ PLAN-BASED: Use plan-specific concurrent limit
    if (tasks.stats.pending > 0 && tasks.stats.processing < config.MAX_CONCURRENT_PROCESSING) {
      this.dispatch(startProcessingTasks({ 
        hardwareTier,
        plan: this.currentPlan // ✅ CRITICAL FIX: Pass plan to startProcessingTasks
      }));
    }
    
    // ✅ CRITICAL FIX: Always ensure timers exist for ALL processing tasks (every cycle)
    // This catches any tasks that don't have timers due to timing issues
    this.scheduleTaskCompletions(hardwareTier);

    // 3. Update processing tasks and complete them
    this.updateAndCompleteProcessingTasks(hardwareTier);

    // 4. DO NOT auto-cleanup completed tasks - they are unclaimed rewards!
    // Completed tasks should only be cleared when user manually claims rewards
    // or when the node is stopped.
  }

  // ✅ NEW: Schedule individual timers for task completions
  private scheduleTaskCompletions(hardwareTier: 'webgpu' | 'wasm' | 'webgl' | 'cpu') {
    const state = store.getState();
    const { tasks } = state;
    const now = Date.now();

    const processingTasks = tasks.tasks.filter(task => task.status === 'processing');
    
    processingTasks.forEach(task => {
      // Skip if timer already exists for this task
      if (this.taskTimers.has(task.id)) return;
      if (!task.processing_start) return;

      const processingStart = new Date(task.processing_start).getTime();
      const completionTime = TASK_CONFIG.COMPLETION_TIMES[hardwareTier][task.type] * 1000;
      const elapsed = now - processingStart;
      const timeUntilCompletion = Math.max(0, completionTime - elapsed);

      // ✅ SAFEGUARD: If task is already overdue, complete it immediately
      if (elapsed >= completionTime) {
        this.completeTask(task, hardwareTier)
          .catch(() => {
            const { markTaskAsFailed } = require('./slices/taskSlice');
            this.dispatch(markTaskAsFailed(task.id));
          });
        return;
      }

      // ✅ Schedule exact completion time
      const timer = setTimeout(async () => {
        try {
          await this.completeTask(task, hardwareTier);
        } catch (error) {
          const { markTaskAsFailed } = await import('./slices/taskSlice');
          this.dispatch(markTaskAsFailed(task.id));
        } finally {
          this.taskTimers.delete(task.id);
        }
      }, timeUntilCompletion);

      this.taskTimers.set(task.id, timer);
    });
  }

  private updateAndCompleteProcessingTasks(hardwareTier: 'webgpu' | 'wasm' | 'webgl' | 'cpu') {
    const state = store.getState();
    const { tasks } = state;

    // Just update UI progress - actual completion handled by timers
    this.dispatch(updateProcessingTasks(hardwareTier));
  }

  private async completeTask(task: ProxyTask, hardwareTier: 'webgpu' | 'wasm' | 'webgl' | 'cpu') {
    const baseReward = TASK_CONFIG.BASE_REWARDS[task.type];
    const multiplier = TASK_CONFIG.HARDWARE_MULTIPLIERS[hardwareTier];
    // Backend expects INTEGER, not float - use Math.round() only
    const rewardAmount = Math.round(baseReward * multiplier);

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

    try {
      // Call Express backend using taskService
      const { taskService } = await import('@/lib/api');
      await taskService.completeTask({
        task_id: task.id,
        task_type: task.type as 'text' | 'image' | 'video' | '3d',
        reward_amount: rewardAmount,
      });
      
      // ✅ FIXED: Only update Redux on API SUCCESS
      this.dispatch(addReward(reward));
    } catch (error) {
      // ✅ FIXED: Don't give rewards if backend fails
      throw error; // Re-throw so calling code knows it failed
    }
  }

  // Manual task generation trigger
  generateTasksManually() {
    const state = store.getState();
    const { node } = state;

    if (!node.isActive || !node.nodeId || !node.hardwareInfo) {
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
