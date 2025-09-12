import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase/client';
import { useAppDispatch, useAppSelector } from '@/lib/store';
import { selectCompletedTasksForStats, resetCompletedTasksForStats } from '@/lib/store/slices/taskSlice';
import { selectNode } from '@/lib/store/slices/nodeSlice';
import { optimizedFetch, getApiStats } from '@/lib/apiOptimization';
import { deviceWebSocket } from '@/lib/websocketManager';

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
  lastSyncTime: number; // NEW: Track when we last synced with server
  serverUptime: number; // NEW: Store the authoritative server uptime
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

// Add version to storage key to invalidate old data when structure changes
const STORAGE_KEY = '_device_metrics_store_v3'; // Incremented version
const SYNC_THRESHOLD = 5 * 60 * 1000; // 5 minutes - how often to sync with server

export const useNodeUptime = () => {
  const { user } = useAuth();
  const supabase = createClient();
  const dispatch = useAppDispatch();
  const node = useAppSelector(selectNode);
  const completedTasksForStats = useAppSelector(selectCompletedTasksForStats);

  const [deviceUptimes, setDeviceUptimes] = useState<Map<string, DeviceUptime>>(new Map());
  const [isUpdatingUptime, setIsUpdatingUptime] = useState(false);
  const [syncingDevices, setSyncingDevices] = useState<Set<string>>(new Set());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveRef = useRef<number>(0);

  // NEW: Helper to check if local data is stale (older than 6 hours)
  const isDataStale = (lastSyncTime: number): boolean => {
    return Date.now() - lastSyncTime > 6 * 60 * 60 * 1000; // 6 hours
  };

  // NEW: Validate and sanitize stored data
  const validateStoredData = (data: any): boolean => {
    if (!data || typeof data !== 'object') return false;

    // Check if data structure matches current version
    for (const [deviceId, deviceData] of Object.entries(data)) {
      if (!deviceData || typeof deviceData !== 'object') return false;
      const device = deviceData as any;

      // Validate required fields exist
      if (!device.deviceId || typeof device.totalUptime !== 'number' ||
        typeof device.isRunning !== 'boolean' || typeof device.sessionStartTime !== 'number') {
        return false;
      }

      // NEW: Check if data is too old (stale)
      if (device.lastSyncTime && isDataStale(device.lastSyncTime)) {
        // Stale data detected - will sync with server
        return false;
      }
    }
    return true;
  };

  // IMPROVED: Load device uptimes with validation and fallback to server sync
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const data = JSON.parse(stored);

          // Validate stored data structure and freshness
          if (validateStoredData(data)) {
            const uptimeMap = new Map<string, DeviceUptime>();

            Object.entries(data).forEach(([deviceId, uptimeData]) => {
              const { completedTasks, ...cleanUptimeData } = uptimeData as any;

              // Ensure new fields exist with defaults
              const deviceUptime: DeviceUptime = {
                ...cleanUptimeData,
                lastSyncTime: cleanUptimeData.lastSyncTime || Date.now(),
                serverUptime: cleanUptimeData.serverUptime || cleanUptimeData.totalUptime || 0
              };

              uptimeMap.set(deviceId, deviceUptime);
            });

            setDeviceUptimes(uptimeMap);
            // Uptime data loaded from localStorage
          } else {
            // Clear invalid/stale data
            localStorage.removeItem(STORAGE_KEY);
            // Cleared stale uptime data
          }
        }
      } catch (error) {
        // Failed to load device uptimes from storage
        // Clear corrupted data
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // IMPROVED: Save with enhanced data structure
  const saveToStorage = useCallback((uptimeMap: Map<string, DeviceUptime>) => {
    if (typeof window !== 'undefined') {
      try {
        const dataToSave = Object.fromEntries(uptimeMap);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
      } catch (error) {
        // Failed to save device uptimes to storage
      }
    }
  }, []);

  // IMPROVED: Initialize with server sync priority
  const initializeDeviceUptime = useCallback(async (deviceId: string, initialUptime: number = 0) => {
    const now = Date.now();

    setDeviceUptimes(prev => {
      const newMap = new Map(prev);
      if (!newMap.has(deviceId)) {
        const deviceUptime: DeviceUptime = {
          deviceId,
          sessionStartTime: now,
          totalUptime: initialUptime,
          isRunning: false,
          lastSyncTime: now,
          serverUptime: initialUptime, // Store server uptime separately
        };
        newMap.set(deviceId, deviceUptime);
        saveToStorage(newMap);
        // Initialized device with uptime
      }
      return newMap;
    });

    // NEW: Always sync with server after initialization to ensure accuracy
    setTimeout(() => {
      syncDeviceUptime(deviceId);
    }, 100);
  }, [saveToStorage]);

  // Start tracking uptime for a device
  const startDeviceUptime = useCallback((deviceId: string) => {
    const now = Date.now();

    setDeviceUptimes(prev => {
      const newMap = new Map(prev);
      const deviceUptime = newMap.get(deviceId);

      if (deviceUptime) {
        // Use server uptime as the base, not local storage uptime
        deviceUptime.totalUptime = deviceUptime.serverUptime;
        deviceUptime.sessionStartTime = now;
        deviceUptime.isRunning = true;
        newMap.set(deviceId, deviceUptime);
        saveToStorage(newMap);
        // Started tracking uptime for device
      }

      return newMap;
    });

    // Start interval for periodic saving (every 30 seconds)
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      const currentTime = Date.now();
      // CRITICAL FIX: Only save every 5 minutes to reduce API load
      if (currentTime - lastSaveRef.current > 300000) { // 5 minutes instead of 60 seconds
        setDeviceUptimes(current => {
          const updated = new Map(current);
          const device = updated.get(deviceId);

          if (device && device.isRunning) {
            const sessionDuration = Math.floor((currentTime - device.sessionStartTime) / 1000);
            // Update total uptime but don't send to server yet
            device.totalUptime = device.serverUptime + sessionDuration;
            updated.set(deviceId, device);
            saveToStorage(updated);
            lastSaveRef.current = currentTime;
          }

          return updated;
        });
      }
    }, 60000); // CRITICAL FIX: Check every 60 seconds instead of 10
  }, [saveToStorage]);

  // IMPROVED: Stop with better error handling and server sync
  const stopDeviceUptime = useCallback(async (deviceId: string) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setIsUpdatingUptime(true);

    try {
      const deviceUptime = deviceUptimes.get(deviceId);

      if (!deviceUptime || !deviceUptime.isRunning) {
        setIsUpdatingUptime(false);
        return { success: true, message: 'Device was not running' };
      }

      const now = Date.now();
      const sessionDuration = Math.floor((now - deviceUptime.sessionStartTime) / 1000);

      // Stopping device session

      // Update server with final uptime and completed tasks from global state
      const response = await optimizedFetch('/api/node-uptime', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          device_id: deviceId,
          uptime_seconds: sessionDuration,
          completed_tasks: completedTasksForStats
        })
      }, {
        enableDeduplication: true,
        enableCircuitBreaker: true,
        enableRetry: true,
        maxRetries: 3
      });

      const result: NodeUptimeResponse = await response.json();

      if (result.success && result.data) {
        // Update user profile with completed tasks count
        if (Object.values(completedTasksForStats).some(count => count > 0)) {
          try {
            // Updating profile with completed tasks

            const profileResponse = await optimizedFetch('/api/profile', {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                completed_tasks: completedTasksForStats
              })
            }, {
              enableDeduplication: true,
              enableCircuitBreaker: true,
              enableRetry: true,
              maxRetries: 2
            });

            if (profileResponse.ok) {
              // Profile task_completed updated successfully
            } else {
              // Failed to update profile task_completed
            }
          } catch (profileError) {
            // Error updating profile task_completed
          }
        }

        // IMPROVED: Update local state with authoritative server response
        setDeviceUptimes(prev => {
          const newMap = new Map(prev);
          const device = newMap.get(deviceId);

          if (device) {
            device.totalUptime = result.data!.new_uptime;
            device.serverUptime = result.data!.new_uptime; // NEW: Store server uptime
            device.isRunning = false;
            device.sessionStartTime = now;
            device.lastSyncTime = now; // NEW: Update sync time
            newMap.set(deviceId, device);
            saveToStorage(newMap);
            // Updated device total uptime
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
      // Error updating device uptime

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
  }, [deviceUptimes, saveToStorage, completedTasksForStats, dispatch]);

  // IMPROVED: Get current uptime with server priority
  const getCurrentUptime = useCallback((deviceId: string): number => {
    const device = deviceUptimes.get(deviceId);

    if (!device) return 0;

    if (device.isRunning) {
      const sessionDuration = Math.floor((Date.now() - device.sessionStartTime) / 1000);
      // Use server uptime as base, not potentially stale local uptime
      return device.serverUptime + sessionDuration;
    }

    // Return server uptime when not running
    return device.serverUptime;
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

  // IMPROVED: Enhanced sync with better error handling and staleness detection
  const syncDeviceUptime = useCallback(async (deviceId: string, forceSync: boolean = false) => {
    if (!user?.id || !deviceId) return;

    // Prevent multiple simultaneous syncs for the same device
    if (syncingDevices.has(deviceId)) {
      // Sync already in progress for device
      return;
    }

    const device = deviceUptimes.get(deviceId);

    // Skip sync if recently synced and not forced (unless data is stale)
    if (!forceSync && device && device.lastSyncTime) {
      const timeSinceSync = Date.now() - device.lastSyncTime;
      if (timeSinceSync < SYNC_THRESHOLD && !isDataStale(device.lastSyncTime)) {
        // Skipping sync - recently synced
        return;
      }
    }

    setSyncingDevices(prev => new Set(prev).add(deviceId));

    try {
      // Sync with server logic here
      const response = await optimizedFetch(`/api/devices/${deviceId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }, {
        enableDeduplication: true,
        enableCircuitBreaker: true,
        enableRetry: true,
        maxRetries: 2
      });

      if (!response.ok) {
        throw new Error('Failed to sync with server');
      }

      const { device: serverDevice } = await response.json();
      const serverUptime = Number(serverDevice?.uptime) || 0;
      const now = Date.now();

      // Server uptime received
      if (serverUptime >= 0) {
        setDeviceUptimes(prev => {
          const newMap = new Map(prev);
          const localDevice = newMap.get(deviceId);

          if (localDevice && !localDevice.isRunning) {
            // Only sync if device is not currently running to avoid conflicts
            // Syncing device uptime
            localDevice.totalUptime = serverUptime;
            localDevice.serverUptime = serverUptime;
            localDevice.lastSyncTime = now;
            newMap.set(deviceId, localDevice);
            saveToStorage(newMap);
          } else if (localDevice && localDevice.isRunning) {
            // If running, just update the server uptime base without affecting current session
            localDevice.serverUptime = serverUptime;
            localDevice.lastSyncTime = now;
            newMap.set(deviceId, localDevice);
            saveToStorage(newMap);
            // Updated server base uptime for running device
          } else if (!localDevice) {
            // Initialize new device with server uptime
            const deviceUptime: DeviceUptime = {
              deviceId,
              sessionStartTime: now,
              totalUptime: serverUptime,
              serverUptime: serverUptime,
              isRunning: false,
              lastSyncTime: now,
            };
            newMap.set(deviceId, deviceUptime);
            saveToStorage(newMap);
            // Initialized device with server uptime
          }

          return newMap;
        });
      }
    } catch (error) {
      // Error syncing device uptime
    } finally {
      setSyncingDevices(prev => {
        const newSet = new Set(prev);
        newSet.delete(deviceId);
        return newSet;
      });
    }
  }, [user?.id, deviceUptimes, saveToStorage, syncingDevices]);

  // NEW: Periodic sync for all devices to ensure data freshness
  useEffect(() => {
    if (!user?.id) return;

    const syncAllDevices = async () => {
      const devicesToSync = Array.from(deviceUptimes.keys()).filter(deviceId => {
        const device = deviceUptimes.get(deviceId);
        // Sync if device exists, is not currently syncing, and hasn't been synced recently
        return device && !syncingDevices.has(deviceId) &&
          (!device.lastSyncTime || isDataStale(device.lastSyncTime));
      });

      for (const deviceId of devicesToSync) {
        await syncDeviceUptime(deviceId, true);
        // Small delay between syncs to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    };

    // FIXED: Reduced from 10 minutes to 30 minutes
    syncAllDevices();
    const periodicSyncInterval = setInterval(syncAllDevices, 30 * 60 * 1000);

    return () => clearInterval(periodicSyncInterval);
  }, [user?.id, deviceUptimes, syncingDevices, syncDeviceUptime]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // NEW: Validate current uptime with server
  const validateCurrentUptime = useCallback(async (deviceId: string): Promise<number> => {
    try {
      // Validating uptime with server

      const response = await optimizedFetch(`/api/devices/${deviceId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }, {
        enableDeduplication: true,
        enableCircuitBreaker: true,
        enableRetry: true,
        maxRetries: 2
      });

      if (!response.ok) {
        // Failed to validate uptime with server
        return getCurrentUptime(deviceId); // Fallback to local uptime
      }

      const { device: serverDevice } = await response.json();
      const serverUptime = Number(serverDevice?.uptime) || 0;

      // Server validated uptime
      return serverUptime;
    } catch (error) {
      // Error validating uptime with server
      return getCurrentUptime(deviceId); // Fallback to local uptime
    }
  }, [getCurrentUptime]);

  // NEW: Reset device uptime (useful for debugging/admin)
  const resetDeviceUptime = useCallback((deviceId: string) => {
    setDeviceUptimes(prev => {
      const newMap = new Map(prev);
      const device = newMap.get(deviceId);

      if (device) {
        device.totalUptime = 0;
        device.serverUptime = 0;
        device.sessionStartTime = Date.now();
        device.lastSyncTime = Date.now();
        device.isRunning = false;
        newMap.set(deviceId, device);
        saveToStorage(newMap);
        // Reset uptime for device
      }

      return newMap;
    });
  }, [saveToStorage]);

  // NEW: Check if device data is stale
  const isDeviceDataStale = useCallback((deviceId: string): boolean => {
    const device = deviceUptimes.get(deviceId);
    if (!device || !device.lastSyncTime) return true;
    return isDataStale(device.lastSyncTime);
  }, [deviceUptimes]);

  return {
    initializeDeviceUptime,
    startDeviceUptime,
    stopDeviceUptime,
    getCurrentUptime,
    isDeviceRunning,
    getCompletedTasks,
    syncDeviceUptime,
    isUpdatingUptime,
    deviceUptimes: Array.from(deviceUptimes.values()),
    validateCurrentUptime,
    resetDeviceUptime,
    isDataStale: isDeviceDataStale,
  };
};
