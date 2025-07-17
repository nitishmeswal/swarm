"use client";

import { Provider } from 'react-redux';
import { store } from '@/store';
import { useEffect } from 'react';
import { setStoreReference } from '@/services/proxyTaskService';

export default function ReduxProvider({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  // Set store reference in proxyTaskService to avoid circular dependency
  useEffect(() => {
    setStoreReference(store);
  }, []);
  
  return <Provider store={store}>{children}</Provider>;
}
