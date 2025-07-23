import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { NodeState, HardwareInfo } from '../types';
import { STORAGE_KEYS, logger } from '../config';

// Initial state
const initialState: NodeState = {
  nodeId: null,
  isActive: false,
  isRegistered: false,
  hardwareInfo: null,
  startTime: null,
  lastActiveTime: null,
  totalUptime: 0,
  currentSessionStart: null,
};

// Load state from localStorage
const loadNodeState = (): NodeState => {
  if (typeof window === 'undefined') return initialState;
  
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.NODE_STATE);
    if (saved) {
      const parsed = JSON.parse(saved);
      
      // If node was active, calculate accumulated uptime and resume
      if (parsed.isActive && parsed.currentSessionStart) {
        const now = Date.now();
        const sessionStart = new Date(parsed.currentSessionStart).getTime();
        const sessionUptime = Math.floor((now - sessionStart) / 1000);
        
        return {
          ...parsed,
          totalUptime: parsed.totalUptime + sessionUptime,
          currentSessionStart: new Date().toISOString(), // Reset session start
          lastActiveTime: new Date().toISOString()
        };
      }
      
      return parsed;
    }
  } catch (error) {
    logger.error('Failed to load node state', error);
  }
  
  return initialState;
};

// Save state to localStorage
const saveNodeState = (state: NodeState) => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEYS.NODE_STATE, JSON.stringify(state));
  } catch (error) {
    logger.error('Failed to save node state', error);
  }
};

const nodeSlice = createSlice({
  name: 'node',
  initialState: loadNodeState(),
  reducers: {
    registerDevice: (state, action: PayloadAction<HardwareInfo>) => {
      state.hardwareInfo = action.payload;
      state.isRegistered = true;
      state.nodeId = `node_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      logger.log(`Device registered with tier: ${action.payload.rewardTier}`);
      saveNodeState(state);
    },
    
    startNode: (state) => {
      if (!state.isRegistered || !state.hardwareInfo) {
        logger.error('Cannot start node: Device not registered');
        return;
      }
      
      const now = new Date().toISOString();
      state.isActive = true;
      state.startTime = state.startTime || now; // Keep original start time if exists
      state.currentSessionStart = now;
      state.lastActiveTime = now;
      
      logger.log(`Node started: ${state.nodeId}`);
      saveNodeState(state);
    },
    
    stopNode: (state) => {
      if (!state.isActive) return;
      
      // Calculate and add current session uptime to total
      if (state.currentSessionStart) {
        const now = Date.now();
        const sessionStart = new Date(state.currentSessionStart).getTime();
        const sessionUptime = Math.floor((now - sessionStart) / 1000);
        state.totalUptime += sessionUptime;
      }
      
      state.isActive = false;
      state.currentSessionStart = null;
      state.lastActiveTime = new Date().toISOString();
      
      logger.log(`Node stopped. Total uptime: ${state.totalUptime}s`);
      saveNodeState(state);
    },
    
    updateUptime: (state) => {
      if (!state.isActive || !state.currentSessionStart) return;
      
      const now = Date.now();
      const sessionStart = new Date(state.currentSessionStart).getTime();
      const sessionUptime = Math.floor((now - sessionStart) / 1000);
      
      // Update last active time
      state.lastActiveTime = new Date().toISOString();
      
      // Don't modify totalUptime here, it's calculated on stop
      saveNodeState(state);
    },
    
    resetNode: (state) => {
      Object.assign(state, initialState);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEYS.NODE_STATE);
      }
      logger.log('Node reset');
    }
  }
});

export const { registerDevice, startNode, stopNode, updateUptime, resetNode } = nodeSlice.actions;

// Selectors
export const selectCurrentUptime = (state: { node: NodeState }): number => {
  const { node } = state;
  if (!node.isActive || !node.currentSessionStart) {
    return node.totalUptime;
  }
  
  const now = Date.now();
  const sessionStart = new Date(node.currentSessionStart).getTime();
  const sessionUptime = Math.floor((now - sessionStart) / 1000);
  
  return node.totalUptime + sessionUptime;
};

export const selectNode = (state: { node: NodeState }) => state.node;
export const selectNodeIsActive = (state: { node: NodeState }) => state.node.isActive;
export const selectNodeIsRegistered = (state: { node: NodeState }) => state.node.isRegistered;
export const selectNodeHardwareInfo = (state: { node: NodeState }) => state.node.hardwareInfo;

export default nodeSlice.reducer;
