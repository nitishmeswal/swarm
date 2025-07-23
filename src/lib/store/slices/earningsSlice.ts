import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { EarningsState, RewardTransaction } from '../types';
import { STORAGE_KEYS, logger } from '../config';
import { v4 as uuidv4 } from 'uuid';

// Obfuscated storage keys for better security
const OBFUSCATED_KEYS = {
  TOTAL_EARNED: '_sys_metrics_t4513_user_analytics',
  SESSION_EARNINGS: '_pending_workspace_metrics_t4513',
  VERIFICATION_KEY: '_integrity_2592_validator'
};

// Generate a unique identifier for this browser session
const getSessionIdentifier = () => {
  if (typeof window === 'undefined') return '';
  
  let sessionId = localStorage.getItem(OBFUSCATED_KEYS.VERIFICATION_KEY);
  if (!sessionId) {
    sessionId = uuidv4().replace(/-/g, '');
    localStorage.setItem(OBFUSCATED_KEYS.VERIFICATION_KEY, sessionId);
  }
  return sessionId;
};

// Simple obfuscation function - not meant for true security but to deter simple tampering
const obfuscateValue = (value: number): string => {
  const sessionId = getSessionIdentifier();
  const randomSalt = Math.floor(Math.random() * 10000);
  const timestamp = Date.now();
  
  // Convert to string and store as JSON with verification data
  return JSON.stringify({
    v: value.toString(),
    s: sessionId,
    t: timestamp,
    r: randomSalt,
    // Simple checksum - again, not truly secure but deters basic tampering
    c: ((value * 137) ^ timestamp % 10000).toString(36)
  });
};

// De-obfuscate stored value
const deobfuscateValue = (storedValue: string): number => {
  try {
    const data = JSON.parse(storedValue);
    const sessionId = getSessionIdentifier();
    
    // Verify session ID
    if (data.s !== sessionId) {
      logger.error('Session verification failed');
      return 0;
    }
    
    // Parse value
    const value = parseFloat(data.v);
    
    // Verify checksum
    const expectedChecksum = ((value * 137) ^ data.t % 10000).toString(36);
    if (data.c !== expectedChecksum) {
      logger.error('Value integrity check failed');
      return 0;
    }
    
    return value;
  } catch (e) {
    logger.error('Failed to parse stored value', e);
    return 0;
  }
};

// Initial state
const initialState: EarningsState = {
  totalEarned: 0,
  sessionEarnings: 0,
  rewardHistory: [],
  pendingRewards: 0,
};

// Load state from localStorage with security measures
const loadEarningsState = (): EarningsState => {
  if (typeof window === 'undefined') return initialState;
  
  try {
    const savedTotal = localStorage.getItem(OBFUSCATED_KEYS.TOTAL_EARNED);
    const savedSessionEarnings = localStorage.getItem(OBFUSCATED_KEYS.SESSION_EARNINGS);
    
    // Legacy support for old storage key
    const legacyData = localStorage.getItem(STORAGE_KEYS.EARNINGS_STATE);
    
    // Initialize with zeros
    const state = {...initialState};
    
    // Load total earned
    if (savedTotal) {
      state.totalEarned = deobfuscateValue(savedTotal);
    } else if (legacyData) {
      // Migrate from legacy format if needed
      try {
        const legacyParsed = JSON.parse(legacyData);
        state.totalEarned = legacyParsed.totalEarned || 0;
        // Save in new format
        saveEarningsValue(OBFUSCATED_KEYS.TOTAL_EARNED, state.totalEarned);
      } catch (e) {
        logger.error('Failed to migrate from legacy format', e);
      }
    }
    
    // Load session earnings - these now persist across reloads
    if (savedSessionEarnings) {
      state.sessionEarnings = deobfuscateValue(savedSessionEarnings);
      // Also set as pending rewards
      state.pendingRewards = state.sessionEarnings;
    }
    
    return state;
  } catch (error) {
    logger.error('Failed to load earnings state', error);
    return initialState;
  }
};

// Save individual value to localStorage with obfuscation
const saveEarningsValue = (key: string, value: number) => {
  if (typeof window === 'undefined') return;
  
  try {
    const obfuscatedValue = obfuscateValue(value);
    localStorage.setItem(key, obfuscatedValue);
  } catch (error) {
    logger.error(`Failed to save ${key}`, error);
  }
};

// Save state to localStorage
const saveEarningsState = (state: EarningsState) => {
  if (typeof window === 'undefined') return;
  
  try {
    // Save in obfuscated format
    saveEarningsValue(OBFUSCATED_KEYS.TOTAL_EARNED, state.totalEarned);
    saveEarningsValue(OBFUSCATED_KEYS.SESSION_EARNINGS, state.sessionEarnings);
    
    // Keep legacy storage for backward compatibility
    localStorage.setItem(STORAGE_KEYS.EARNINGS_STATE, JSON.stringify({
      totalEarned: state.totalEarned,
      rewardHistory: state.rewardHistory,
      pendingRewards: state.pendingRewards
      // Note: We exclude sessionEarnings from legacy storage
    }));
  } catch (error) {
    logger.error('Failed to save earnings state', error);
  }
};

const earningsSlice = createSlice({
  name: 'earnings',
  initialState: loadEarningsState(),
  reducers: {
    addReward: (state, action: PayloadAction<RewardTransaction>) => {
      const reward = action.payload;
      
      state.rewardHistory.push(reward);
      state.totalEarned += reward.amount;
      state.sessionEarnings += reward.amount;
      state.pendingRewards += reward.amount;
      
      logger.log(`Reward added: ${reward.amount} NLOV for ${reward.task_type} task`);
      saveEarningsState(state);
    },
    
    claimRewards: (state) => {
      if (state.pendingRewards > 0) {
        logger.log(`Claimed ${state.pendingRewards} NLOV rewards`);
        state.pendingRewards = 0;
        saveEarningsState(state);
      }
    },
    
    resetSessionEarnings: (state) => {
      state.sessionEarnings = 0;
      saveEarningsState(state);
    },
    
    updateTotalEarnings: (state, action: PayloadAction<number>) => {
      state.totalEarned = action.payload;
      logger.log(`Updated total earnings to ${action.payload} NLOV`);
      saveEarningsState(state);
    },
    
    resetEarnings: (state) => {
      Object.assign(state, initialState);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEYS.EARNINGS_STATE);
        localStorage.removeItem(OBFUSCATED_KEYS.TOTAL_EARNED);
        localStorage.removeItem(OBFUSCATED_KEYS.SESSION_EARNINGS);
        // Don't remove verification key - it's tied to the browser session
      }
      logger.log('Earnings reset');
    }
  }
});

export const { addReward, claimRewards, resetSessionEarnings, updateTotalEarnings, resetEarnings } = earningsSlice.actions;

// Selectors
export const selectEarnings = (state: { earnings: EarningsState }) => state.earnings;

export const selectTotalEarnings = (state: { earnings: EarningsState }) => {
  return state.earnings.totalEarned;
};

export const selectSessionEarnings = (state: { earnings: EarningsState }) => {
  return state.earnings.sessionEarnings;
};

export const selectRecentRewards = (state: { earnings: EarningsState }, count: number = 10) => {
  return state.earnings.rewardHistory.slice(-count).reverse();
};

export default earningsSlice.reducer;
