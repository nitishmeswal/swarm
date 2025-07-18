import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { EarningsState, RewardTransaction } from '../types';
import { STORAGE_KEYS, logger } from '../config';

// Initial state
const initialState: EarningsState = {
  totalEarned: 0,
  sessionEarnings: 0,
  rewardHistory: [],
  pendingRewards: 0,
};

// Load state from localStorage
const loadEarningsState = (): EarningsState => {
  if (typeof window === 'undefined') return initialState;
  
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.EARNINGS_STATE);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...parsed,
        sessionEarnings: 0 // Reset session earnings on load
      };
    }
  } catch (error) {
    logger.error('Failed to load earnings state', error);
  }
  
  return initialState;
};

// Save state to localStorage
const saveEarningsState = (state: EarningsState) => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEYS.EARNINGS_STATE, JSON.stringify(state));
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
    
    resetEarnings: (state) => {
      Object.assign(state, initialState);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEYS.EARNINGS_STATE);
      }
      logger.log('Earnings reset');
    }
  }
});

export const { addReward, claimRewards, resetSessionEarnings, resetEarnings } = earningsSlice.actions;

// Selectors
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
