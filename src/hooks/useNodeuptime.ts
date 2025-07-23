import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase/client';
import { useAppDispatch, useAppSelector } from '@/lib/store';
import { selectCompletedTasksForStats, resetCompletedTasksForStats } from '@/lib/store/slices/taskSlice';
import { selectNode } from '@/lib/store/slices/nodeSlice';

interface CompletedTasks {
  three_d: number;
  video: number;
  text: number;
  image: number;
}

interface DeviceUptime {
  deviceId: string;
  sessionStartTime: number;
  totalUptime: number;
  isRunning: boolean;
}

interface NodeUptimeResponse {
  success: boolean;
  message?: string;
  data?: {
    device_id: string;
    device_name: string;
    new_uptime: number;
  };
  error?: string;
}

const UPTIME_UPDATE_ENDPOINT = 'https://phpaoasgtqsnwohtevwf.supabase.co/functions/v1/node_uptime_updation';
const STORAGE_KEY = '_device_metrics_store_v2';

export const useNodeUptime = () => {
  const { user } = useAuth();
  const supabase = createClient();
  const dispatch = useAppDispatch();
  const node = useAppSelector(selectNode);
  const completedTasksForStats = useAppSelector(selectCompletedTasksForStats);
  
  // State for tracking multiple device uptimes (removed completedTasks from here)
  const [deviceUptimes, setDeviceUptimes] = useState<Map<string, DeviceUptime>>(new Map());
  const [isUpdatingUptime, setIsUpdatingUptime] = useState(false);
  const [syncingDevices, setSyncingDevices] = useState<Set<string>>(new Set());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveRef = useRef<number>(0);

  // Load device uptimes from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const data = JSON.parse(stored);
          const uptimeMap = new Map<string, DeviceUptime>();
          
          Object.entries(data).forEach(([deviceId, uptimeData]) => {
            // Remove completedTasks from stored data if it exists
            const { completedTasks, ...cleanUptimeData } = uptimeData as any;
            uptimeMap.set(deviceId, cleanUptimeData as DeviceUptime);
          });
          
          setDeviceUptimes(uptimeMap);
        }
      } catch (error) {
        console.error('Failed to load device uptimes from storage:', error);
      }
    }
  }, []);

  // Save device uptimes to localStorage
  const saveToStorage = useCallback((uptimeMap: Map<string, DeviceUptime>) => {
    if (typeof window !== 'undefined') {
      try {
        const dataToSave = Object.fromEntries(uptimeMap);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
      } catch (error) {
        console.error('Failed to save device uptimes to storage:', error);
      }
    }
  }, []);

  // Initialize device uptime tracking
  const initializeDeviceUptime = useCallback((deviceId: string, initialUptime: number = 0) => {
    setDeviceUptimes(prev => {
      const newMap = new Map(prev);
      if (!newMap.has(deviceId)) {
        const deviceUptime: DeviceUptime = {
          deviceId,
          sessionStartTime: Date.now(),
          totalUptime: initialUptime,
          isRunning: false,
        };
        newMap.set(deviceId, deviceUptime);
        saveToStorage(newMap);
      }
      return newMap;
    });
  }, [saveToStorage]);

  // Start tracking uptime for a device
  const startDeviceUptime = useCallback((deviceId: string) => {
    const now = Date.now();
    
    setDeviceUptimes(prev => {
      const newMap = new Map(prev);
      const deviceUptime = newMap.get(deviceId);
      
      if (deviceUptime) {
        deviceUptime.sessionStartTime = now;
        deviceUptime.isRunning = true;
        newMap.set(deviceId, deviceUptime);
        saveToStorage(newMap);
      }
      
      return newMap;
    });

    // Start interval for periodic saving (every 30 seconds)
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    intervalRef.current = setInterval(() => {
      const currentTime = Date.now();
      // Only save every 30 seconds to avoid excessive writes
      if (currentTime - lastSaveRef.current > 30000) {
        setDeviceUptimes(current => {
          const updated = new Map(current);
          const device = updated.get(deviceId);
          
          if (device && device.isRunning) {
            const sessionDuration = Math.floor((currentTime - device.sessionStartTime) / 1000);
            // Update total uptime but don't send to server yet
            device.totalUptime += sessionDuration;
            device.sessionStartTime = currentTime;
            updated.set(deviceId, device);
            saveToStorage(updated);
            lastSaveRef.current = currentTime;
          }
          
          return updated;
        });
      }
    }, 1000);
  }, [saveToStorage]);

  // Stop tracking and update server
  const stopDeviceUptime = useCallback(async (deviceId: string) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setIsUpdatingUptime(true);

    try {
      const deviceUptime = deviceUptimes.get(deviceId);
      
      if (!deviceUptime || !deviceUptime.isRunning) {
        return { success: true, message: 'Device was not running' };
      }

      const now = Date.now();
      const sessionDuration = Math.floor((now - deviceUptime.sessionStartTime) / 1000);

      // Get current session for auth
      const { data: { session } } = await supabase.auth.getSession();
      
      // Update server with final uptime and completed tasks from global state
      const response = await fetch(UPTIME_UPDATE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          device_id: deviceId,
          uptime_seconds: sessionDuration,
          completed_tasks: completedTasksForStats
        })
      });

      const result: NodeUptimeResponse = await response.json();

      if (result.success && result.data) {
        // Update local state with server response
        setDeviceUptimes(prev => {
          const newMap = new Map(prev);
          const device = newMap.get(deviceId);
          
          if (device) {
            device.totalUptime = result.data!.new_uptime;
            device.isRunning = false;
            device.sessionStartTime = now;
            newMap.set(deviceId, device);
            saveToStorage(newMap);
          }
          
          return newMap;
        });

        // Reset completed tasks in global state after successful update
        dispatch(resetCompletedTasksForStats());

        return { success: true, data: result.data };
      } else {
        throw new Error(result.error || 'Failed to update uptime');
      }
    } catch (error) {
      console.error('Error updating device uptime:', error);
      
      // Even if server update fails, stop local tracking
      setDeviceUptimes(prev => {
        const newMap = new Map(prev);
        const device = newMap.get(deviceId);
        
        if (device) {
          device.isRunning = false;
          newMap.set(deviceId, device);
          saveToStorage(newMap);
        }
        
        return newMap;
      });

      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    } finally {
      setIsUpdatingUptime(false);
    }
  }, [deviceUptimes, supabase, saveToStorage, completedTasksForStats, dispatch]);

  // Remove addCompletedTask function since we're using global state now

  // Get current uptime for a device (including session time)
  const getCurrentUptime = useCallback((deviceId: string): number => {
    const device = deviceUptimes.get(deviceId);
    
    if (!device) return 0;
    
    if (device.isRunning) {
      const sessionDuration = Math.floor((Date.now() - device.sessionStartTime) / 1000);
      return device.totalUptime + sessionDuration;
    }
    
    return device.totalUptime;
  }, [deviceUptimes]);

  // Get device running state
  const isDeviceRunning = useCallback((deviceId: string): boolean => {
    const device = deviceUptimes.get(deviceId);
    return device?.isRunning || false;
  }, [deviceUptimes]);

  // Get completed tasks for a device (from global state)
  const getCompletedTasks = useCallback((): CompletedTasks => {
    return completedTasksForStats;
  }, [completedTasksForStats]);

  // Load device data from API and sync with local state (with proper guards)
  const syncDeviceUptime = useCallback(async (deviceId: string) => {
    if (!user?.id || !deviceId) return;

    // Prevent multiple simultaneous syncs for the same device
    if (syncingDevices.has(deviceId)) {
      console.log(`Sync already in progress for device ${deviceId}`);
      return;
    }

    setSyncingDevices(prev => new Set(prev).add(deviceId));

    try {
      const { data, error } = await supabase
        .from('devices')
        .select('uptime')
        .eq('id', deviceId)
        .single();

      if (error) {
        console.error('Error fetching device uptime:', error);
        return;
      }

      if (data) {
        const serverUptime = Number(data.uptime) || 0;
        
        setDeviceUptimes(prev => {
          const newMap = new Map(prev);
          const device = newMap.get(deviceId);
          
          if (device && !device.isRunning) {
            // Only sync if device is not currently running
            device.totalUptime = serverUptime;
            newMap.set(deviceId, device);
            saveToStorage(newMap);
          } else if (!device) {
            // Initialize new device with server uptime
            const deviceUptime: DeviceUptime = {
              deviceId,
              sessionStartTime: Date.now(),
              totalUptime: serverUptime,
              isRunning: false,
            };
            newMap.set(deviceId, deviceUptime);
            saveToStorage(newMap);
          }
          
          return newMap;
        });
      }
    } catch (error) {
      console.error('Error syncing device uptime:', error);
    } finally {
      setSyncingDevices(prev => {
        const newSet = new Set(prev);
        newSet.delete(deviceId);
        return newSet;
      });
    }
  }, [user?.id, supabase, saveToStorage, syncingDevices]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    initializeDeviceUptime,
    startDeviceUptime,
    stopDeviceUptime,
    getCurrentUptime,
    isDeviceRunning,
    getCompletedTasks,
    syncDeviceUptime,
    isUpdatingUptime,
    deviceUptimes: Array.from(deviceUptimes.values())
  };
};
