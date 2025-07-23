"use client";

import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from '@/lib/store';
import { startTaskEngine, stopTaskEngine } from '@/lib/store/taskEngine';

interface ReduxProviderProps {
  children: React.ReactNode;
}

function TaskEngineManager() {
  useEffect(() => {
    let engine: ReturnType<typeof startTaskEngine> | null = null;
    let previousNodeActive = false;
    let debounceTimeout: NodeJS.Timeout | null = null;

    // Subscribe to store changes to monitor node state
    const unsubscribe = store.subscribe(() => {
      const state = store.getState();
      const isNodeActive = state.node.isActive;

      // Debounce rapid state changes
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }

      debounceTimeout = setTimeout(() => {
        // Start engine when node becomes active
        if (isNodeActive && !previousNodeActive) {
          if (!engine) {
            engine = startTaskEngine(store.dispatch);
          }
        }
        
        // Stop engine when node becomes inactive
        if (!isNodeActive && previousNodeActive) {
          stopTaskEngine();
          engine = null;
        }

        previousNodeActive = isNodeActive;
      }, 100); // 100ms debounce
    });

    // Check initial state and start engine if node is already active
    const initialState = store.getState();
    if (initialState.node.isActive) {
      engine = startTaskEngine(store.dispatch);
      previousNodeActive = true;
    }
    
    // Cleanup on unmount
    return () => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
      if (engine) {
        stopTaskEngine();
        engine = null;
      }
      unsubscribe();
    };
  }, []);

  return null;
}

export function ReduxProvider({ children }: ReduxProviderProps) {
  return (
    <Provider store={store}>
      <TaskEngineManager />
      {children}
    </Provider>
  );
}
