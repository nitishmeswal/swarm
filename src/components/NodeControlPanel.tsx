"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useGlobalSession } from "@/contexts/GlobalSessionMonitor";
import {
  Clock,
  Laptop,
  Monitor,
  Tablet,
  Smartphone,
  Scan,
  Loader2,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import { VscDebugStart } from "react-icons/vsc";
import { IoStopOutline } from "react-icons/io5";
import { InfoTooltip } from "./InfoTooltip";
import { Button } from "./ui/button";
import { HardwareScanDialog } from "./HardwareScanDialog";
import { logWarn, logSecure, logError, logInfo } from '@/lib/logger';
import { debounce } from '@/utils/debounce';
import { optimizedFetch, getApiStats } from '@/lib/apiOptimization';
import { deviceWebSocket } from '@/lib/websocketManager';
import { useAuth } from "@/contexts/AuthContext";
import { useAppDispatch, useAppSelector } from "@/lib/store";
import {
  registerDevice,
  startNode,
  stopNode,
  selectCurrentUptime,
  selectNode,
} from "@/lib/store/slices/nodeSlice";
import {
  selectTotalEarnings,
  selectSessionEarnings,
  selectEarnings,
  resetSessionEarnings,
} from "@/lib/store/slices/earningsSlice";
import { resetTasks } from "@/lib/store/slices/taskSlice";
import { formatUptime, TASK_CONFIG } from "@/lib/store/config";
import { HardwareInfo } from "@/lib/store/types";
import { useEarnings } from "@/hooks/useEarnings";
import { useNodeUptime } from "@/hooks/useNodeuptime";
import { useReferrals } from "@/hooks/useRefferals";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { createClient } from "@/utils/supabase/client";
import { usePlan } from "@/contexts/PlanContext";
import { extractGPUModel } from "@/lib/gpuUtils";
import {
  trackNodeAction,
  trackDeviceRegistration,
  trackRewardClaim,
  trackError,
  trackEvent,
} from "@/lib/analytics";

interface NodeInfo {
  id: string;
  name: string;
  type: "desktop" | "laptop" | "tablet" | "mobile";
  brand?: string;
  model?: string;
  rewardTier: "webgpu" | "wasm" | "webgl" | "cpu";
  status: "idle" | "running" | "offline";
  cpuCores?: number;
  memory?: number | string;
  gpuInfo?: string;
}

interface SupabaseDevice {
  id: string;
  status: string;
  gpu_model: string;
  hash_rate: number;
  owner: string;
  created_at: string;
  uptime: number;
  stake_amount: number | null;
  reward_tier: "webgpu" | "wasm" | "webgl" | "cpu" | null;
  device_name: string | null;
  device_type: "desktop" | "laptop" | "mobile" | "tablet";
  session_token: string | null;
  session_created_at: string | null;
  last_seen: string | null;
}

export const NodeControlPanel = () => {
  const { user, isLoggedIn, isLoading } = useAuth();
  const { canAddDevice, getMaxUptime, currentPlan, planDetails } = usePlan();
  const dispatch = useAppDispatch();
  const node = useAppSelector(selectNode);
  const earnings = useAppSelector(selectEarnings);
  const currentUptime = useAppSelector(selectCurrentUptime);
  const totalEarnings = useAppSelector(selectTotalEarnings);
  const sessionEarnings = useAppSelector(selectSessionEarnings);
  const supabase = createClient();

  const {
    claimTaskRewards,
    loadTotalEarnings,
    isClaimingReward,
    isLoading: isLoadingEarnings,
    claimError: earningsClaimError,
    claimSuccess,
    resetClaimState,
  } = useEarnings();

  const {
    initializeDeviceUptime,
    startDeviceUptime,
    stopDeviceUptime,
    getCurrentUptime,
    isDeviceRunning,
    getCompletedTasks,
    syncDeviceUptime,
    isUpdatingUptime,
    deviceUptimes: deviceUptimeList,
    // FIX: Add new utility functions from enhanced hook
    validateCurrentUptime,
    resetDeviceUptime,
    isDataStale,
  } = useNodeUptime();

  const { processReferralRewards } = useReferrals();
  const { sessionStatus, updateSessionStatus, isInAppNavigation } = useGlobalSession();

  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [showScanDialog, setShowScanDialog] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState("");
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [isDeletingNode, setIsDeletingNode] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isLoadingDevices, setIsLoadingDevices] = useState(true);
  const [hasFetchedDevices, setHasFetchedDevices] = useState(false);
  const [deletingNodeId, setDeletingNodeId] = useState<string | null>(null);
  const [uptimeExceeded, setUptimeExceeded] = useState(false);
  const [deviceLimitExceeded, setDeviceLimitExceeded] = useState(false);
  const [showUptimeLimitDialog, setShowUptimeLimitDialog] = useState(false);
  const [showClaimSuccess, setShowClaimSuccess] = useState(false);
  const [displayUptime, setDisplayUptime] = useState(0);
  const [dbUnclaimedRewards, setDbUnclaimedRewards] = useState(0);
  const [isLoadingUnclaimedRewards, setIsLoadingUnclaimedRewards] =
    useState(true);
  const [lastSavedSessionEarnings, setLastSavedSessionEarnings] = useState(0);
  const [isSavingToDb, setIsSavingToDb] = useState(false);
  const [isClaimInProgress, setIsClaimInProgress] = useState(false);

  // FIX: Enhanced refs for better tracking
  const initializedDevicesRef = useRef<Set<string>>(new Set());
  const lastAutoSaveRef = useRef<number>(0);
  const autoStopInProgressRef = useRef<boolean>(false);
  const deviceSyncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [nodes, setNodes] = useState<NodeInfo[]>([]);
  // FIX: Add new state for sync status tracking
  const [syncingDeviceId, setSyncingDeviceId] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<number>(0);
  
  // FIX: Add session management state
  const [deviceSessionToken, setDeviceSessionToken] = useState<string | null>(null);
  
  // FIX: Initialize sessionVerified based on whether this tab owns the session
  const [sessionVerified, setSessionVerified] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    
    const currentTabId = sessionStorage.getItem('tab_id');
    const sessionOwnerTabId = localStorage.getItem('session_owner_tab_id');
    const storedToken = localStorage.getItem('device_session_token');
    
    // If this tab owns the session and has a token, initialize as verified
    return !!(currentTabId && sessionOwnerTabId === currentTabId && storedToken);
  });
  
  const [sessionExists, setSessionExists] = useState<boolean>(false);
  const [sessionCheckComplete, setSessionCheckComplete] = useState<boolean>(false);
  
  // Ref to prevent duplicate session token generation
  const sessionTokenGeneratingRef = useRef<boolean>(false);

  // Add broadcast channel for cross-tab communication
  const [broadcastChannel, setBroadcastChannel] = useState<BroadcastChannel | null>(null);
  
  // Simplified debouncing only - no aggressive rate limiting
  const debouncedSyncDeviceUptime = useCallback(
    debounce((deviceId: string, force?: boolean) => {
      syncDeviceUptime(deviceId, force);
    }, 2000), // Simple 2-second debounce
    []
  );

  const debouncedBroadcastMessage = useCallback(
    debounce((message: any) => {
      if (broadcastChannel) {
        try {
          broadcastChannel.postMessage(message);
        } catch (error) {
          if (error instanceof Error && error.name !== 'InvalidStateError') {
            // Silent error handling - no logging
          }
        }
      }
    }, 1000), // Simple 1-second debounce
    [broadcastChannel]
  );

  // Helper function to get device icon
  const getDeviceIcon = (type: "desktop" | "laptop" | "tablet" | "mobile") => {
    switch (type) {
      case "desktop":
        return <Monitor className="w-6 h-6" />;
      case "laptop":
        return <Laptop className="w-6 h-6" />;
      case "tablet":
        return <Tablet className="w-6 h-6" />;
      case "mobile":
        return <Smartphone className="w-6 h-6" />;
    }
  };

  // Generate unique identifiers for session management
  const generateSessionToken = () => {
    // Combine current timestamp, random string, and user ID if available for uniqueness
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const userComponent = user?.id ? user.id.substring(0, 8) : '';
    return `${timestamp}-${randomString}-${userComponent}`;
  };
  
  // Generate a unique tab identifier
  const generateTabId = () => {
    return `tab_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  };
  
  // Get or create tab ID for this session
  const getTabId = () => {
    let tabId = sessionStorage.getItem('tab_id');
    if (!tabId) {
      tabId = generateTabId();
      sessionStorage.setItem('tab_id', tabId);
    }
    return tabId;
  };
  
  // Check if device has an active session elsewhere
  const checkDeviceSession = async (deviceId: string): Promise<{
    hasActiveSession: boolean;
    sessionToken?: string;
    ownedByCurrentTab?: boolean;
  }> => {
    if (!user?.id || !deviceId) {
      return { hasActiveSession: false };
    }
    
    try {
      
      // Checking session status for device
      
      const response = await optimizedFetch(`/api/device-session/verify?deviceId=${deviceId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      }, {
        enableDeduplication: true,
        enableCircuitBreaker: true,
        enableRetry: true,
        maxRetries: 2
      });
      
      if (!response.ok) {
        // Failed to verify device session
        return { 
          hasActiveSession: false, 
          sessionToken: null,
          sessionCreatedAt: null,
          deviceStatus: "offline" 
        };
      }
      
      const data = await response.json();
      
      // Device limit check completed
      
      return {
        hasActiveSession: data.hasActiveSession,
        sessionToken: data.sessionToken,
        sessionCreatedAt: data.sessionCreatedAt,
        deviceStatus: data.status
      };
    } catch (error) {
      // Error checking device session
      return { 
        hasActiveSession: false, 
        sessionToken: null,
        sessionCreatedAt: null,
        deviceStatus: "offline" 
      };
    }
  };
  
  // Verify if the current tab owns the active session
  const verifySessionOwnership = async (deviceId: string, sessionToken: string): Promise<boolean> => {
    try {
      if (!deviceId || !sessionToken) return false;
      
      // Verifying session ownership for device
      
      const response = await fetch(`/api/device-session/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId, sessionToken })
      });
      
      if (!response.ok) {
        // Failed to verify session ownership
        return false;
      }
      
      const data = await response.json();
      // Session ownership verification completed
      
      return data.isSessionValid;
    } catch (error) {
      // Error verifying session ownership
      return false;
    }
  };

  // FIX: Enhanced device status update function with session token management
  const updateDeviceStatus = async (
    deviceId: string,
    status: "offline" | "busy",
    includeSessionToken = false
  ) => {
    try {
      const payload: any = {
        device_id: deviceId,
        status: status,
        last_seen: new Date().toISOString(),
      };

      // For busy status, generate and include a session token
      if (includeSessionToken && status === "busy") {
        const sessionToken = generateSessionToken();
        payload.session_token = sessionToken;
        payload.session_created_at = new Date().toISOString();
        
        // Generated new session token for device
      }
      
      // For offline status, clear the session token
      if (status === "offline") {
        payload.session_token = null;
        payload.session_created_at = null;
      }

      const response = await fetch("/api/devices", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        // Failed to update device status
        return { success: false, sessionToken: null };
      }

      // Device status updated
      return { 
        success: true, 
        sessionToken: payload.session_token || null 
      };
    } catch (error) {
      // Error updating device status
      return { success: false, sessionToken: null };
    }
  };

  // FIX: Enhanced device deletion with better error handling
  const deleteDevice = async (deviceId: string) => {
    if (!deviceId || !user?.id) return;

    // FIX: Prevent deletion of running devices
    if (isDeviceRunning(deviceId)) {
      alert("Cannot delete a running device. Please stop the device first.");
      return false;
    }

    try {
      // Deleting device

      const response = await fetch(`/api/devices?id=${deviceId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        // Error deleting device
        return false;
      } else {
        // Remove the node from the list
        setNodes((prevNodes) =>
          prevNodes.filter((node) => node.id !== deviceId)
        );

        // FIX: Better handling of selected node after deletion
        if (deviceId === selectedNodeId) {
          const remainingNodes = nodes.filter((node) => node.id !== deviceId);
          if (remainingNodes.length > 0) {
            const nextNodeId = remainingNodes[0].id;
            setSelectedNodeId(nextNodeId);
            // Sync the new selected device
            setTimeout(() => syncDeviceUptime(nextNodeId, false), 100);
          } else {
            setSelectedNodeId("");
          }
        }

        // Device deleted successfully
        return true;
      }
    } catch (err) {
      // Exception while deleting device
      return false;
    }
  };

  // FIX: Device limit checking function
  const checkDeviceLimit = useCallback((): boolean => {
    if (!planDetails?.deviceLimit) return false;
    return nodes.length >= planDetails.deviceLimit;
  }, [nodes.length, planDetails?.deviceLimit]);

  // FIX: CRITICAL - Enhanced uptime limit checking with server validation
  const checkUptimeLimit = useCallback(
    async (validateWithServer: boolean = false): Promise<boolean> => {
      if (!selectedNodeId) return false;

      let currentUptime;

      if (validateWithServer) {
        // FIX: Get server-validated uptime
        // Validating uptime with server
        currentUptime = await validateCurrentUptime(selectedNodeId);
      } else {
        currentUptime = getCurrentUptime(selectedNodeId);
      }

      const maxUptime = getMaxUptime();
      const exceeded = currentUptime >= maxUptime;

      console.log(
        `📊 Uptime check - Current: ${currentUptime}s, Max: ${maxUptime}s, Exceeded: ${exceeded}`
      );

      return exceeded;
    },
    [selectedNodeId, getCurrentUptime, getMaxUptime, validateCurrentUptime]
  );

  // FIX: Enhanced fetch unclaimed rewards with better error handling
  const fetchUnclaimedRewards = async () => {
    if (!user?.id) return;

    try {
      setIsLoadingUnclaimedRewards(true);
      // Fetching unclaimed rewards from server

      const response = await fetch("/api/unclaimed-rewards", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const { unclaimed_reward } = await response.json();
        const dbRewards = unclaimed_reward || 0;
        setDbUnclaimedRewards(dbRewards);

        // FIX: On page load, reset session earnings to start fresh
        dispatch(resetSessionEarnings());
        setLastSavedSessionEarnings(0);

        // Loaded unclaimed rewards from DB
      } else {
        // Failed to fetch unclaimed rewards
      }
    } catch (error) {
      // Error fetching unclaimed rewards
    } finally {
      setIsLoadingUnclaimedRewards(false);
    }
  };

  // FIX: Enhanced save session earnings with better concurrency control
  const saveSessionEarningsToDb = async (forceSkipConcurrencyCheck = false) => {
    if (!user?.id || sessionEarnings <= 0) return false;

    // Prevent concurrent saves unless forced
    if (isSavingToDb && !forceSkipConcurrencyCheck) {
      // Skipping save - already saving to DB
      return false;
    }

    // Prevent rapid auto-saves (minimum 10 seconds between auto-saves)
    const now = Date.now();
    if (!forceSkipConcurrencyCheck && now - lastAutoSaveRef.current < 10000) {
      // Skipping auto-save - too frequent
      return false;
    }

    setIsSavingToDb(true);
    const currentSessionEarnings = sessionEarnings;

    try {
      // Calculate new total: existing DB rewards + current session earnings
      const newDbTotal = dbUnclaimedRewards + currentSessionEarnings;

      const response = await fetch("/api/unclaimed-rewards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount: newDbTotal }),
      });

      if (response.ok) {
        // Saved session earnings to DB

        // Update local state to reflect the save
        setDbUnclaimedRewards(newDbTotal);
        setLastSavedSessionEarnings(currentSessionEarnings);
        lastAutoSaveRef.current = now;

        // Clear session earnings since they're now saved to DB
        dispatch(resetSessionEarnings());

        return true;
      } else {
        // Failed to save session earnings to DB
        return false;
      }
    } catch (error) {
      // Error saving session earnings to DB
      return false;
    } finally {
      setIsSavingToDb(false);
    }
  };

  // FIX: NEW - Real-time uptime monitoring with immediate auto-stop
  const startUptimeMonitoring = useCallback(() => {
    if (!selectedNodeId || !isDeviceRunning(selectedNodeId)) return null;

    // Starting real-time uptime monitoring for auto-stop

    const monitoringInterval = setInterval(async () => {
      try {
        const currentUptime = getCurrentUptime(selectedNodeId);
        const maxUptime = getMaxUptime();
        const remainingTime = maxUptime - currentUptime;

        // FIX: Immediate auto-stop when limit is reached
        if (currentUptime >= maxUptime && !autoStopInProgressRef.current) {
          // UPTIME LIMIT EXCEEDED - IMMEDIATE AUTO-STOP TRIGGERED

          autoStopInProgressRef.current = true;
          setIsStopping(true);

          try {
            // Save session earnings before stopping
            if (sessionEarnings > 0) {
              // Auto-stop: Saving session earnings to DB
              const saveSuccess = await saveSessionEarningsToDb(true);
              if (!saveSuccess) {
                // Failed to save session earnings before auto-stopping node
              }
            }

            // Update device status to offline
            await updateDeviceStatus(selectedNodeId, "offline");

            // Stop uptime tracking and update server
            const result = await stopDeviceUptime(selectedNodeId);

            if (result.success) {
              // Node auto-stopped and uptime updated successfully
            } else {
              // Failed to update uptime during auto-stop
            }

            // Stop Redux state and tasks
            dispatch(stopNode());
            dispatch(resetTasks());

            setShowUptimeLimitDialog(true);
            // Auto-stop completed
          } catch (error) {
            // Error during auto-stop
          } finally {
            setIsStopping(false);
            autoStopInProgressRef.current = false;
          }

          // Clear the monitoring interval
          clearInterval(monitoringInterval);
          return;
        }

        // FIX: Early warning system
        if (remainingTime <= 60 && remainingTime > 0) {
          // WARNING: Approaching auto-stop time
        }

        // FIX: Sync with server when approaching limit (within 2 minutes or 95% of limit)
        if (remainingTime <= 120 || currentUptime >= maxUptime * 0.95) {
          // Approaching uptime limit - syncing with server
          await syncDeviceUptime(selectedNodeId, true);
        }
      } catch (error) {
        // Error in uptime monitoring
      }
    }, 30000); // FIXED: Reduced from 5s to 30s to cut API calls by 6x

    return monitoringInterval;
  }, [
    selectedNodeId,
    isDeviceRunning,
    getCurrentUptime,
    getMaxUptime,
    sessionEarnings,
    saveSessionEarningsToDb,
    updateDeviceStatus,
    stopDeviceUptime,
    syncDeviceUptime,
  ]);

  // FIX: Enhanced auto-stop logic with real-time monitoring
  useEffect(() => {
    if (!selectedNodeId) return;

    let monitoringInterval: NodeJS.Timeout | null = null;

    const checkAndSetupMonitoring = async () => {
      // FIX: Check if device is running and start monitoring
      if (isDeviceRunning(selectedNodeId) || node.isActive) {
        console.log("🔄 Device is running - starting uptime monitoring...");
        monitoringInterval = startUptimeMonitoring();
      }

      // FIX: Also check current uptime status for immediate action
      const isUptimeExceeded = await checkUptimeLimit(false);
      setUptimeExceeded(isUptimeExceeded);

      // FIX: Immediate auto-stop if already exceeded and device is running
      if (
        isUptimeExceeded &&
        (isDeviceRunning(selectedNodeId) || node.isActive) &&
        !autoStopInProgressRef.current
      ) {
        console.log("🚨 UPTIME ALREADY EXCEEDED - IMMEDIATE AUTO-STOP");

        autoStopInProgressRef.current = true;
        setIsStopping(true);

        try {
          // Save session earnings before stopping
          if (sessionEarnings > 0) {
            console.log(
              "🛑 Auto-stop: Saving session earnings to DB:",
              sessionEarnings
            );
            const saveSuccess = await saveSessionEarningsToDb(true);
            if (!saveSuccess) {
              console.error(
                "❌ Failed to save session earnings before auto-stopping node"
              );
            }
          }

          // Update device status to offline
          await updateDeviceStatus(selectedNodeId, "offline");

          // Stop uptime tracking and update server
          const result = await stopDeviceUptime(selectedNodeId);

          if (result.success) {
            console.log("✅ Node auto-stopped and uptime updated successfully");
          } else {
            console.error(
              "❌ Failed to update uptime during auto-stop:",
              result.error
            );
          }

          // Stop Redux state and tasks
          dispatch(stopNode());
          dispatch(resetTasks());

          setShowUptimeLimitDialog(true);
        } catch (error) {
          console.error("❌ Error during immediate auto-stop:", error);
        } finally {
          setIsStopping(false);
          autoStopInProgressRef.current = false;
        }
      }
    };

    checkAndSetupMonitoring();
    setDeviceLimitExceeded(checkDeviceLimit());

    // FIX: Cleanup monitoring interval on unmount or when device changes
    return () => {
      if (monitoringInterval) {
        clearInterval(monitoringInterval);
        console.log("🔄 Stopped uptime monitoring");
      }
    };
  }, [
    selectedNodeId,
    node.isActive,
    sessionEarnings
  ]);

  // REMOVED: Duplicate backup monitoring interval to fix resource leak
  // The main monitoring interval above already handles uptime limit checking

  // FIX: Enhanced unclaimed rewards management with comprehensive state clearing
  const resetAllUnclaimedRewards = async () => {
    if (!user?.id) return false;

    try {
      const response = await fetch("/api/unclaimed-rewards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount: 0 }),
      });

      if (response.ok) {
        console.log("✅ Reset all unclaimed rewards to 0");
        
        // FIX: CRITICAL - Clear ALL state immediately to prevent any double claiming
        setDbUnclaimedRewards(0);
        setLastSavedSessionEarnings(0);
        dispatch(resetSessionEarnings());
        
        // FIX: Force clear any pending state updates
        setTimeout(() => {
          setDbUnclaimedRewards(0);
          setLastSavedSessionEarnings(0);
          dispatch(resetSessionEarnings());
        }, 100);
        
        return true;
      } else {
        console.error("❌ Failed to reset unclaimed rewards:", response.status);
        return false;
      }
    } catch (error) {
      console.error("❌ Error resetting unclaimed rewards:", error);
      return false;
    }
  };

  // FIX: Enhanced mount effect with migration and session verification
  useEffect(() => {
    setIsMounted(true);

    // FIX: Clean up old storage keys on mount
    const migrateOldData = () => {
      const oldKeys = [
        "_device_metrics_store",
        "_device_metrics_store_v1",
        "_device_metrics_store_v2",
      ];

      oldKeys.forEach((key) => {
        try {
          const oldData = localStorage.getItem(key);
          if (oldData) {
            console.log(`🔄 Removing old uptime data: ${key}`);
            localStorage.removeItem(key);
          }
        } catch (error) {
          console.error(`Failed to remove old data ${key}:`, error);
        }
      });
    };

    // Initialize session management - store any session token in localStorage
    const sessionToken = localStorage.getItem("device_session_token");
    const sessionDeviceId = localStorage.getItem("device_session_deviceId");
    
    if (sessionToken && sessionDeviceId) {
      console.log(`🔑 Found stored session token for device: ${sessionDeviceId}`);
      setDeviceSessionToken(sessionToken);
    }

    migrateOldData();

    // Initialize broadcast channel for cross-tab communication
    try {
      if (typeof window !== 'undefined' && window.BroadcastChannel) {
        const channel = new BroadcastChannel('neuroswarm_device_session');
        
                 // Set up event listener for messages from other tabs
         channel.onmessage = async (event) => {
           const { action, deviceId, sessionToken, owner, recovered, final, ownerTabId } = event.data;
           
           console.log(`📡 Broadcast received: ${action} for device ${deviceId || 'unknown'}`);
           
           // Handle different message types
           if (action === 'device_active' && deviceId) {
             // Another tab is running this device
             if (deviceId === selectedNodeId) {
               console.log(`⚠️ Device ${deviceId} is now active in another tab`);
               setSessionExists(true);
               
               // Check if this is our own session announcement
               const currentTabId = getTabId();
               const isOurSession = ownerTabId && ownerTabId === currentTabId;
               
               if (isOurSession) {
                 // This is our own session announcement - ignore
                 console.log(`ℹ️ Ignoring our own session announcement for device ${deviceId}`);
                 return;
               }
               
               // If the other tab claims ownership of the session
               if (owner) {
                 setSessionVerified(false);
                 
                 // CRITICAL FIX: Always make sure to stop task processing if another tab owns the session
                 if (node.isActive) {
                   console.log(`🛑 IMMEDIATE STOP: Device ${deviceId} in this tab due to activity elsewhere`);
                   dispatch(stopNode());
                   dispatch(resetTasks());
                   
                   // FIXED: Remove intrusive alerts for session changes during in-app navigation
                  if (!recovered) {
                    console.log("🔄 Node session was started in another tab or browser.");
                  }
                 }
               }
             }
                      } else if (action === 'device_inactive' && deviceId) {
             // Device was stopped in another tab
             if (deviceId === selectedNodeId) {
               console.log(`🟢 Device ${deviceId} is now inactive in all tabs`);
               setSessionExists(false);
               setSessionVerified(false);
               
               // CRITICAL FIX: Stop uptime tracking and Redux state in ALL tabs
               if (node.isActive || isDeviceRunning(deviceId)) {
                 console.log(`🛑 Stopping node and uptime in this tab due to device_inactive broadcast`);
                 
                 // Stop Redux state and tasks
                 dispatch(stopNode());
                 dispatch(resetTasks());
                 
                 // Stop uptime tracking
                 try {
                   await stopDeviceUptime(deviceId);
                 } catch (error) {
                   console.error("❌ Error stopping uptime in broadcast handler:", error);
                 }
               }
               
               // If it's a final message (tab closing), refresh state from server to be sure
               if (final) {
                 setTimeout(async () => {
                   const sessionCheck = await checkDeviceSession(deviceId);
                   setSessionExists(sessionCheck.hasActiveSession);
                   
                   // Also sync uptime to ensure consistency
                   if (!sessionCheck.hasActiveSession) {
                     try {
                       await syncDeviceUptime(deviceId, true);
                     } catch (error) {
                       console.error("❌ Error syncing uptime after session check:", error);
                     }
                   }
                 }, 1000);
               }
             }
           } else if (action === 'verify_sessions') {
             // Respond with active session info if we have one AND we are the verified owner
             const currentTabId = getTabId();
             const sessionOwnerTabId = localStorage.getItem("session_owner_tab_id");
             
             if (sessionVerified && deviceSessionToken && selectedNodeId && sessionOwnerTabId === currentTabId) {
               console.log(`🔐 Responding to session verification request - we own ${selectedNodeId}`);
               channel.postMessage({
                 action: 'session_info',
                 deviceId: selectedNodeId,
                 sessionToken: deviceSessionToken,
                 owner: true,
                 ownerTabId: currentTabId
               });
             }
                      } else if (action === 'session_info' && deviceId && owner) {
             // Another tab has reported that it owns the session for this device
             if (deviceId === selectedNodeId) {
               console.log(`ℹ️ Received session info from another tab for device ${deviceId}`);
               
               // Update our state to reflect that we don't own this session
               setSessionExists(true);
               setSessionVerified(false);
               
               // CRITICAL FIX: Always stop task processing and uptime tracking immediately
               if (node.isActive || isDeviceRunning(deviceId)) {
                 console.log(`🛑 IMMEDIATE STOP: Device ${deviceId} in this tab as another tab owns it`);
                 dispatch(stopNode());
                 dispatch(resetTasks());
                 
                 // Also stop local uptime tracking
                 try {
                   await stopDeviceUptime(deviceId);
                 } catch (error) {
                   console.error("❌ Error stopping uptime after session_info:", error);
                 }
               }
             }
           } else if (action === 'session_recovery_attempt' && deviceId) {
             // Another tab is trying to recover a session
             const currentTabId = getTabId();
             const sessionOwnerTabId = localStorage.getItem("session_owner_tab_id");
             
             if (deviceId === selectedNodeId && sessionVerified && deviceSessionToken && sessionOwnerTabId === currentTabId) {
               // We already own this session, notify the other tab
               console.log(`🛑 Blocking session recovery attempt for device ${deviceId} - we own it`);
               channel.postMessage({
                 action: 'session_info',
                 deviceId: selectedNodeId,
                 sessionToken: deviceSessionToken,
                 owner: true,
                 ownerTabId: currentTabId
               });
             }
           } else if (action === 'session_invalid' && deviceId) {
            // Session was determined to be invalid
            if (deviceId === selectedNodeId) {
              // If we were verified, but the session is now invalid, update our state
              if (sessionVerified) {
                console.log(`⚠️ Our session for device ${deviceId} is now invalid`);
                setSessionVerified(false);
                
                // If we think we're running this device, stop it
                if (node.isActive) {
                  dispatch(stopNode());
                  dispatch(resetTasks());
                }
              }
            }
                     } else if (action === 'new_tab_detected' && deviceId) {
             // A new tab has been opened and detected an active session
             const currentTabId = getTabId();
             const sessionOwnerTabId = localStorage.getItem("session_owner_tab_id");
             
             if (deviceId === selectedNodeId && sessionVerified && sessionOwnerTabId === currentTabId) {
               // We're the owner of this session, so respond to confirm our ownership
               console.log(`📣 New tab detected - confirming our ownership of device ${deviceId}`);
               channel.postMessage({
                 action: 'session_info',
                 deviceId: selectedNodeId,
                 sessionToken: deviceSessionToken,
                 owner: true,
                 ownerTabId: currentTabId,
                 // This flag tells the new tab not to show an alert
                 newTabResponse: true
               });
             }
                      } else if (action === 'check_node_status') {
             // Someone is asking about all running nodes - respond if we have an active one
             const currentTabId = getTabId();
             const sessionOwnerTabId = localStorage.getItem("session_owner_tab_id");
             
             if (sessionVerified && deviceSessionToken && selectedNodeId && node.isActive && sessionOwnerTabId === currentTabId) {
               console.log(`📊 Responding to node status check - we have active node ${selectedNodeId}`);
               channel.postMessage({
                 action: 'node_status_update',
                 deviceId: selectedNodeId,
                 sessionToken: deviceSessionToken,
                 isActive: true,
                 owner: true,
                 ownerTabId: currentTabId
               });
             }
           }
        };
        
        setBroadcastChannel(channel);
        
        // Notify other tabs about our arrival and query for active sessions
        channel.postMessage({
          action: 'verify_sessions'
        });
        
        return () => {
          // Clean up broadcast channel on unmount
          channel.close();
        };
      }
    } catch (error) {
      console.error('Failed to initialize broadcast channel:', error);
    }
  }, [dispatch, node.isActive, selectedNodeId, sessionVerified, deviceSessionToken]);

  // FIX: Enhanced earnings loading with migration check
  useEffect(() => {
    if (user?.id && isMounted) {
      // Loading user earnings and unclaimed rewards
      loadTotalEarnings();
      fetchUnclaimedRewards();
    }
  }, [user?.id, isMounted]);

  // FIX: CRITICAL - Monitor total rewards and auto-clear state when zero
  useEffect(() => {
    const totalRewards = sessionEarnings + dbUnclaimedRewards;
    
    // FIX: Auto-clear state when rewards reach zero to prevent any double claiming
    if (totalRewards <= 0.01 && (sessionEarnings > 0 || dbUnclaimedRewards > 0)) {
      console.log("🔄 Auto-clearing reward state - total rewards reached zero");
      setDbUnclaimedRewards(0);
      setLastSavedSessionEarnings(0);
      dispatch(resetSessionEarnings());
    }
  }, [sessionEarnings, dbUnclaimedRewards]);

  // FIX: Enhanced auto-save with better concurrency control
  useEffect(() => {
    if (!user?.id || sessionEarnings <= 0 || !node.isActive) return;

    // CRITICAL FIX: Reduced auto-save frequency to 5 minutes for resource optimization
    const autoSaveInterval = setInterval(() => {
      if (node.isActive || isDeviceRunning(selectedNodeId)) {
        const timeSinceLastSave = Date.now() - lastAutoSaveRef.current;

        // CRITICAL FIX: Only auto-save if enough time has passed and not currently saving
        if (timeSinceLastSave >= 300000 && !isSavingToDb) { // 5 minutes instead of 2 minutes
          console.log(
            "🔄 Auto-save interval triggered - Session earnings:",
            sessionEarnings
          );
          saveSessionEarningsToDb(false);
        }
      }
    }, 300000); // CRITICAL FIX: 5 minutes instead of 45 seconds - Reduces API calls by 6.7x

    return () => {
      clearInterval(autoSaveInterval);
      console.log("🔄 Auto-save interval cleared");
    };
  }, [sessionEarnings, user?.id, node.isActive, selectedNodeId, isSavingToDb]);

  // Show claim success message after successful claim
  useEffect(() => {
    if (claimSuccess) {
      setShowClaimSuccess(true);
      const timer = setTimeout(() => {
        setShowClaimSuccess(false);
        resetClaimState();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [claimSuccess, resetClaimState]);

  // FIX: Enhanced page unload handling - DISABLE all navigation alerts for in-app routing
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // CRITICAL FIX: COMPLETELY DISABLE navigation alerts
      // Let nodes run in background during navigation
      
      // NEVER prevent navigation - no event.preventDefault() calls
      // Only save earnings silently without blocking ANY navigation
      if (sessionEarnings > 0) {
        try {
          const newDbTotal = dbUnclaimedRewards + sessionEarnings;
          const data = JSON.stringify({ amount: newDbTotal });
          const blob = new Blob([data], { type: "application/json" });
          navigator.sendBeacon("/api/unclaimed-rewards", blob);
        } catch (error) {
          console.error("❌ Error saving earnings:", error);
        }
      }
      
      // Session cleanup for tab closing only
      if (selectedNodeId && sessionVerified && sessionExists) {
        try {
          const cleanupData = JSON.stringify({
            deviceId: selectedNodeId,
            sessionToken: deviceSessionToken
          });
          const blob = new Blob([cleanupData], { type: "application/json" });
          navigator.sendBeacon("/api/device-session/cleanup", blob);
          
          if (broadcastChannel) {
            try {
              broadcastChannel.postMessage({
                action: 'device_inactive',
                deviceId: selectedNodeId,
                final: true,
                tabClosing: true,
                timestamp: Date.now()
              });
            } catch (broadcastError) {
              // Ignore errors during page unload
            }
          }
        } catch (error) {
          console.error("❌ Error in session cleanup:", error);
        }
      }
      
      // NEVER return a message - allow all navigation
      return undefined;
    };

    // NEW: Handle tab close/unload event to reset device status
    const handleUnload = (event: Event) => {
      // Check if node is running and we have a selected device
      if ((node.isActive || (selectedNodeId && isDeviceRunning(selectedNodeId))) && selectedNodeId) {
        console.log(`🔄 Tab closing: Resetting device status for ${selectedNodeId}`);
        
        try {
          // Create payload for device status reset
          const resetData = {
            deviceId: selectedNodeId,
            userId: user?.id || "unknown",
            action: "reset_status",
            timestamp: Date.now()
          };
          
          // Use sendBeacon for reliable delivery during tab close
          const blob = new Blob([JSON.stringify(resetData)], { type: "application/json" });
          const beaconSent = navigator.sendBeacon("/api/close", blob);
          
          console.log(`📤 Tab close beacon sent: ${beaconSent} for device ${selectedNodeId}`);
          
          // Also try to save any unsaved earnings
          if (sessionEarnings > 0) {
            const earningsData = JSON.stringify({ 
              amount: dbUnclaimedRewards + sessionEarnings,
              deviceId: selectedNodeId,
              userId: user?.id || "unknown"
            });
            const earningsBlob = new Blob([earningsData], { type: "application/json" });
            navigator.sendBeacon("/api/unclaimed-rewards", earningsBlob);
            console.log(`💰 Tab close: Saved earnings beacon sent`);
          }
          
        } catch (error) {
          console.error("❌ Error in tab close handler:", error);
        }
      }
    };

    const handleVisibilityChange = async () => {
      // When page becomes visible, check if our session is still valid
      if (document.visibilityState === "visible" && selectedNodeId) {
        console.log("🔍 Page visible: Checking session validity...");
        
        try {
          // Notify other tabs we're back and check for session status
          if (broadcastChannel) {
            console.log("📢 Broadcasting tab activation");
            broadcastChannel.postMessage({
              action: 'verify_sessions'
            });
          }
          
          // Check if the session is still valid after returning to the page
          if (deviceSessionToken && sessionExists) {
            const isValid = await verifySessionOwnership(selectedNodeId, deviceSessionToken);
            
            // If we've lost our session while away, update the UI
            if (!isValid && sessionVerified) {
              console.log("⚠️ Session was invalidated while tab was inactive");
              setSessionVerified(false);
              
              // If our Redux state thinks the node is active but session is invalid,
              // update Redux state to inactive
              if (node.isActive) {
                dispatch(stopNode());
                dispatch(resetTasks());
                
                // FIXED: Remove alert for in-app navigation - only log to console
                console.log("🛑 Node session was stopped in another tab or browser.");
              }
            } else if (isValid && sessionVerified) {
                             // We still own the session, broadcast to other tabs
               if (broadcastChannel) {
                 const currentTabId = getTabId();
                 broadcastChannel.postMessage({
                   action: 'device_active',
                   deviceId: selectedNodeId,
                   sessionToken: deviceSessionToken,
                   owner: true,
                   ownerTabId: currentTabId,
                   timestamp: Date.now()
                 });
               }
            }
          } else if (selectedNodeId) {
            // Also check with server directly for the latest status
            const sessionCheck = await checkDeviceSession(selectedNodeId);
            
            // Update our state based on server check
            if (sessionCheck.hasActiveSession !== sessionExists) {
              console.log(`🔄 Updating session status from server: active=${sessionCheck.hasActiveSession}`);
              setSessionExists(sessionCheck.hasActiveSession);
              
              // CRITICAL FIX: Only reset sessionVerified if we don't own this session
              const currentTabId = getTabId();
              const sessionOwnerTabId = localStorage.getItem("session_owner_tab_id");
              const storedToken = localStorage.getItem("device_session_token");
              
              // Keep verification true if this tab still owns the session
              if (!(currentTabId && sessionOwnerTabId === currentTabId && storedToken)) {
                setSessionVerified(false);  // Only reset if we don't own it
              }
            }
          }
        } catch (error) {
          console.error("❌ Error checking session validity:", error);
        }
      }
      
      // When page hides and we have unsaved earnings, save them
      if (document.visibilityState === "hidden" && sessionEarnings > 0) {
        console.log(
          "📱 Page hidden: Saving session earnings:",
          sessionEarnings
        );

        // FIX: Force save with timeout protection
        try {
          const savePromise = saveSessionEarningsToDb(true);
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Save timeout")), 5000)
          );

          await Promise.race([savePromise, timeoutPromise]);
        } catch (error) {
          console.error("❌ Failed to save on visibility change:", error);
        }
      }
    };
    
         // Enhanced session recovery for page reload/navigation with broadcast channel support
     const attemptSessionRecovery = async () => {
       const storedDeviceId = localStorage.getItem("device_session_deviceId");
       const storedToken = localStorage.getItem("device_session_token");
       const sessionOwnerTabId = localStorage.getItem("session_owner_tab_id");
       const currentTabId = getTabId();
       
       // CRITICAL FIX: Only attempt recovery if this tab was the original owner
       if (storedDeviceId && storedToken && selectedNodeId === storedDeviceId && sessionOwnerTabId === currentTabId) {
         console.log(`🔄 Attempting to recover session for device: ${storedDeviceId} (owner tab)`);
         
         try {
           // First query all tabs to see if someone else already has this session
           if (broadcastChannel) {
             console.log(`📢 Broadcasting session recovery attempt for device ${storedDeviceId}`);
             broadcastChannel.postMessage({
               action: 'session_recovery_attempt',
               deviceId: storedDeviceId,
               sessionToken: storedToken,
               ownerTabId: currentTabId
             });
             
             // Short delay to allow other tabs to respond
             await new Promise(resolve => setTimeout(resolve, 300));
           }
           
           // Then verify with the server
           const isValid = await verifySessionOwnership(storedDeviceId, storedToken);
           
           if (isValid) {
             console.log(`✅ Successfully recovered session for device ${storedDeviceId}`);
             setDeviceSessionToken(storedToken);
             setSessionVerified(true);
             setSessionExists(true);
             
             // Update Redux state to reflect the active session
             if (!node.isActive) {
               dispatch(startNode());
             }
             
             // Make sure we reconnect to the right session
             await syncDeviceUptime(storedDeviceId, true);
             
             // Verify device is still marked as busy on the server
             await updateDeviceStatus(storedDeviceId, "busy", true);
             
             // Broadcast to other tabs that we own this session now
             if (broadcastChannel) {
               broadcastChannel.postMessage({
                 action: 'device_active',
                 deviceId: storedDeviceId,
                 sessionToken: storedToken,
                 owner: true,
                 recovered: true,
                 ownerTabId: currentTabId
               });
             }
           } else {
             console.log(`⚠️ Could not verify session ownership for stored token`);
             // Clear invalid session data
             localStorage.removeItem("device_session_token");
             localStorage.removeItem("device_session_deviceId");
             localStorage.removeItem("session_owner_tab_id");
             
             // Broadcast that this session is invalid
             if (broadcastChannel) {
               broadcastChannel.postMessage({
                 action: 'session_invalid',
                 deviceId: storedDeviceId
               });
             }
           }
         } catch (error) {
           console.error("❌ Error during session recovery:", error);
         }
       } else if (storedDeviceId && storedToken && sessionOwnerTabId !== currentTabId) {
         console.log(`⚠️ Found session data but this tab is not the owner - ignoring recovery`);
       }
     };
    
    // Try to recover session when component mounts
    if (selectedNodeId && !sessionVerified && sessionCheckComplete) {
      attemptSessionRecovery();
    }

    // Add event listeners for page unload and tab close
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("unload", handleUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("unload", handleUnload);
    };
  }, [
    sessionEarnings, 
    dbUnclaimedRewards, 
    selectedNodeId, 
    sessionVerified, 
    sessionExists, 
    deviceSessionToken,
    sessionCheckComplete,
    node.isActive
  ]);

  // For demo purposes - in a real implementation this would be derived from the selected node ID
  const selectedNode = nodes.find((node) => node.id === selectedNodeId);

  // FIX: Enhanced uptime display with server sync priority
  useEffect(() => {
    if (!selectedNodeId) return;

    const updateDisplayUptime = () => {
      const currentDeviceUptime = getCurrentUptime(selectedNodeId);
      setDisplayUptime(currentDeviceUptime);
    };

    // Update immediately
    updateDisplayUptime();

    // CRITICAL FIX: Update every 1 second for smooth uptime display
    const interval = setInterval(updateDisplayUptime, 1000); // Update every 1 second for smooth timer

    return () => clearInterval(interval);
  }, [selectedNodeId, getCurrentUptime]);

  // FIX: IMPROVED device sync when selected with debouncing and proper error handling
  useEffect(() => {
    if (!selectedNodeId || isDeviceRunning(selectedNodeId)) return;

    // Clear previous timeout
    if (deviceSyncTimeoutRef.current) {
      clearTimeout(deviceSyncTimeoutRef.current);
    }

    // FIX: Debounced sync with better error handling
    deviceSyncTimeoutRef.current = setTimeout(async () => {
      try {
        setSyncingDeviceId(selectedNodeId);
        console.log(`🔄 Syncing uptime for selected device: ${selectedNodeId}`);

        await syncDeviceUptime(selectedNodeId, false);
        setLastSyncTime(Date.now());

        console.log(`✅ Sync completed for device: ${selectedNodeId}`);
      } catch (error) {
        console.error(`❌ Sync failed for device ${selectedNodeId}:`, error);
      } finally {
        setSyncingDeviceId(null);
      }
    }, 300); // FIX: 300ms debounce to prevent rapid calls

    return () => {
      if (deviceSyncTimeoutRef.current) {
        clearTimeout(deviceSyncTimeoutRef.current);
      }
    };
  }, [selectedNodeId]);

  // FIX: Enhanced device initialization with proper server sync, migration, and session verification
  useEffect(() => {
    if (!user?.id || hasFetchedDevices) return;

    // CRITICAL: Prevent race conditions with immediate state update
    setHasFetchedDevices(true);

    const fetchUserDevices = async () => {
      setIsLoadingDevices(true);
      console.log("🔄 Starting device fetch and initialization...");

      try {
        const response = await fetch("/api/devices", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          console.error(
            "Error fetching devices:",
            response.status,
            response.statusText
          );
          return;
        }

        const { devices } = await response.json();
        console.log(`📱 Fetched ${devices.length} devices from server`);

        // Look for any device with an active session
        let activeSessionDevice: SupabaseDevice | undefined;
        const hasActiveSession = devices.some((device: SupabaseDevice) => {
          const isActive = device.status === "busy" && device.session_token;
          if (isActive) {
            activeSessionDevice = device;
            // Store active session token for later verification
            const storedDeviceId = localStorage.getItem("device_session_deviceId");
            const storedToken = localStorage.getItem("device_session_token");
            
            // Only update if different to avoid unnecessary rerenders
            if (storedDeviceId !== device.id || storedToken !== device.session_token) {
              console.log(`🔑 Found active session for device ${device.id}`);
              localStorage.setItem("device_session_deviceId", device.id);
              localStorage.setItem("device_session_token", device.session_token || "");
              setDeviceSessionToken(device.session_token);
            }
          }
          return isActive;
        });

        if (activeSessionDevice) {
          console.log(`🚨 Device ${activeSessionDevice.id} has an active session`);
          setSessionExists(true);
          
          // CRITICAL FIX: If Redux state thinks we're active but we don't own the session,
          // immediately stop task processing to prevent double counting
          if (node.isActive) {
            console.log(`⚠️ New tab loaded with active node state but session exists elsewhere - stopping tasks`);
            dispatch(stopNode());
            dispatch(resetTasks());
          }
          
          // Broadcast to existing tabs that we've detected this session
          if (broadcastChannel) {
            broadcastChannel.postMessage({
              action: 'new_tab_detected',
              deviceId: activeSessionDevice.id
            });
          }
        }

        const mappedNodes: NodeInfo[] = devices.map(
          (device: SupabaseDevice) => ({
            id: device.id,
            name:
              device.device_name ||
              `My ${
                device.device_type.charAt(0).toUpperCase() +
                device.device_type.slice(1)
              }`,
            type: device.device_type,
            rewardTier: device.reward_tier || "cpu",
            status:
              device.status === "busy"
                ? "running"
                : device.status === "offline"
                ? "idle"
                : "offline",
            gpuInfo: device.gpu_model,
          })
        );

        setNodes(mappedNodes);

        // Register existing devices in Redux store
        if (devices.length > 0 && !node.isRegistered) {
          const firstDevice = devices[0];
          const hardwareInfo: HardwareInfo = {
            gpuInfo: firstDevice.gpu_model,
            rewardTier: firstDevice.reward_tier || "cpu",
            deviceType: firstDevice.device_type,
            cpuCores: 4,
            deviceMemory: "8GB",
            deviceGroup:
              firstDevice.device_type === "mobile" ||
              firstDevice.device_type === "tablet"
                ? "mobile_tablet"
                : "desktop_laptop",
          };
          dispatch(registerDevice(hardwareInfo));
        }

        // FIX: CRITICAL - Sequential device initialization with server-authoritative uptime
        for (const mappedNode of mappedNodes) {
          if (!initializedDevicesRef.current.has(mappedNode.id)) {
            const serverDevice = devices.find(
              (d: SupabaseDevice) => d.id === mappedNode.id
            );
            const serverUptime = Number(serverDevice?.uptime) || 0;

            console.log(
              `🔧 Initializing device ${mappedNode.id} with SERVER uptime: ${serverUptime}s`
            );

            // Initialize with server uptime as the ONLY source of truth
            await initializeDeviceUptime(mappedNode.id, serverUptime);
            initializedDevicesRef.current.add(mappedNode.id);

            // FIX: Small delay between device initializations to prevent conflicts
            await new Promise((resolve) => setTimeout(resolve, 150));
          }
        }

        // FIX: Force sync all devices after initialization to ensure accuracy
        console.log("🔄 Post-initialization sync for all devices...");
        for (const mappedNode of mappedNodes) {
          setTimeout(() => {
            syncDeviceUptime(mappedNode.id, true); // Force sync
          }, 100 * mappedNodes.indexOf(mappedNode)); // Stagger syncs
        }

                 // If there's an active session, select that device first
         if (activeSessionDevice) {
           setSelectedNodeId(activeSessionDevice.id);
           
           // CRITICAL FIX: New tabs should NEVER claim ownership automatically
           // Only verify ownership if this tab has a specific ownership marker
           const currentTabId = getTabId();
           const sessionOwnerTabId = localStorage.getItem("session_owner_tab_id");
           const storedDeviceId = localStorage.getItem("device_session_deviceId");
           
           console.log(`🔍 Tab ownership check - Current: ${currentTabId}, Owner: ${sessionOwnerTabId}, Device: ${storedDeviceId}`);
           
           if (deviceSessionToken && sessionOwnerTabId === currentTabId && storedDeviceId === activeSessionDevice.id) {
             // This tab is marked as the session owner, verify with server
             const isValid = await verifySessionOwnership(
               activeSessionDevice.id,
               deviceSessionToken
             );
             setSessionVerified(isValid);
             
             if (isValid) {
               console.log(`✅ Current tab owns the active session for device ${activeSessionDevice.id}`);
               
               // If we own the session but Redux state isn't active, update it
               if (!node.isActive) {
                 dispatch(startNode());
               }
             } else {
               console.log(`⚠️ Session ownership verification failed - clearing ownership`);
               // Clear invalid ownership markers
               localStorage.removeItem("session_owner_tab_id");
               localStorage.removeItem("device_session_token");
               localStorage.removeItem("device_session_deviceId");
               setSessionVerified(false);
               
               // Ensure tasks are stopped if we don't own the session
               if (node.isActive) {
                 dispatch(stopNode());
                 dispatch(resetTasks());
               }
             }
           } else {
             // This tab is NOT the session owner
             console.log(`⚠️ New tab detected active session but not claiming ownership - other tab owns it`);
             setSessionVerified(false);
             setSessionExists(true);
             
             // Ensure Redux state is inactive for new tabs
             if (node.isActive) {
               console.log(`🛑 Stopping node in new tab - session owned elsewhere`);
               dispatch(stopNode());
               dispatch(resetTasks());
             }
           }
         } else if (mappedNodes.length > 0 && !selectedNodeId) {
           setSelectedNodeId(mappedNodes[0].id);
         }

        setHasFetchedDevices(true);
        setSessionCheckComplete(true);
        console.log(
          "✅ All devices initialized with server-authoritative uptime"
        );
      } catch (err) {
        console.error("Exception while fetching devices:", err);
        setSessionCheckComplete(true);
      } finally {
        setIsLoadingDevices(false);
      }
    };

    fetchUserDevices();
  }, [user?.id, hasFetchedDevices, initializeDeviceUptime, syncDeviceUptime, deviceSessionToken, node.isActive, node.isRegistered, dispatch, broadcastChannel]);

  // FIX: Enhanced node selection with better validation, session verification, and broadcast channel
  const handleNodeSelect = async (nodeId: string) => {
    if (nodeId === selectedNodeId) return;
    
    // FIXED: Allow device switching for viewing without intrusive alerts
    // Only stop if actually trying to start a different device while one is running
    if ((node.isActive || isDeviceRunning(selectedNodeId)) && nodeId !== selectedNodeId) {
      console.log(`🔄 Switching device view from ${selectedNodeId} to ${nodeId}`);
      
      // Stop the current node before switching
      console.log(`🛑 Stopping current node before device switch: ${selectedNodeId}`);
      setIsStopping(true);
      
      try {
        // Save any unsaved session earnings
        if (sessionEarnings > 0) {
          console.log("🛑 Device switch: Saving session earnings to DB:", sessionEarnings);
          const saveSuccess = await saveSessionEarningsToDb(true);
          if (!saveSuccess) {
            console.error("❌ Failed to save session earnings before device switch");
          }
        }

        // Update device status to offline
        await updateDeviceStatus(selectedNodeId, "offline");

        // Stop uptime tracking and update server
        const result = await stopDeviceUptime(selectedNodeId);
        if (result.success) {
          console.log("✅ Node stopped for device switch");
        } else {
          console.error("❌ Failed to update uptime during device switch:", result.error);
        }

        // Stop Redux state and tasks
        dispatch(stopNode());
        dispatch(resetTasks());

        // Clear session data
        localStorage.removeItem("device_session_token");
        localStorage.removeItem("device_session_deviceId");
        localStorage.removeItem("session_owner_tab_id");
        setDeviceSessionToken(null);
        setSessionVerified(false);
        setSessionExists(false);

        // Broadcast to other tabs
        if (broadcastChannel) {
          broadcastChannel.postMessage({
            action: 'device_inactive',
            deviceId: selectedNodeId,
            stoppedByUser: true,
            timestamp: Date.now()
          });
        }
      } catch (error) {
        console.error("❌ Error stopping node for device switch:", error);
      } finally {
        setIsStopping(false);
      }
    }
    
    // Allow switching devices for viewing purposes
    console.log(`🔄 Switching to device: ${nodeId}`);
    setSelectedNodeId(nodeId);

    // Track device selection
    const selectedDevice = nodes.find((node) => node.id === nodeId);
    if (selectedDevice) {
      trackEvent("device_selected", "device_management", selectedDevice.type);
    }
    
    // Check if the device has an active session
    const { hasActiveSession, sessionToken } = await checkDeviceSession(nodeId);
    
    if (hasActiveSession) {
      setSessionExists(true);
      
      // If we have a stored session token, check if we own it
      const storedToken = localStorage.getItem("device_session_token");
      if (storedToken && storedToken === sessionToken) {
        console.log(`🔑 Found matching session token for device ${nodeId}`);
        
        // Verify session ownership
        const isValid = await verifySessionOwnership(nodeId, storedToken);
        setSessionVerified(isValid);
        
        if (isValid) {
          console.log(`✅ Current tab owns the active session for device ${nodeId}`);
          
          // Update Redux state to reflect active session
          if (!node.isActive) {
            dispatch(startNode());
          }
          
          // Broadcast session ownership to other tabs
          if (broadcastChannel) {
            broadcastChannel.postMessage({
              action: 'device_active',
              deviceId: nodeId,
              sessionToken: storedToken,
              owner: true
            });
          }
        } else {
          console.log(`⚠️ Session exists but is owned by another tab/device`);
        }
      } else {
        setSessionVerified(false);
        console.log(`⚠️ Device ${nodeId} has an active session in another tab/device`);
        
        // Query all tabs for the latest session status
        if (broadcastChannel) {
          broadcastChannel.postMessage({
            action: 'verify_sessions'
          });
        }
      }
    } else {
      // No active session for this device
      setSessionExists(false);
      setSessionVerified(false);
    }

    // FIX: Sync the newly selected device immediately
    setTimeout(() => {
      syncDeviceUptime(nodeId, false);
    }, 100);
  };

  // FIX: Enhanced auto-stop logic with real-time monitoring
  useEffect(() => {
    if (!selectedNodeId) return;

    let monitoringInterval: NodeJS.Timeout | null = null;

    const checkAndSetupMonitoring = async () => {
      // FIX: Check if device is running and start monitoring
      if (isDeviceRunning(selectedNodeId) || node.isActive) {
        console.log("🔄 Device is running - starting uptime monitoring...");
        monitoringInterval = startUptimeMonitoring();
      }

      // FIX: Also check current uptime status for immediate action
      const isUptimeExceeded = await checkUptimeLimit(false);
      setUptimeExceeded(isUptimeExceeded);

      // FIX: Immediate auto-stop if already exceeded and device is running
      if (
        isUptimeExceeded &&
        (isDeviceRunning(selectedNodeId) || node.isActive) &&
        !autoStopInProgressRef.current
      ) {
        console.log("🚨 UPTIME ALREADY EXCEEDED - IMMEDIATE AUTO-STOP");

        autoStopInProgressRef.current = true;
        setIsStopping(true);

        try {
          // Save session earnings before stopping
          if (sessionEarnings > 0) {
            console.log(
              "🛑 Auto-stop: Saving session earnings to DB:",
              sessionEarnings
            );
            const saveSuccess = await saveSessionEarningsToDb(true);
            if (!saveSuccess) {
              console.error(
                "❌ Failed to save session earnings before auto-stopping node"
              );
            }
          }

          // Update device status to offline
          await updateDeviceStatus(selectedNodeId, "offline");

          // Stop uptime tracking and update server
          const result = await stopDeviceUptime(selectedNodeId);

          if (result.success) {
            console.log("✅ Node auto-stopped and uptime updated successfully");
          } else {
            console.error(
              "❌ Failed to update uptime during auto-stop:",
              result.error
            );
          }

          // Stop Redux state and tasks
          dispatch(stopNode());
          dispatch(resetTasks());

          setShowUptimeLimitDialog(true);
        } catch (error) {
          console.error("❌ Error during immediate auto-stop:", error);
        } finally {
          setIsStopping(false);
          autoStopInProgressRef.current = false;
        }
      }
    };

    checkAndSetupMonitoring();
    setDeviceLimitExceeded(checkDeviceLimit());

    // FIX: Cleanup monitoring interval on unmount or when device changes
    return () => {
      if (monitoringInterval) {
        clearInterval(monitoringInterval);
        console.log("🔄 Stopped uptime monitoring");
      }
    };
  }, [
    selectedNodeId,
    node.isActive,
    sessionEarnings
  ]);

  // FIX: Enhanced periodic validation for running devices (backup monitoring)
  useEffect(() => {
    if (!selectedNodeId || !isDeviceRunning(selectedNodeId)) return;

    console.log(
      "⏱️ Starting backup periodic uptime validation for running device..."
    );

    // FIX: More frequent validation for running devices
    const validateUptime = setInterval(async () => {
      try {
        const currentUptime = getCurrentUptime(selectedNodeId);
        const maxUptime = getMaxUptime();
        const remainingTime = maxUptime - currentUptime;

        console.log(
          `⏱️ Backup check - Uptime: ${currentUptime}s, Remaining: ${remainingTime}s`
        );

        // FIX: Emergency stop if somehow the main monitoring missed it
        if (currentUptime >= maxUptime && !autoStopInProgressRef.current) {
          console.log(
            "🚨 EMERGENCY STOP - Uptime limit exceeded in backup check"
          );

          autoStopInProgressRef.current = true;
          setIsStopping(true);

          try {
            // Save session earnings before stopping
            if (sessionEarnings > 0) {
              console.log(
                "🛑 Emergency stop: Saving session earnings to DB:",
                sessionEarnings
              );
              const saveSuccess = await saveSessionEarningsToDb(true);
              if (!saveSuccess) {
                console.error(
                  "❌ Failed to save session earnings before emergency stop"
                );
              }
            }

            // Update device status to offline
            await updateDeviceStatus(selectedNodeId, "offline");

            // Stop uptime tracking and update server
            const result = await stopDeviceUptime(selectedNodeId);

            if (result.success) {
              console.log("✅ Emergency stop completed successfully");
            } else {
              console.error(
                "❌ Failed to update uptime during emergency stop:",
                result.error
              );
            }

            // Stop Redux state and tasks
            dispatch(stopNode());
            dispatch(resetTasks());

            setShowUptimeLimitDialog(true);
          } catch (error) {
            console.error("❌ Error during emergency stop:", error);
          } finally {
            setIsStopping(false);
            autoStopInProgressRef.current = false;
          }
        }
      } catch (error) {
        console.error("Error in backup uptime validation:", error);
      }
    }, 30000); // Every 30 seconds as backup

    return () => {
      clearInterval(validateUptime);
      console.log("⏱️ Stopped backup periodic uptime validation");
    };
  }, [
    selectedNodeId,
    sessionEarnings
  ]);

  // FIX: ENHANCED toggle node status with pre-validation, server sync, session management, and broadcast channel
  const toggleNodeStatus = async () => {
    if (!selectedNodeId) return;

    const deviceCurrentlyRunning = isDeviceRunning(selectedNodeId);

    if (deviceCurrentlyRunning || node.isActive) {
      // STOP LOGIC - Enhanced with better error handling and session clearing
      setIsStopping(true);

      try {
        console.log(`🛑 Stopping node ${selectedNodeId}...`);

        // Track node stop
        const selectedDevice = nodes.find((node) => node.id === selectedNodeId);
        if (selectedDevice) {
          trackNodeAction("stop", selectedDevice.type);
        }

        // Use the dedicated device session stop API
        try {
          const stopResponse = await fetch("/api/device-session/stop", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              deviceId: selectedNodeId,
              sessionToken: deviceSessionToken
            })
          });
          
          if (!stopResponse.ok) {
            console.error(`❌ Failed to stop session via API: ${stopResponse.status}`);
          } else {
            console.log("✅ Device session stopped via dedicated API");
          }
        } catch (stopError) {
          console.error("❌ Error stopping session via API:", stopError);
        }
        
        // Also update device status locally as fallback
        const updateResult = await updateDeviceStatus(selectedNodeId, "offline");

                 // Clear session data from local storage
         localStorage.removeItem("device_session_token");
         localStorage.removeItem("device_session_deviceId");
         localStorage.removeItem("session_owner_tab_id"); // CRITICAL: Clear ownership marker
         setDeviceSessionToken(null);
         setSessionVerified(false);
         setSessionExists(false);
        
                 // Broadcast to other tabs that this device is now inactive
         if (broadcastChannel) {
           broadcastChannel.postMessage({
             action: 'device_inactive',
             deviceId: selectedNodeId,
             // Include additional info to help other tabs sync properly
             stoppedByUser: true,
             timestamp: Date.now()
           });
         }

        // Save any unsaved session earnings before stopping the node
        if (sessionEarnings > 0) {
          console.log(
            "🛑 Node stopping: Saving session earnings to DB:",
            sessionEarnings
          );
          const saveSuccess = await saveSessionEarningsToDb(true);
          if (!saveSuccess) {
            console.error(
              "❌ Failed to save session earnings before stopping node"
            );
          }
        }

        // Stop uptime tracking and update server
        const result = await stopDeviceUptime(selectedNodeId);

        if (result.success) {
          console.log("✅ Node stopped and uptime updated successfully");
        } else {
          console.error("❌ Failed to update uptime:", result.error);
        }
      } catch (error) {
        console.error("Error stopping node:", error);
      }

             setTimeout(() => {
         dispatch(stopNode());
         dispatch(resetTasks());
         setIsStopping(false);
         console.log("🛑 Node stop completed");
       }, 2000);
    } else {
      // START LOGIC - First check for active sessions on this device or others
      
      // Check if the selected device already has an active session
      const sessionCheck = await checkDeviceSession(selectedNodeId);
      
      if (sessionCheck.hasActiveSession) {
        setIsStarting(false);
        alert(
          `Cannot start this node. It is already running in another browser or tab.\n\nOnly one active session per device is allowed.`
        );
        return;
      }
      
      // Check if any other device is running first
      const anyOtherDeviceRunning = deviceUptimeList.some(
        (device) => device.isRunning && device.deviceId !== selectedNodeId
      );

      if (anyOtherDeviceRunning) {
        const runningDevice = deviceUptimeList.find((d) => d.isRunning);
        const runningDeviceName =
          nodes.find((n) => n.id === runningDevice?.deviceId)?.name ||
          "Unknown Device";

        alert(
          `Cannot start this device while "${runningDeviceName}" is running. Please stop the current device first.`
        );
        return;
      }

      // Check if any other device has an active session globally
      const anyActiveSession = nodes.some(node => {
        // Skip the selected node as we already checked it
        if (node.id === selectedNodeId) return false;
        return node.status === "running";
      });

      if (anyActiveSession) {
        alert(
          "Cannot start this device. Another device is already running in a different browser or tab.\n\nOnly one active device per user is allowed."
        );
        return;
      }
      
      // Also check with broadcast channel for immediate feedback
      if (broadcastChannel) {
        // Query all tabs for active sessions
        try {
          broadcastChannel.postMessage({
            action: 'verify_sessions'
          });
          
          // Small delay to allow responses to come in (improved UX)
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          if (error instanceof Error && error.name !== 'InvalidStateError') {
            logError('BroadcastChannel error during session verification:', error);
          }
        }
      }

      // START LOGIC - CRITICAL FIXES for uptime validation
      setIsStarting(true);

      try {
        // FIX: Step 1 - Force sync with server to get latest uptime BEFORE starting
        logInfo("🚀 Starting node - syncing with server first...");
        setSyncingDeviceId(selectedNodeId);

        await syncDeviceUptime(selectedNodeId, true); // Force sync

        // FIX: Step 2 - Wait for sync to complete properly
        await new Promise((resolve) => setTimeout(resolve, 500));
        setSyncingDeviceId(null);

        // FIX: Step 3 - Get server-validated uptime
        const serverValidatedUptime = await validateCurrentUptime(
          selectedNodeId
        );
        const maxUptime = getMaxUptime();

        logInfo(
          `📊 Pre-start validation - Server uptime: ${serverValidatedUptime}s, Max: ${maxUptime}s`
        );

        // FIX: Step 4 - Check limits with server-validated data
        if (serverValidatedUptime >= maxUptime) {
          setIsStarting(false);
          setUptimeExceeded(true);

          alert(
            `❌ Node cannot start. Uptime limit (${formatUptime(
              maxUptime
            )}) reached for ${currentPlan.toLowerCase()} plan.\n\nCurrent uptime: ${formatUptime(
              serverValidatedUptime
            )}\n\nUpgrade your plan to continue.`
          );
          return;
        }

        // Step 5 - Check if node is registered
        if (!node.isRegistered) {
          setIsStarting(false);
          setShowScanDialog(true);
          return;
        }

        // FIX: Step 6 - Create a new session token and update device status
        // CRITICAL: Prevent duplicate token generation with ref guard
        if (sessionTokenGeneratingRef.current) {
          logWarn("Session token generation already in progress, skipping");
          setIsStarting(false);
          return;
        }
        
        sessionTokenGeneratingRef.current = true;
        const sessionToken = generateSessionToken();
        logSecure(`Generated new session token for device ${selectedNodeId}`);
        
        // Update device with new session token
        const updateResult = await updateDeviceStatus(selectedNodeId, "busy", true);
        
        if (!updateResult.success) {
          sessionTokenGeneratingRef.current = false; // Reset on failure
          setIsStarting(false);
          alert("Failed to start node. Could not create session.");
          return;
        }
        
                 // Store the session token in localStorage for retrieval
         if (updateResult.sessionToken) {
           const currentTabId = getTabId();
           
           localStorage.setItem("device_session_token", updateResult.sessionToken);
           localStorage.setItem("device_session_deviceId", selectedNodeId);
           // CRITICAL: Mark this tab as the session owner
           localStorage.setItem("session_owner_tab_id", currentTabId);
           
           setDeviceSessionToken(updateResult.sessionToken);
           setSessionVerified(true);
           setSessionExists(true);
           
           console.log(`🔑 Tab ${currentTabId} now owns session for device ${selectedNodeId}`);
           
           // Broadcast to other tabs that this device is now active
           if (broadcastChannel) {
             broadcastChannel.postMessage({
               action: 'device_active',
               deviceId: selectedNodeId,
               sessionToken: updateResult.sessionToken,
               ownerTabId: currentTabId
             });
           }
         }

        // FIX: Step 7 - Proceed with start only after all validations pass
        logInfo("✅ All pre-start checks passed, starting node...");

        // Track node start
        const selectedDevice = nodes.find((node) => node.id === selectedNodeId);
        if (selectedDevice) {
          trackNodeAction("start", selectedDevice.type);
        }

        // Start uptime tracking
        startDeviceUptime(selectedNodeId);

        setTimeout(() => {
          dispatch(startNode());
          setIsStarting(false);
          sessionTokenGeneratingRef.current = false; // Reset after successful start
          logInfo("🟢 Node started successfully with session token");
        }, 2000);
      } catch (error) {
        logError("❌ Error starting node:", error);
        setIsStarting(false);
        setSyncingDeviceId(null);
        sessionTokenGeneratingRef.current = false; // Reset on error

        // FIX: Show user-friendly error message
        alert(
          "Failed to start node. Please check your connection and try again."
        );
      }
    }
  };

  // FIX: Enhanced scan complete handler with better validation
  const handleScanComplete = async (
    hardwareInfo: HardwareInfo,
    deviceName: string
  ) => {
    if (!user?.id) return;

    // FIX: Double-check device limit before adding
    if (checkDeviceLimit()) {
      alert(
        `❌ Device limit reached. Your ${currentPlan.toLowerCase()} plan allows ${
          planDetails.deviceLimit
        } device${
          planDetails.deviceLimit > 1 ? "s" : ""
        }.\n\nCurrent devices: ${
          nodes.length
        }\n\nUpgrade your plan to add more devices.`
      );
      return;
    }

    console.log("🔧 Registering new device:", deviceName);

    // Register the device in Redux store
    dispatch(registerDevice(hardwareInfo));

    // Track device registration
    trackDeviceRegistration(
      hardwareInfo.deviceType || "desktop",
      hardwareInfo.rewardTier
    );

    // Save the device using API route
    try {
      const response = await fetch("/api/devices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gpu_model: hardwareInfo.gpuInfo,
          device_type: hardwareInfo.deviceType || "desktop",
          reward_tier: hardwareInfo.rewardTier,
          device_name: deviceName,
        }),
      });

      if (!response.ok) {
        console.error(
          "Error saving device:",
          response.status,
          response.statusText
        );
        alert("❌ Failed to save device. Please try again.");
        return;
      } else {
        const { device } = await response.json();
        const newDevice = device as SupabaseDevice;
        const newNode: NodeInfo = {
          id: newDevice.id,
          name:
            newDevice.device_name ||
            `My ${
              newDevice.device_type.charAt(0).toUpperCase() +
              newDevice.device_type.slice(1)
            }`,
          type: newDevice.device_type,
          rewardTier: newDevice.reward_tier || "cpu",
          status: "idle",
          gpuInfo: newDevice.gpu_model,
        };

        setNodes((prevNodes) => [...prevNodes, newNode]);
        setSelectedNodeId(newDevice.id);

        // FIX: Initialize new device with server uptime (should be 0 for new devices)
        await initializeDeviceUptime(newDevice.id, 0);

        console.log(`✅ New device ${newDevice.id} added and initialized`);
      }
    } catch (err) {
      console.error("Exception while saving device:", err);
      alert("❌ An error occurred while saving the device. Please try again.");
    }
  };

  // FIX: Enhanced delete selected node function
  const deleteSelectedNode = async () => {
    if (!selectedNodeId || !user?.id) return;

    setIsDeletingNode(true);
    try {
      const success = await deleteDevice(selectedNodeId);
      if (success) {
        setShowDeleteConfirmDialog(false);

        // FIX: Show success message
        setTimeout(() => {
          console.log("✅ Device deleted successfully");
        }, 100);
      } else {
        alert("❌ Failed to delete device. Please try again.");
      }
    } catch (err) {
      console.error("Exception while deleting device:", err);
      alert("❌ An error occurred while deleting the device.");
    } finally {
      setIsDeletingNode(false);
    }
  };

  // FIX: Enhanced reward tier color function
  const getRewardTierColor = (tier: string) => {
    switch (tier) {
      case "webgpu":
        return "text-purple-400";
      case "wasm":
        return "text-blue-400";
      case "webgl":
        return "text-green-400";
      case "cpu":
        return "text-yellow-400";
      default:
        return "text-gray-400";
    }
  };

  // FIX: Enhanced claim reward handler with better error recovery and state management
  const handleClaimReward = async () => {
    const totalUnclaimedRewards = sessionEarnings + dbUnclaimedRewards;
    
    // FIX: CRITICAL - Multiple safety checks to prevent double claiming
    if (totalUnclaimedRewards <= 0.01 || isNaN(totalUnclaimedRewards)) {
      console.log("🚫 Claim blocked - no valid rewards to claim");
      return;
    }
    
    // FIX: Additional safety check - if already claiming, block
    if (isClaimingReward) {
      console.log("🚫 Claim blocked - already in progress");
      return;
    }

    // FIX: Set claim in progress state
    setIsClaimInProgress(true);

    try {
      console.log("💰 Starting reward claim process...");
      console.log(
        `Total to claim: ${totalUnclaimedRewards} (Session: ${sessionEarnings} + DB: ${dbUnclaimedRewards})`
      );

      // FIX: Enhanced pre-claim validation
      if (node.isActive || isDeviceRunning(selectedNodeId)) {
        alert(
          "❌ Cannot claim rewards while node is running. Please stop the node first."
        );
        return;
      }

      // First, save any unsaved session earnings to ensure we don't lose them
      if (sessionEarnings > 0) {
        console.log(
          "💾 Saving unsaved session earnings before claiming:",
          sessionEarnings
        );
        const saveSuccess = await saveSessionEarningsToDb(true);
        if (!saveSuccess) {
          console.error("❌ Failed to save session earnings before claiming");
          alert(
            "❌ Failed to save current session earnings. Please try again."
          );
          return;
        }

        // FIX: Wait for save to complete and update state
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Recalculate total after potential save
      const finalDbRewards =
        dbUnclaimedRewards + (sessionEarnings > 0 ? sessionEarnings : 0);

      console.log(`💰 Claiming final amount: ${finalDbRewards} SP`);

      // Claim the rewards
      const result = await claimTaskRewards(finalDbRewards);

      if (result) {
        // Track successful reward claim
        trackRewardClaim(finalDbRewards);

        // After successful claim, reset everything to 0
        const resetSuccess = await resetAllUnclaimedRewards();
        if (resetSuccess) {
          console.log("✅ Successfully claimed and reset all rewards");
          
          // FIX: CRITICAL - Immediately clear all local state to prevent double claiming
          setDbUnclaimedRewards(0);
          setLastSavedSessionEarnings(0);
          dispatch(resetSessionEarnings());
          
          // FIX: Force refresh unclaimed rewards to ensure consistency
          setTimeout(() => {
            fetchUnclaimedRewards();
          }, 1000);
        }

        // Process referral rewards
        try {
          const { error } = await processReferralRewards(
            user!.id,
            finalDbRewards
          );
          if (error) {
            console.error("⚠️ Error processing referral rewards:", error);
          } else {
            console.log("✅ Referral rewards processed successfully");
          }
        } catch (referralError) {
          console.error("❌ Exception in referral processing:", referralError);
        }
      }
    } catch (error) {
      console.error("❌ Error in reward claiming process:", error);
      alert("❌ Failed to claim rewards. Please try again.");
    } finally {
      // FIX: Always clear claim in progress state
      setIsClaimInProgress(false);
    }
  };

  // FIX: Enhanced uptime display component with sync status
  const renderUptimeCard = () => {
    const maxUptime = getMaxUptime();
    const isNearLimit = displayUptime >= maxUptime * 0.9;
    const progressPercentage = Math.min((displayUptime / maxUptime) * 100, 100);

    return (
      <div
        className={`p-4 rounded-xl flex flex-col ${
          uptimeExceeded
            ? "bg-red-900/20 border border-red-500/30"
            : isNearLimit
            ? "bg-yellow-900/20 border border-yellow-500/30"
            : "bg-[#1D1D33]"
        }`}
      >
        <div className="text-[#515194] text-xs mb-1 flex items-center justify-between">
          <span>Device Uptime</span>
          <div className="flex items-center gap-1">
            {/* FIX: Show sync status */}
            {syncingDeviceId === selectedNodeId && (
              <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
            )}
            {uptimeExceeded && (
              <span className="text-red-400 text-xs font-medium">
                LIMIT REACHED
              </span>
            )}
            {isNearLimit && !uptimeExceeded && (
              <span className="text-yellow-400 text-xs font-medium">
                NEAR LIMIT
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center">
          <div className="icon-bg mt-2 icon-container flex items-center justify-center rounded-md p-2 mx-auto sm:mx-0">
            <Clock className="w-5 h-5 sm:w-7 sm:h-7 text-white z-10" />
          </div>
          <div className="flex flex-col mt-2 sm:ml-3 w-full">
            <div
              className={`text-lg font-medium text-center sm:text-left ${
                uptimeExceeded
                  ? "text-red-400"
                  : isNearLimit
                  ? "text-yellow-400"
                  : "text-white"
              }`}
            >
              {formatUptime(displayUptime)}
            </div>
            <div className="text-xs text-white/50 text-center sm:text-left">
              of {formatUptime(maxUptime)}
            </div>
            {/* FIX: Enhanced progress bar with better visual feedback */}
            <div className="w-full bg-gray-700 rounded-full h-1.5 mt-1">
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  uptimeExceeded
                    ? "bg-red-500"
                    : isNearLimit
                    ? "bg-yellow-500"
                    : "bg-green-500"
                }`}
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
            {/* FIX: Show detailed sync information */}
            {syncingDeviceId === selectedNodeId && (
              <div className="text-xs text-blue-400 text-center sm:text-left mt-1">
                Syncing with server...
              </div>
            )}
            {/* FIX: Show data staleness warning */}
            {selectedNodeId && isDataStale(selectedNodeId) && (
              <div className="text-xs text-yellow-400 text-center sm:text-left mt-1">
                ⚠️ Data may be outdated
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

     // FIX: Enhanced start button with better state management and session awareness
   const renderStartStopButton = () => {
     const deviceCurrentlyRunning = isDeviceRunning(selectedNodeId);
     const isNodeActive = node.isActive || deviceCurrentlyRunning;
     const isProcessing = isStarting || isStopping || isUpdatingUptime;
     const isSyncing = syncingDeviceId === selectedNodeId;
     
     // Check if this device has an active session elsewhere that we don't own
     const hasActiveSessionElsewhere = sessionExists && !sessionVerified;
 
     // CRITICAL FIX: Different disable logic for start vs stop buttons
     let isDisabled;
     
     if (isNodeActive) {
       // For STOP button: only disable if we don't own the session or general conditions
       isDisabled = 
         isProcessing ||
         !selectedNodeId ||
         isSyncing ||
         !isLoggedIn ||
         // Only disable stop if we don't own the session
         (hasActiveSessionElsewhere && !sessionVerified);
     } else {
       // For START button: disable if active elsewhere or general conditions
       isDisabled =
         isProcessing ||
         !selectedNodeId ||
         isSyncing ||
         uptimeExceeded ||
         !isLoggedIn ||
         // Disable start if the device is active elsewhere
         hasActiveSessionElsewhere;
     }

    const getButtonText = () => {
      if (isUpdatingUptime) return "Updating...";
      if (isStarting) return "Starting...";
      if (isStopping) return "Stopping...";
      if (isSyncing) return "Syncing...";

      if (isNodeActive) return "Stop Node";
      if (uptimeExceeded) return "Uptime Limit Reached";
      if (!isLoggedIn) return "Login Required";
      if (hasActiveSessionElsewhere) return "Running In Another Tab";

      return "Start Node";
    };

    const getButtonIcon = () => {
      if (isProcessing || isSyncing) {
        return (
          <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 animate-spin" />
        );
      }

      if (isNodeActive) {
        return <IoStopOutline className="text-white/90 ml-1 sm:ml-2" />;
      }

      if (uptimeExceeded) {
        return <AlertTriangle className="text-white/90 ml-1 sm:ml-2" />;
      }
      
      if (hasActiveSessionElsewhere) {
        return <AlertTriangle className="text-white/90 ml-1 sm:ml-2" />;
      }

      return <VscDebugStart className="text-white/90 ml-1 sm:ml-2" />;
    };

    const getButtonStyle = () => {
      if (isNodeActive) {
        return "bg-red-600 hover:bg-red-700 hover:shadow-red-500/30 shadow-red-500";
      }

      if (uptimeExceeded || !isLoggedIn) {
        return "bg-gray-600 hover:bg-gray-700 cursor-not-allowed opacity-50";
      }
      
      if (hasActiveSessionElsewhere) {
        return "bg-amber-600 hover:bg-amber-700 cursor-not-allowed opacity-90";
      }

      return "bg-green-600 hover:bg-green-700 hover:shadow-green-500/30 shadow-green-500";
    };
    
    const getButtonTooltip = () => {
      if (hasActiveSessionElsewhere) {
        return "This device is already active in another browser or tab. Close the other tab to control it here.";
      }
      return null;
    };

    return (
      <div className="relative w-[22%]">
        <Button
          variant="default"
          disabled={isDisabled}
          onClick={toggleNodeStatus}
          className={`w-full rounded-full transition-all duration-300 shadow-md hover:shadow-lg text-white text-xs sm:text-sm px-3 py-1 sm:px-4 sm:py-2 h-9 sm:h-10 hover:translate-y-[-0.5px] ${getButtonStyle()}`}
          title={getButtonTooltip() || undefined}
        >
          {getButtonText()}
          {getButtonIcon()}
        </Button>
        {hasActiveSessionElsewhere && (
          <div className="absolute -bottom-5 left-0 right-0 text-[10px] text-amber-400 text-center">
            Running elsewhere
          </div>
        )}
      </div>
    );
  };

     // Simple tab communication without periodic checks
   useEffect(() => {
     if (!selectedNodeId || !broadcastChannel || !isMounted) return;

     // Only do initial check right after mounting - no periodic checks
     if (broadcastChannel) {
       setTimeout(() => {
         // Just query for existing sessions, don't force sync
         try {
           broadcastChannel.postMessage({
             action: 'verify_sessions'
           });
         } catch (error) {
           // Channel might be closed, ignore silently
           if (error instanceof Error && error.name !== 'InvalidStateError') {
             console.error('BroadcastChannel error:', error);
           }
         }
       }, 1000);
     }
   }, [selectedNodeId, broadcastChannel, isMounted]);

  // FIX: Add cleanup effect for timeouts
  useEffect(() => {
    return () => {
      if (deviceSyncTimeoutRef.current) {
        clearTimeout(deviceSyncTimeoutRef.current);
      }
    };
  }, []);

  // FIX: Enhanced error boundary effect
  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.error("NodeControlPanel error:", error);
      // Could add error reporting here
    };

    window.addEventListener("error", handleError);
    return () => window.removeEventListener("error", handleError);
  }, []);

  return (
    <>
      <div className="node-control-panel p-2.5 sm:p-4 md:p-6 rounded-2xl sm:rounded-3xl stat-card overflow-x-hidden">
        <div className="flex flex-col">
          <div className="flex flex-row justify-between items-center gap-2 sm:gap-0 mb-3 sm:mb-6">
            <div className="flex items-center gap-1 sm:gap-2">
              <h2 className="text-sm sm:text-lg font-medium text-white/90">
                Node Control Panel
              </h2>
              <InfoTooltip content="Manage your computing nodes, start or stop them, and view performance metrics" />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (deviceLimitExceeded) {
                  alert(
                    `Device limit reached. Your ${currentPlan.toLowerCase()} plan allows ${
                      planDetails.deviceLimit
                    } device${
                      planDetails.deviceLimit > 1 ? "s" : ""
                    }. Current: ${nodes.length}`
                  );
                  return;
                }
                setShowScanDialog(true);
              }}
              disabled={deviceLimitExceeded || !isLoggedIn}
              className={`gradient-button rounded-full text-xs sm:text-sm px-2 py-1 sm:px-3 sm:py-2 ${
                deviceLimitExceeded || !isLoggedIn
                  ? "opacity-50 cursor-not-allowed text-gray-400"
                  : "text-[#8BBEFF]"
              }`}
            >
              <Scan className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Scan Device
            </Button>
          </div>

          <div className="flex flex-row justify-between gap-2 sm:gap-4 items-center mb-3 sm:mb-6">
            <Select
              value={selectedNodeId}
              onValueChange={handleNodeSelect}
              open={isOpen}
              onOpenChange={setIsOpen}
            >
              <SelectTrigger className="w-[75%] bg-[#1D1D33] border-0 rounded-full text-[#515194] text-xs sm:text-sm h-9 sm:h-10">
                <div className="flex items-center gap-2">
                  {selectedNode && (
                    <>
                      {getDeviceIcon(selectedNode.type)}
                      <span className="truncate">{selectedNode.name}</span>
                      {/* FIX: Enhanced running indicator with sync status */}
                      {isDeviceRunning(selectedNodeId) && (
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                          {syncingDeviceId === selectedNodeId && (
                            <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
                          )}
                        </div>
                      )}
                    </>
                  )}
                  {!selectedNode && (
                    <span className="truncate">
                      {isLoadingDevices ? "Loading..." : "No nodes"}
                    </span>
                  )}
                </div>
              </SelectTrigger>
              <SelectContent className="bg-[#0A1A2F] border-[#1E293B]">
                {nodes.map((node) => (
                  <div key={node.id} className="relative">
                    <SelectItem
                      value={node.id}
                      className="text-[#515194] hover:bg-[#1D1D33] focus:bg-[#1D1D33] pr-10"
                    >
                      <div className="flex items-center gap-2">
                        {getDeviceIcon(node.type)}
                        <span>{node.name}</span>
                        {/* FIX: Show uptime in dropdown for better visibility */}
                        <span className="text-xs text-white/50 ml-auto">
                          {formatUptime(getCurrentUptime(node.id))}
                        </span>
                      </div>
                    </SelectItem>
                    <div
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDeletingNodeId(node.id);
                        deleteDevice(node.id).finally(() => {
                          setDeletingNodeId(null);
                        });
                      }}
                    >
                      <button
                        type="button"
                        disabled={deletingNodeId === node.id}
                        className="p-1.5 rounded-full hover:bg-red-500/20 focus:outline-none"
                      >
                        {deletingNodeId === node.id ? (
                          <Loader2 className="w-4 h-4 text-red-500 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4 text-red-500" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </SelectContent>
            </Select>

            {/* FIX: Use the enhanced start/stop button */}
            {renderStartStopButton()}
          </div>

          {/* FIX: Enhanced login warning */}
          {!isLoggedIn && (
            <div className="mb-4 p-3 rounded-full bg-yellow-900/20 border border-yellow-500/30 flex items-center gap-2">
              <AlertTriangle className="w-[15px] h-[15px] text-yellow-500 flex-shrink-0" />
              <span className="text-xs text-yellow-200">
                Login required to start node and track uptime
              </span>
            </div>
          )}
          
          {/* FIX: Session status warning */}
          {isLoggedIn && sessionExists && !sessionVerified && (
            <div className="mb-4 p-3 rounded-full bg-red-900/20 border border-red-500/30 flex items-center gap-2">
              <AlertTriangle className="w-[15px] h-[15px] text-red-500 flex-shrink-0" />
              <span className="text-xs text-red-200">
                This device is currently active in another browser or tab
              </span>
            </div>
          )}
          
          {/* FIX: Session verified confirmation */}
          {isLoggedIn && sessionExists && sessionVerified && (
            <div className="mb-4 p-3 rounded-full bg-green-900/20 border border-green-500/30 flex items-center gap-2">
              <Clock className="w-[15px] h-[15px] text-green-500 flex-shrink-0" />
              <span className="text-xs text-green-200">
                Active session: This tab is controlling the device
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-3 sm:mb-6">
            <div className="p-4 rounded-xl bg-[#1D1D33] flex flex-col">
              <div className="text-[#515194] text-xs mb-1">Reward Tier</div>
              <div className="flex flex-col sm:flex-row sm:items-center">
                <div className="icon-bg mt-2 icon-container flex items-center justify-center rounded-md p-2 mx-auto sm:mx-0">
                  <img
                    src="/images/coins.png"
                    alt="NLOV"
                    className="w-8 h-8 object-contain"
                  />
                </div>
                <div className="text-lg font-medium text-white mt-2 text-center sm:text-left sm:ml-3">
                  {isMounted
                    ? (selectedNode?.rewardTier || "N/A").toUpperCase()
                    : "N/A"}
                </div>
              </div>
            </div>

            {/* FIX: Use the enhanced uptime card */}
            {renderUptimeCard()}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-3 sm:mb-6">
            <div className="p-4 rounded-xl bg-[#1D1D33] flex flex-col">
              <div className="text-[#515194] text-xs mb-1">
                Connected Devices
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center">
                <div className="icon-bg mt-2 icon-container flex items-center justify-center rounded-md p-2 mx-auto sm:mx-0">
                  <img
                    src="/images/devices.png"
                    alt="NLOV"
                    className="w-8 h-8 object-contain"
                  />
                </div>
                <div className="flex flex-col mt-2 sm:ml-3">
                  <div
                    className={`text-lg font-medium text-center sm:text-left ${
                      deviceLimitExceeded ? "text-red-400" : "text-white"
                    }`}
                  >
                    {nodes.length}
                  </div>
                  <div className="text-xs text-white/50 text-center sm:text-left">
                    of {planDetails.deviceLimit}
                  </div>
                  {deviceLimitExceeded && (
                    <div className="text-xs text-red-400 text-center sm:text-left mt-1">
                      LIMIT REACHED
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#1D1D33] flex flex-col">
              <div className="text-[#515194] text-xs mb-1">GPU Model</div>
              <div className="flex flex-col sm:flex-row sm:items-start">
                <div className="icon-bg mt-2 icon-container flex items-center justify-center rounded-md p-2 mx-auto sm:mx-0">
                  <img
                    src="/images/gpu_model.png"
                    alt="NLOV"
                    className="w-8 h-8 object-contain"
                  />
                </div>
                <div
                  className="text-lg text-white mt-3 text-center sm:text-left sm:ml-3 overflow-hidden w-full sm:w-[75%]"
                  title={selectedNode?.gpuInfo || "N/A"}
                >
                  {extractGPUModel(selectedNode?.gpuInfo || "N/A")}
                </div>
              </div>
            </div>
          </div>

          {/* FIX: Enhanced earnings section with better state tracking */}
          <div
            className={`p-4 sm:p-6 flex flex-col rounded-xl sm:rounded-2xl border relative overflow-hidden gap-4 transition-all duration-300 ${
              sessionEarnings + dbUnclaimedRewards > 0
                ? "border-yellow-500/30 bg-yellow-900/10"
                : "border-blue-800/30 bg-blue-900/10"
            }`}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-4 z-10">
                <img
                  src="/images/nlov-coin.png"
                  alt="coin"
                  className="w-11 h-11 object-contain z-10 flex-shrink-0"
                />
                <div className="flex flex-col min-w-0">
                  <span className="text-white/90 text-xl sm:text-2xl break-words transition-all duration-500">
                    {sessionEarnings + dbUnclaimedRewards > 0
                      ? "Rewards Available"
                      : "Total Earnings"}
                  </span>
                  {isLoadingEarnings && (
                    <span className="text-xs text-white/50">
                      Loading earnings...
                    </span>
                  )}
                  {/* FIX: Enhanced warning message */}
                  {sessionEarnings + dbUnclaimedRewards > 0 &&
                    (node.isActive || isDeviceRunning(selectedNodeId)) && (
                      <div className="flex items-center gap-2 mt-1">
                        <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                        <span className="text-xs text-yellow-400">
                          Stop active node to claim rewards
                        </span>
                      </div>
                    )}
                </div>
              </div>
              <div className="flex items-baseline gap-2 z-10 flex-shrink-0">
                <span
                  className={`font-medium text-2xl sm:text-3xl lg:text-4xl transition-all duration-300 ${
                    sessionEarnings + dbUnclaimedRewards > 0
                      ? "text-yellow-400"
                      : "text-blue-400"
                  } leading-none`}
                >
                  {isLoggedIn
                    ? isLoadingEarnings
                      ? "..."
                      : sessionEarnings + dbUnclaimedRewards > 0
                      ? (sessionEarnings + dbUnclaimedRewards).toFixed(2)
                      : totalEarnings.toFixed(2)
                    : "0.00"}
                </span>
                <span
                  className={`text-sm transition-all duration-300 ${
                    sessionEarnings + dbUnclaimedRewards > 0
                      ? "text-yellow-300"
                      : "text-white/90"
                  }`}
                >
                  SP
                </span>
              </div>
            </div>

            {/* FIX: CRITICAL - Enhanced conditional rendering with strict reward validation */}
            {(sessionEarnings + dbUnclaimedRewards) > 0.01 && (
              <div className="flex flex-col">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-2 border-t border-yellow-500/30 pt-3 gap-3">
                  <div className="flex items-center gap-2">
                    <img
                      src="/images/pending_reward.png"
                      alt="Unclaimed"
                      className="w-5 h-5 object-contain flex-shrink-0"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-white text-base font-medium break-words">
                        Unclaimed:{" "}
                        <span className="text-yellow-400">
                          +{(sessionEarnings + dbUnclaimedRewards).toFixed(2)}{" "}
                          SP
                        </span>
                      </span>
                      {/* FIX: Enhanced earnings breakdown display */}
                      <div className="text-xs text-white/50 space-y-0.5">
                        {isLoadingUnclaimedRewards ? (
                          <div>Loading...</div>
                        ) : (
                          <>
                            {dbUnclaimedRewards > 0.01 && (
                              <div>
                                Saved: {dbUnclaimedRewards.toFixed(2)} SP
                              </div>
                            )}
                            {sessionEarnings > 0.01 && (
                              <div className="flex items-center gap-1">
                                <span>
                                  Session: {sessionEarnings.toFixed(2)} SP
                                </span>
                                {isSavingToDb ? (
                                  <span className="text-blue-400">
                                    (saving...)
                                  </span>
                                ) : node.isActive ||
                                  isDeviceRunning(selectedNodeId) ? (
                                  <span className="text-green-400">
                                    (auto-saving)
                                  </span>
                                ) : (
                                  <span className="text-yellow-400">
                                    (unsaved)
                                  </span>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-3 gap-2">
                  <div className="flex flex-col gap-1">
                    {earningsClaimError && (
                      <span className="text-red-400 text-xs">
                        {earningsClaimError}
                      </span>
                    )}
                    {showClaimSuccess && (
                      <span className="text-green-400 text-xs">
                        Reward claimed successfully!
                      </span>
                    )}
                  </div>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleClaimReward}
                    disabled={
                      isClaimingReward ||
                      isClaimInProgress ||
                      isSavingToDb ||
                      // FIX: CRITICAL - Enhanced disabled logic to prevent double claiming
                      (sessionEarnings + dbUnclaimedRewards) <= 0.01 ||
                      isLoadingUnclaimedRewards ||
                      node.isActive ||
                      isDeviceRunning(selectedNodeId) ||
                      // FIX: Additional safety checks
                      isNaN(sessionEarnings + dbUnclaimedRewards) ||
                      (sessionEarnings + dbUnclaimedRewards) < 0.01
                    }
                    className={`rounded-full text-white px-4 py-2 w-full sm:w-auto transition-all duration-300 ${
                      node.isActive || isDeviceRunning(selectedNodeId)
                        ? "bg-gray-600 hover:bg-gray-700 cursor-not-allowed"
                        : "bg-green-600 hover:bg-green-700 hover:shadow-green-500/30 shadow-green-500"
                    }`}
                  >
                    {isClaimingReward ? (
                      <div className="flex items-center justify-center">
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Claiming...
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <img
                          src="/images/claimed_reward.png"
                          alt="Claim"
                          className="w-4 h-4 mr-2 object-contain"
                        />
                        {node.isActive || isDeviceRunning(selectedNodeId)
                          ? "Stop Node to Claim"
                          : "Claim Rewards"}
                      </div>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Show message when no rewards available */}
            {sessionEarnings + dbUnclaimedRewards <= 0 && (
              <div className="flex items-center justify-center border-t border-blue-800/30 pt-3">
                <span className="text-white/50 text-sm">
                  <i>*All Swarm Points will be converted to $NLOV after TGE </i>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hardware Scan Dialog */}
      <HardwareScanDialog
        isOpen={showScanDialog}
        onClose={() => setShowScanDialog(false)}
        onScanComplete={handleScanComplete}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={showDeleteConfirmDialog}
        onOpenChange={setShowDeleteConfirmDialog}
      >
        <DialogContent className="sm:max-w-md bg-[#0A1A2F] border-[#112544]">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Node</DialogTitle>
            <DialogDescription className="text-white/70">
              Are you sure you want to delete this node? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirmDialog(false)}
              disabled={isDeletingNode}
              className="border-[#112544] text-white hover:bg-[#112544]/30"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={deleteSelectedNode}
              disabled={isDeletingNode}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeletingNode ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FIX: Enhanced Uptime Limit Dialog with better information */}
      <Dialog
        open={showUptimeLimitDialog}
        onOpenChange={setShowUptimeLimitDialog}
      >
        <DialogContent className="sm:max-w-md bg-[#0A1A2F] border-[#112544]">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Uptime Limit Exceeded
            </DialogTitle>
            <DialogDescription className="text-white/70">
              Your node has been automatically stopped because you've reached
              the uptime limit for your {currentPlan.toLowerCase()} plan.
              <br />
              <br />
              <span className="text-yellow-400">
                Current usage: {formatUptime(displayUptime)} of{" "}
                {formatUptime(getMaxUptime())}
              </span>
              <br />
              <br />
              {/* FIX: Add helpful information about uptime reset */}
              <span className="text-blue-400 text-sm">
                💡 Tip: Uptime resets daily. You can also upgrade your plan for
                higher limits.
              </span>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex flex-col gap-3 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setShowUptimeLimitDialog(false)}
              className="border-[#112544] text-white hover:bg-[#112544]/30 w-full sm:w-auto"
            >
              Close
            </Button>
            <Button
              onClick={() => {
                window.open("https://app.neurolov.ai/subscription", "_blank");
                setShowUptimeLimitDialog(false);
              }}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white w-full sm:w-auto"
            >
              Upgrade Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FIX: Add debug panel for development (can be removed in production) */}
      {process.env.NODE_ENV === "development" && selectedNodeId && (
        <div className="mt-4 p-3 bg-gray-800 rounded-lg text-xs text-white/70">
          <div className="font-medium mb-2">Debug Info (Dev Only):</div>
          <div>Selected Device: {selectedNodeId}</div>
          <div>
            Local Uptime: {formatUptime(getCurrentUptime(selectedNodeId))}
          </div>
          <div>
            Is Running: {isDeviceRunning(selectedNodeId) ? "Yes" : "No"}
          </div>
          <div>
            Data Stale:{" "}
            {isDataStale && isDataStale(selectedNodeId) ? "Yes" : "No"}
          </div>
          <div>
            Last Sync:{" "}
            {lastSyncTime
              ? new Date(lastSyncTime).toLocaleTimeString()
              : "Never"}
          </div>
          <div>Redux Node Active: {node.isActive ? "Yes" : "No"}</div>
          <div>
            Syncing: {syncingDeviceId === selectedNodeId ? "Yes" : "No"}
          </div>
          <button
            onClick={() => syncDeviceUptime(selectedNodeId, true)}
            className="mt-2 px-2 py-1 bg-blue-600 rounded text-white text-xs"
            disabled={syncingDeviceId === selectedNodeId}
          >
            {syncingDeviceId === selectedNodeId ? "Syncing..." : "Force Sync"}
          </button>
          <button
            onClick={() => validateCurrentUptime(selectedNodeId)}
            className="mt-2 ml-2 px-2 py-1 bg-green-600 rounded text-white text-xs"
          >
            Validate Uptime
          </button>
        </div>
      )}
    </>
  );
};
