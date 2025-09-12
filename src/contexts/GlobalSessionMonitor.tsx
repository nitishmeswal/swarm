'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth } from './AuthContext';

interface SessionStatus {
  hasActiveNode: boolean;
  activeDeviceId: string | null;
  sessionToken: string | null;
  isOwner: boolean;
}

interface GlobalSessionContextType {
  sessionStatus: SessionStatus;
  updateSessionStatus: (status: Partial<SessionStatus>) => void;
  isInAppNavigation: boolean;
  setIsInAppNavigation: (value: boolean) => void;
}

const GlobalSessionContext = createContext<GlobalSessionContextType | null>(null);

export const useGlobalSession = () => {
  const context = useContext(GlobalSessionContext);
  if (!context) {
    throw new Error('useGlobalSession must be used within GlobalSessionProvider');
  }
  return context;
};

export const GlobalSessionProvider: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => {
  const { user } = useAuth();
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>({
    hasActiveNode: false,
    activeDeviceId: null,
    sessionToken: null,
    isOwner: false
  });
  
  // Track if we're doing in-app navigation vs browser tab changes
  const [isInAppNavigation, setIsInAppNavigation] = useState(false);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const isMountedRef = useRef(true);

  const updateSessionStatus = (status: Partial<SessionStatus>) => {
    if (!isMountedRef.current) return;
    
    setSessionStatus(prev => ({ ...prev, ...status }));
  };

  // Initialize global broadcast channel for cross-browser-tab communication
  useEffect(() => {
    if (!user?.id) return;

    try {
      if (typeof window !== 'undefined' && window.BroadcastChannel) {
        const channel = new BroadcastChannel('neuroswarm_global_session');
        broadcastChannelRef.current = channel;

        channel.onmessage = (event) => {
          if (!isMountedRef.current) return;
          
          const { action, deviceId, sessionToken, isOwner, source } = event.data;
          
          // Only respond to messages from OTHER browser tabs/windows, not in-app navigation
          if (source === 'in_app_navigation') return;
          
          console.log(`🌐 Global Session: Received ${action} for device ${deviceId}`);

          switch (action) {
            case 'session_started':
              if (deviceId && sessionToken) {
                updateSessionStatus({
                  hasActiveNode: true,
                  activeDeviceId: deviceId,
                  sessionToken,
                  isOwner: false // This message is from another tab
                });
              }
              break;

            case 'session_stopped':
              if (deviceId === sessionStatus.activeDeviceId || !deviceId) {
                updateSessionStatus({
                  hasActiveNode: false,
                  activeDeviceId: null,
                  sessionToken: null,
                  isOwner: false
                });
              }
              break;

            case 'query_active_sessions':
              // Respond with our session status if we have an active session
              if (sessionStatus.hasActiveNode && sessionStatus.isOwner) {
                channel.postMessage({
                  action: 'session_response',
                  deviceId: sessionStatus.activeDeviceId,
                  sessionToken: sessionStatus.sessionToken,
                  isOwner: true,
                  source: 'global_monitor'
                });
              }
              break;

            case 'session_response':
              // Another tab has reported an active session
              if (deviceId && sessionToken && isOwner) {
                updateSessionStatus({
                  hasActiveNode: true,
                  activeDeviceId: deviceId,
                  sessionToken,
                  isOwner: false
                });
              }
              break;
          }
        };

        // Query for existing sessions when we start
        setTimeout(() => {
          if (isMountedRef.current && channel) {
            channel.postMessage({
              action: 'query_active_sessions',
              source: 'global_monitor'
            });
          }
        }, 1000);

        console.log('🌐 Global Session Monitor initialized');
      }
    } catch (error) {
      console.error('Failed to initialize Global Session Monitor:', error);
    }

    return () => {
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
        broadcastChannelRef.current = null;
      }
    };
  }, [user?.id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Monitor for in-app navigation patterns
  useEffect(() => {
    const handleNavigation = () => {
      setIsInAppNavigation(true);
      
      // Reset after a short delay to distinguish from browser tab changes
      const timer = setTimeout(() => {
        if (isMountedRef.current) {
          setIsInAppNavigation(false);
        }
      }, 2000);

      return () => clearTimeout(timer);
    };

    // Listen for Next.js route changes (in-app navigation)
    const handleRouteChangeStart = () => handleNavigation();
    
    // Listen for browser navigation events
    window.addEventListener('popstate', handleNavigation);
    
    // For Next.js router events, we'd need to import the router
    // For now, we'll use a simpler approach with URL changes
    let currentUrl = window.location.href;
    const checkUrlChange = () => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        handleNavigation();
      }
    };
    
    const urlCheckInterval = setInterval(checkUrlChange, 500);

    return () => {
      window.removeEventListener('popstate', handleNavigation);
      clearInterval(urlCheckInterval);
    };
  }, []);

  const contextValue: GlobalSessionContextType = {
    sessionStatus,
    updateSessionStatus,
    isInAppNavigation,
    setIsInAppNavigation
  };

  return (
    <GlobalSessionContext.Provider value={contextValue}>
      {children}
    </GlobalSessionContext.Provider>
  );
};
