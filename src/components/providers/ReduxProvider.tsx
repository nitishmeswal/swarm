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
    // Start the task processing engine
    const engine = startTaskEngine(store.dispatch);
    
    // Cleanup on unmount
    return () => {
      stopTaskEngine();
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
