import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/lib/toast";
import { usePlan } from "@/contexts/PlanContext";
import { requestDeduplicator } from "@/lib/utils/requestDeduplicator";
import { actionThrottler } from "@/lib/utils/actionThrottler";
import { useAppDispatch, useAppSelector } from "@/lib/store";
import { registerDevice, startNode, stopNode, selectCurrentUptime, selectNode } from "@/lib/store/slices/nodeSlice";
import { generateTasks, startProcessingTasks } from "@/lib/store/slices/taskSlice";
import { selectSessionEarnings, resetSessionEarnings } from "@/lib/store/slices/earningsSlice";
import { deviceService } from "@/lib/api/devices";
import { earningsService } from "@/lib/api/earnings";
import { nodeControlService } from "@/services/nodeControlService";
import { taskWarmupService } from "@/services/taskWarmupService";
import { getPlanLimits } from "@/config/nodeLimits";
import { SessionManager } from "@/lib/sessionManager";
import type { HardwareInfo } from "@/lib/store/types";

interface NodeDevice {
  id: string;
  device_name: string;
  hardware_tier: string;
  gpu_model?: string;
  status: string;
  uptime: number;
  device_type?: string;
}

export const useNodeController = () => {
  const { user } = useAuth();
  const { planDetails } = usePlan();
  const dispatch = useAppDispatch();
  const node = useAppSelector(selectNode);
  const currentUptime = useAppSelector(selectCurrentUptime);
  const sessionEarnings = useAppSelector(selectSessionEarnings);

  const [selectedNodeId, setSelectedNodeId] = useState("");
  const [nodes, setNodes] = useState<NodeDevice[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [unclaimedRewards, setUnclaimedRewards] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [uptimeInterval, setUptimeInterval] = useState<NodeJS.Timeout | null>(null);
  const [taskWarmupTimeout, setTaskWarmupTimeout] = useState<NodeJS.Timeout | null>(null); // ✅ Track warmup timeout
  const [isClaiming, setIsClaiming] = useState(false);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [isViewOnlyMode, setIsViewOnlyMode] = useState(false);
  const [otherTabSessionInfo, setOtherTabSessionInfo] = useState<{tabId: string; timestamp: number; sessionToken?: string; deviceId?: string} | null>(null);
  const [remainingUptime, setRemainingUptime] = useState(0); // Countdown timer
  const [showMultiTabDialog, setShowMultiTabDialog] = useState(false); // Dialog for multi-tab warning
  const [runningDeviceId, setRunningDeviceId] = useState<string | null>(null); // Track which device is actually running

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const isNodeActive = node.isActive;

  const fetchDevices = useCallback(async () => {
    if (!user?.id) return;
    
    // ✅ CRITICAL FIX: Request deduplication - prevents multiple simultaneous calls
    return requestDeduplicator.deduplicate(
      `devices-${user.id}`,
      async () => {
        try {
          setIsLoadingDevices(true);
          const devices = await deviceService.getDevices();
          const mappedDevices = devices.map((d: any) => {
            const hasActiveSession = d.sessionToken !== null && d.sessionToken !== undefined;
            const deviceStatus = hasActiveSession ? "online" : "offline";
            
            const tier = d.reward_tier || d.rewardTier || d.hardware_tier || "cpu";
            
            return {
              id: d.id,
              device_name: d.deviceName || d.device_name || "Unnamed Device",
              hardware_tier: tier,
              gpu_model: d.gpuModel || d.gpu_model || "Unknown GPU",
              status: deviceStatus,
              uptime: d.uptime || 0,
              device_type: d.deviceType || d.device_type || "desktop",
            };
          });
          setNodes(mappedDevices);
          if (mappedDevices.length > 0 && !selectedNodeId) {
            setSelectedNodeId(mappedDevices[0].id);
          }
          return mappedDevices;
        } catch (error) {
          // Error handled silently
          throw error;
        } finally {
          setIsLoadingDevices(false);
        }
      },
      { cacheTTL: 10000 } // ✅ Increased to 10s to handle 30 req/min limit
    );
  }, [user?.id, selectedNodeId]);

  const fetchEarnings = useCallback(async () => {
    if (!user?.id) return;
    
    // ✅ CRITICAL FIX: Deduplicate earnings fetches to prevent 429 errors
    return requestDeduplicator.deduplicate(
      `earnings-${user.id}`,
      async () => {
        try {
          const earnings = await earningsService.getEarnings();
          
          if (earnings && typeof earnings === 'object') {
            const balance = earnings.total_balance || 0;
            const unclaimed = earnings.total_unclaimed_reward || 0;
            
            setTotalEarnings(balance);
            setUnclaimedRewards(unclaimed);
          } else {
            setTotalEarnings(0);
            setUnclaimedRewards(0);
          }
          return earnings;
        } catch (error) {
          setTotalEarnings(0);
          setUnclaimedRewards(0);
          throw error;
        }
      },
      { cacheTTL: 10000 } // Cache for 10 seconds
    );
  }, [user?.id]);

  const syncUptimeToBackend = async () => {
    if (!selectedNodeId || !isNodeActive) return;
    
    // ✅ FIXED: Calculate remaining time correctly
    const timeRemaining = Math.max(0, remainingUptime - currentUptime);
    
    try {
      await nodeControlService.syncUptime(selectedNodeId, timeRemaining);
      // 🔒 Update SessionManager timestamp (keep-alive)
      SessionManager.updateSessionTimestamp(selectedNodeId);
    } catch (error) {
      // Error handled silently
    }
  };

  const handleScanComplete = async (hardwareInfo: HardwareInfo, deviceName: string) => {
    if (!user?.id) return;
    dispatch(registerDevice(hardwareInfo));
    
    try {
      // ✅ FIXED: Keep actual hardware tier (webgpu, wasm, webgl, cpu)
      const payload = {
        device_name: deviceName,
        hardware_fingerprint: `${hardwareInfo.deviceType}_${hardwareInfo.gpuInfo}`,
        hardware_tier: hardwareInfo.rewardTier, // Keep actual tier!
        device_type: hardwareInfo.deviceType,
        gpu_info: {
          renderer: hardwareInfo.gpuInfo,
          tier: hardwareInfo.rewardTier,
        },
        cpu_info: {
          cores: hardwareInfo.cpuCores,
        },
        memory_gb: typeof hardwareInfo.deviceMemory === 'number' ? hardwareInfo.deviceMemory : undefined,
      };
      
      const device = await deviceService.registerDevice(payload);
      
      await fetchDevices();
      setSelectedNodeId(device.id);
    } catch (error) {
      toast.error("Failed to register device. Please try again.");
    }
  };

  const handleDeleteDevice = async (deviceId: string) => {
    if (!deviceId || isNodeActive) return;
    try {
      await deviceService.deleteDevice(deviceId);
      await fetchDevices();
      if (deviceId === selectedNodeId && nodes.length > 1) {
        const remaining = nodes.filter(n => n.id !== deviceId);
        setSelectedNodeId(remaining[0]?.id || "");
      }
    } catch (error) {
      // Error handled silently
    }
  };

  const toggleNodeStatus = async () => {
    if (!selectedNodeId || !selectedNode) return;

    // ✅ CRITICAL FIX: Throttle rapid clicks (2-second cooldown)
    const throttleKey = `toggle-${selectedNodeId}`;
    if (!actionThrottler.canExecute(throttleKey, 2000)) {
      const remaining = actionThrottler.getRemainingCooldown(throttleKey, 2000);
      toast.info(`Please wait ${Math.ceil(remaining / 1000)}s before clicking again`);
      return;
    }

    // 🔥 MULTI-DEVICE FIX: Check if we're stopping THIS device or starting a different one
    const isStoppingCurrentDevice = isNodeActive && runningDeviceId === selectedNodeId;
    const isStartingDifferentDevice = isNodeActive && runningDeviceId !== selectedNodeId;

    if (isStoppingCurrentDevice) {
      // User clicked stop on the currently running device
      setIsStopping(true);
      try {
        // 1. Clear uptime interval
        if (uptimeInterval) {
          clearInterval(uptimeInterval);
          setUptimeInterval(null);
        }

        // 2. FIXED: Cancel pending task warmup timeouts
        if (taskWarmupTimeout) {
          clearTimeout(taskWarmupTimeout);
          setTaskWarmupTimeout(null);
        }
        taskWarmupService.cancelWarmup();
        
        // 2.5. FIXED: Clear all tasks from Redux to prevent ghost tasks
        const { resetTasks } = await import('@/lib/store/slices/taskSlice');
        dispatch(resetTasks());

        // 3. ✅ CRITICAL: Stop node in Redux FIRST (prevents warmup from starting tasks)
        dispatch(stopNode());
        
        // 4. Stop task engine (prevents more tasks from processing)
        const { stopTaskEngine } = await import('@/lib/store/taskEngine');
        stopTaskEngine();
        
        // 5. ✅ OPTIMIZATION: Run final sync and session stop in parallel
        const finalRemaining = Math.max(0, remainingUptime - currentUptime);
        await Promise.allSettled([
          nodeControlService.syncUptime(selectedNodeId, finalRemaining),
          nodeControlService.stopSession(selectedNodeId, sessionToken),
        ]);
        
        // 6. Clear local state
        setSessionToken(null);
        setRemainingUptime(0);
        
        // 🔒 Clear session from SessionManager
        SessionManager.clearSession(selectedNodeId);
        setRunningDeviceId(null); // Clear running device ID
        
        // 7. ✅ OPTIMIZATION: Invalidate cache and fetch devices once
        requestDeduplicator.invalidate(`devices-${user?.id}`);
        await fetchDevices();
      } catch (error) {
        // Error handled silently
      } finally {
        setIsStopping(false);
      }
    } else {
      // Starting a node (either first device or additional device)
      if (isStartingDifferentDevice) {
        // 🚀 MULTI-DEVICE: User wants to start a different device while one is running
        toast.info(`Device ${runningDeviceId?.substring(0, 8)}... will continue running in background`);
      }
      
      setIsStarting(true);
      try {
        // 🔒 CRITICAL: Check for active session in other tab
        const activeSession = SessionManager.hasActiveSessionInOtherTab(selectedNodeId);
        if (activeSession) {
          setIsViewOnlyMode(true);
          setOtherTabSessionInfo({
            tabId: activeSession.tabId,
            timestamp: activeSession.timestamp,
            sessionToken: activeSession.sessionToken,
            deviceId: activeSession.deviceId
          });
          setShowMultiTabDialog(true); // Show dialog instead of toast
          setIsStarting(false);
          return;
        }
        
        const planName = planDetails?.name || 'free';
        const limits = getPlanLimits(planName);
        
        // 1. Get remaining time from DB (countdown approach)
        const device = nodes.find(n => n.id === selectedNodeId);
        let dbRemainingTime = device?.uptime || limits.maxUptime;
        
        // CRITICAL FIX: If uptime > maxUptime, it means backend was accumulating (bug)
        // Reset to full allowance and sync to backend
        if (dbRemainingTime > limits.maxUptime) {
          dbRemainingTime = limits.maxUptime;
          
          // Sync corrected value to backend immediately
          try {
            await nodeControlService.syncUptime(selectedNodeId, limits.maxUptime);
          } catch (err) {
            // Error handled silently
          }
        }
        
        // 2. Check if time remaining
        if (dbRemainingTime <= 0) {
          const formatTime = (sec: number) => {
            const h = Math.floor(sec / 3600);
            const m = Math.floor((sec % 3600) / 60);
            return `${h}h ${m}m`;
          };
          toast.warning(`No time remaining for ${planName} plan. Daily limit: ${formatTime(limits.maxUptime)}. Wait for daily reset.`);
          setIsStarting(false);
          return;
        }

        // 3. Clear any stale session first
        try {
          await nodeControlService.stopSession(selectedNodeId, null);
        } catch (err) {
          // Ignore errors, session might not exist
        }

        // 4. Start fresh session
        const token = await nodeControlService.startSession(selectedNodeId, activeTabId || '');
        setSessionToken(token);
        setRemainingUptime(dbRemainingTime); // Set countdown timer
        
        // 🔒 Register session in SessionManager to prevent multi-tab exploitation
        SessionManager.registerSession(selectedNodeId, token || '', new Date().toISOString());
        setRunningDeviceId(selectedNodeId); // Track which device is running
        
        setIsViewOnlyMode(false);
        setOtherTabSessionInfo(null);
        
        // 5. Register device hardware if needed (for Redux validation)
        if (selectedNode) {
          const deviceType = (selectedNode.device_type || 'desktop') as 'desktop' | 'laptop' | 'tablet' | 'mobile';
          const deviceGroup = (deviceType === 'mobile' || deviceType === 'tablet') ? 'mobile_tablet' : 'desktop_laptop';
          
          dispatch(registerDevice({
            cpuCores: 4, // Default value
            deviceMemory: '8GB', // Default value
            deviceType: deviceType,
            gpuInfo: selectedNode.gpu_model || 'Unknown GPU',
            deviceGroup: deviceGroup,
            rewardTier: selectedNode.hardware_tier as 'webgpu' | 'wasm' | 'webgl' | 'cpu',
          }));
        }
        
        // 6. Start node in Redux (resets currentUptime to 0)
        dispatch(startNode());
        
        // 7. Refresh devices to get updated status
        await fetchDevices();
        
        // 8. ✅ FIXED: Delayed warmup - let stop cancel via clearTimeout only
        const warmupTimeoutId = setTimeout(() => {
          taskWarmupService.startWithWarmup({
            nodeId: selectedNodeId,
            hardwareTier: limits.maxUptime >= 14400 ? 'webgpu' : 'cpu',
            dispatch,
            plan: planName // ✅ PLAN-BASED: Pass subscription plan for rate limiting
          });
          
          // 10. Set up uptime sync interval (syncs remaining time every 60s)
          const interval = setInterval(() => {
            syncUptimeToBackend();
          }, 60000);
          setUptimeInterval(interval);
          
          setTaskWarmupTimeout(null); // Clear after execution
        }, 4000); // Combined delay (4 seconds)
        
        setTaskWarmupTimeout(warmupTimeoutId);
      } catch (error: any) {
        if (error.message?.includes("already has an active session")) {
          toast.error("Session conflict detected. Please refresh and try again.");
          nodeControlService.clearLocalSession(selectedNodeId);
        }
      } finally {
        setIsStarting(false);
      }
    }
  };
  
  const handleTakeOverSession = async () => {
    // ✅ FIXED: Allow takeover even if otherTabSessionInfo is null (for cross-browser sessions)
    if (!selectedNodeId || !selectedNode) return;
    
    setIsStarting(true);
    try {
      // Get remaining time before starting
      const device = nodes.find(n => n.id === selectedNodeId);
      const planName = planDetails?.name || 'free';
      const limits = getPlanLimits(planName);
      const dbRemainingTime = device?.uptime || limits.maxUptime;
      
      // 🔥 USE BACKEND force_takeover FEATURE (stops old session automatically)
      const token = await nodeControlService.startSession(selectedNodeId, activeTabId || '', true); // force_takeover = true
      setSessionToken(token);
      setRemainingUptime(dbRemainingTime);
      
      // 🔒 Take over session (works for both same-browser and cross-browser sessions)
      SessionManager.takeOverSession(selectedNodeId, token || '', new Date().toISOString());
      setRunningDeviceId(selectedNodeId); // Track which device is running
      toast.info('Session transferred to this tab successfully');
      
      setIsViewOnlyMode(false);
      setOtherTabSessionInfo(null);
      setShowMultiTabDialog(false); // Close dialog
      
      // Register device hardware if needed
      if (selectedNode) {
        const deviceType = (selectedNode.device_type || 'desktop') as 'desktop' | 'laptop' | 'tablet' | 'mobile';
        const deviceGroup = (deviceType === 'mobile' || deviceType === 'tablet') ? 'mobile_tablet' : 'desktop_laptop';
        
        dispatch(registerDevice({
          cpuCores: 4,
          deviceMemory: '8GB',
          deviceType: deviceType,
          gpuInfo: selectedNode.gpu_model || 'Unknown GPU',
          deviceGroup: deviceGroup,
          rewardTier: selectedNode.hardware_tier as 'webgpu' | 'wasm' | 'webgl' | 'cpu',
        }));
      }
      
      // 3. Start node
      dispatch(startNode());
      
      // 3. Start task pipeline with warmup (async)
      taskWarmupService.startWithWarmup({
        nodeId: selectedNodeId,
        hardwareTier: selectedNode.hardware_tier,
        dispatch,
      });
      
      // 4. Set up uptime sync interval
      const interval = setInterval(() => {
        syncUptimeToBackend();
      }, 60000);
      setUptimeInterval(interval);
      
      await fetchDevices();
    } catch (error) {
      toast.error("Failed to start node. Please try again.");
    } finally {
      setIsStarting(false);
    }
  };

  const handleClaimRewards = async () => {
    if (unclaimedRewards <= 0 || isNodeActive || isClaiming) return;
    
    setIsClaiming(true);
    try {
      const result = await earningsService.claimRewards();
      
      // Handle different response formats from backend
      if (result && typeof result === 'object') {
        const newEarnings = result.new_total_earnings || result.new_balance || 0;
        setTotalEarnings(newEarnings);
        setUnclaimedRewards(0);
        dispatch(resetSessionEarnings());
      }
      
      // Refresh from backend to sync
      await fetchEarnings();
    } catch (error) {
      toast.error("Failed to claim rewards. Please try again.");
    } finally {
      setIsClaiming(false);
    }
  };


  useEffect(() => {
    setIsMounted(true);
    
    // 🔒 Initialize SessionManager with unique tab ID
    const tabId = SessionManager.initializeTab();
    setActiveTabId(tabId);
    
    let hasStoppedNode = false;
    
    const checkActiveSession = () => {
      if (!selectedNodeId) return;
      
      const storedSession = localStorage.getItem(`device_session_${selectedNodeId}`);
      if (storedSession) {
        try {
          const session = JSON.parse(storedSession);
          if (session.tabId !== tabId && Date.now() - session.timestamp < 300000) {
            setIsViewOnlyMode(true);
            setOtherTabSessionInfo({
              tabId: session.tabId,
              timestamp: session.timestamp
            });
            
            if (!hasStoppedNode && node.isActive) {
              hasStoppedNode = true;
              dispatch(stopNode());
            }
          } else if (session.tabId === tabId) {
            setIsViewOnlyMode(false);
            setOtherTabSessionInfo(null);
            hasStoppedNode = false;
          }
        } catch (e) {
          localStorage.removeItem(`device_session_${selectedNodeId}`);
        }
      } else {
        setIsViewOnlyMode(false);
        setOtherTabSessionInfo(null);
        hasStoppedNode = false;
      }
    };
    
    checkActiveSession();
    // ✅ FIXED: Increased from 3s to 10s to reduce API load
    const interval = setInterval(checkActiveSession, 10000);
    
    return () => {
      clearInterval(interval);
      if (selectedNodeId && activeTabId) {
        const storedSession = localStorage.getItem(`device_session_${selectedNodeId}`);
        if (storedSession) {
          try {
            const session = JSON.parse(storedSession);
            if (session.tabId === tabId) {
              localStorage.removeItem(`device_session_${selectedNodeId}`);
            }
          } catch (e) {}
        }
      }
    };
  }, [selectedNodeId, dispatch, node.isActive]);

  // ✅ FIXED: Fetch initial data only once on mount (removed functions from deps)
  useEffect(() => {
    if (user?.id && isMounted) {
      fetchDevices();
      fetchEarnings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isMounted]);

  // ✅ FIXED: Fetch earnings on session change (removed debounce - was breaking updates)
  useEffect(() => {
    if (sessionEarnings > 0) {
      fetchEarnings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionEarnings]);

  useEffect(() => {
    return () => {
      if (uptimeInterval) {
        clearInterval(uptimeInterval);
      }
    };
  }, [uptimeInterval]);

  // 🔥 NEW: Listen for session takeover from other tabs
  useEffect(() => {
    if (!selectedNodeId || !isNodeActive) return;
    
    // Setup listener to detect when another tab takes over THIS device's session
    const cleanup = SessionManager.setupTakeoverListener(selectedNodeId, () => {
      toast.warning('Session taken over by another tab');
      
      // Force stop this tab's node immediately
      dispatch(stopNode());
      setIsViewOnlyMode(true);
      setSessionToken(null);
      setRunningDeviceId(null);
      
      // Clear intervals
      if (uptimeInterval) {
        clearInterval(uptimeInterval);
        setUptimeInterval(null);
      }
      if (taskWarmupTimeout) {
        clearTimeout(taskWarmupTimeout);
        setTaskWarmupTimeout(null);
      }
    });
    
    return cleanup; // Cleanup listener on unmount
  }, [selectedNodeId, isNodeActive, dispatch, uptimeInterval, taskWarmupTimeout]);

  // Monitor countdown and auto-stop when time runs out
  useEffect(() => {
    if (isNodeActive && remainingUptime > 0) {
      const timeLeft = remainingUptime - currentUptime;
      
      if (timeLeft <= 0) {
        toast.info("Daily time limit reached. Node stopped automatically.");
        toggleNodeStatus(); // This will stop the node
      }
    }
  }, [currentUptime, remainingUptime, isNodeActive]);

  return {
    user,
    planDetails,
    selectedNodeId,
    setSelectedNodeId,
    nodes,
    selectedNode,
    isLoadingDevices,
    isMounted,
    isStarting,
    showMultiTabDialog,
    setShowMultiTabDialog,
    isStopping,
    isNodeActive,
    currentUptime,
    remainingUptime,
    unclaimedRewards,
    totalEarnings,
    isClaiming,
    isViewOnlyMode,
    otherTabSessionInfo,
    handleScanComplete,
    handleDeleteDevice,
    toggleNodeStatus,
    handleTakeOverSession,
    handleClaimRewards,
    runningDeviceId, // 🔥 Export running device ID
  };
};
