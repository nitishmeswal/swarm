// Core Types for Task Pipeline System
export interface HardwareInfo {
  cpuCores: number;
  deviceMemory: number | string;
  gpuInfo: string;
  deviceGroup: 'desktop_laptop' | 'mobile_tablet';
  deviceType?: 'desktop' | 'laptop' | 'tablet' | 'mobile';
  rewardTier: 'webgpu' | 'wasm' | 'webgl' | 'cpu';
}

export interface NodeState {
  nodeId: string | null;
  isActive: boolean;
  isRegistered: boolean;
  hardwareInfo: HardwareInfo | null;
  startTime: string | null; // ISO string
  lastActiveTime: string | null; // For calculating uptime when resuming
  totalUptime: number; // Total accumulated uptime in seconds
  currentSessionStart: string | null; // Current session start time
}

export interface ProxyTask {
  id: string;
  type: 'image' | 'text' | 'three_d' | 'video';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
  completed_at?: string;
  processing_start?: string;
  compute_time: number; // in seconds
  reward_amount?: number;
  node_id: string;
  prompt: string;
  model: string;
}

export interface TaskPipelineState {
  tasks: ProxyTask[];
  stats: {
    completed: number;
    processing: number;
    pending: number;
    failed: number;
  };
  isGenerating: boolean;
  lastTaskGeneration: string | null;
  autoMode: boolean;
  completedTasksForStats: {
    three_d: number;
    video: number;
    text: number;
    image: number;
  };
}

export interface EarningsState {
  totalEarned: number;
  sessionEarnings: number;
  rewardHistory: RewardTransaction[];
  pendingRewards: number;
}

export interface RewardTransaction {
  id: string;
  amount: number;
  type: 'task_completion';
  task_id: string;
  task_type: 'image' | 'text' | 'three_d' | 'video';
  hardware_tier: 'webgpu' | 'wasm' | 'webgl' | 'cpu';
  multiplier: number;
  timestamp: string;
}

export interface RootState {
  node: NodeState;
  tasks: TaskPipelineState;
  earnings: EarningsState;
}
