"use client";

import React, { useState, useEffect, useRef } from "react";
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
import { useAuth } from "@/contexts/AuthContext";
import { usePlan } from "@/contexts/PlanContext";

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

// Interface to match the Supabase devices table
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
  } = useNodeUptime();

  const { processReferralRewards } = useReferrals();

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
  const initializedDevicesRef = useRef<Set<string>>(new Set());
  const lastAutoSaveRef = useRef<number>(0);
  const autoStopInProgressRef = useRef<boolean>(false);

  // Replace static nodes with state
  const [nodes, setNodes] = useState<NodeInfo[]>([]);

  // Robust unclaimed rewards management system
  const fetchUnclaimedRewards = async () => {
    if (!user?.id) return;

    try {
      setIsLoadingUnclaimedRewards(true);
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

        // On page load, reset session earnings to start fresh
        // This prevents double-counting from previous sessions
        dispatch(resetSessionEarnings());
        setLastSavedSessionEarnings(0);

        console.log("Loaded unclaimed rewards from DB:", dbRewards);
      } else {
        console.error("Failed to fetch unclaimed rewards:", response.status);
      }
    } catch (error) {
      console.error("Error fetching unclaimed rewards:", error);
    } finally {
      setIsLoadingUnclaimedRewards(false);
    }
  };

  const saveSessionEarningsToDb = async (forceSkipConcurrencyCheck = false) => {
    if (!user?.id || sessionEarnings <= 0) return false;

    // Prevent concurrent saves unless forced
    if (isSavingToDb && !forceSkipConcurrencyCheck) {
      console.log("Skipping save - already saving to DB");
      return false;
    }

    // Prevent rapid auto-saves (minimum 10 seconds between auto-saves)
    const now = Date.now();
    if (!forceSkipConcurrencyCheck && now - lastAutoSaveRef.current < 10000) {
      console.log("Skipping auto-save - too frequent");
      return false;
    }

    setIsSavingToDb(true);
    const currentSessionEarnings = sessionEarnings; // Capture current value

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
        console.log(
          `✅ Saved session earnings to DB: ${currentSessionEarnings} (new total: ${newDbTotal})`
        );

        // Update local state to reflect the save
        setDbUnclaimedRewards(newDbTotal);
        setLastSavedSessionEarnings(currentSessionEarnings);
        lastAutoSaveRef.current = now;

        // Clear session earnings since they're now saved to DB
        dispatch(resetSessionEarnings());

        return true;
      } else {
        console.error(
          "❌ Failed to save session earnings to DB:",
          response.status
        );
        return false;
      }
    } catch (error) {
      console.error("❌ Error saving session earnings to DB:", error);
      return false;
    } finally {
      setIsSavingToDb(false);
    }
  };

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
        console.log("Reset all unclaimed rewards to 0");
        setDbUnclaimedRewards(0);
        setLastSavedSessionEarnings(0);
        dispatch(resetSessionEarnings());
        return true;
      } else {
        console.error("Failed to reset unclaimed rewards:", response.status);
        return false;
      }
    } catch (error) {
      console.error("Error resetting unclaimed rewards:", error);
      return false;
    }
  };

  // Ensure hydration safety
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Load user earnings on initial mount
  useEffect(() => {
    if (user?.id && isMounted) {
      loadTotalEarnings();
      fetchUnclaimedRewards();
    }
  }, [user?.id, isMounted]);

  // Auto-save session earnings periodically when node is running
  useEffect(() => {
    if (!user?.id || sessionEarnings <= 0 || !node.isActive) return;

    // Auto-save session earnings every 60 seconds when node is running
    const autoSaveInterval = setInterval(() => {
      if (node.isActive || isDeviceRunning(selectedNodeId)) {
        console.log(
          "🔄 Auto-save interval triggered - Session earnings:",
          sessionEarnings
        );
        saveSessionEarningsToDb(false); // Don't force, respect concurrency controls
      }
    }, 60000); // 60 seconds

    return () => {
      clearInterval(autoSaveInterval);
      console.log("🔄 Auto-save interval cleared");
    };
  }, [sessionEarnings, user?.id, node.isActive, selectedNodeId]);

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

  // Robust page unload and visibility change handling
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (sessionEarnings > 0) {
        // Use sendBeacon for reliable data transmission on page unload
        const newDbTotal = dbUnclaimedRewards + sessionEarnings;
        const data = JSON.stringify({ amount: newDbTotal });
        const blob = new Blob([data], { type: "application/json" });
        navigator.sendBeacon("/api/unclaimed-rewards", blob);
        console.log(
          "Page unload: Saved session earnings via beacon:",
          sessionEarnings
        );
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && sessionEarnings > 0) {
        // Save session earnings when page becomes hidden (force save)
        console.log(
          "📱 Page hidden: Saving session earnings:",
          sessionEarnings
        );
        saveSessionEarningsToDb(true); // Force save, ignore concurrency controls
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [sessionEarnings, dbUnclaimedRewards, dispatch]);

  // For demo purposes - in a real implementation this would be derived from the selected node ID
  const selectedNode = nodes.find((node) => node.id === selectedNodeId);

  // Update display uptime every second for the selected device
  useEffect(() => {
    if (!selectedNodeId) return;

    const updateDisplayUptime = () => {
      const currentDeviceUptime = getCurrentUptime(selectedNodeId);
      setDisplayUptime(currentDeviceUptime);
    };

    // Update immediately
    updateDisplayUptime();

    // Update every second
    const interval = setInterval(updateDisplayUptime, 1000);

    return () => clearInterval(interval);
  }, [selectedNodeId, getCurrentUptime]);

  // Sync device uptime when selected device changes
  useEffect(() => {
    if (selectedNodeId && !isDeviceRunning(selectedNodeId)) {
      // Only sync once per device selection, not continuously
      const timeoutId = setTimeout(() => {
        syncDeviceUptime(selectedNodeId);
      }, 100); // Small delay to prevent rapid calls

      return () => clearTimeout(timeoutId);
    }
  }, [selectedNodeId]); // Only depend on selectedNodeId, not the functions

  // Fetch user devices from Supabase
  useEffect(() => {
    if (!user?.id || hasFetchedDevices) return;

    const fetchUserDevices = async () => {
      setIsLoadingDevices(true);
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
              device.status === "online"
                ? "running"
                : device.status === "offline"
                ? "idle"
                : "offline",
            gpuInfo: device.gpu_model,
          })
        );

        setNodes(mappedNodes);

        // Register existing devices in Redux store so they can be started without hardware scan
        if (devices.length > 0 && !node.isRegistered) {
          const firstDevice = devices[0];
          const hardwareInfo: HardwareInfo = {
            gpuInfo: firstDevice.gpu_model,
            rewardTier: firstDevice.reward_tier || "cpu",
            deviceType: firstDevice.device_type,
            // Add other required fields with reasonable defaults
            cpuCores: 4, // Default values since this info isn't stored in DB
            deviceMemory: "8GB",
            deviceGroup:
              firstDevice.device_type === "mobile" ||
              firstDevice.device_type === "tablet"
                ? "mobile_tablet"
                : "desktop_laptop",
          };
          dispatch(registerDevice(hardwareInfo));
        }

        // Initialize device uptimes with server data (only once per device)
        mappedNodes.forEach((node) => {
          if (!initializedDevicesRef.current.has(node.id)) {
            const serverUptime =
              Number(
                devices.find((d: SupabaseDevice) => d.id === node.id)?.uptime
              ) || 0;
            initializeDeviceUptime(node.id, serverUptime);
            initializedDevicesRef.current.add(node.id);
          }
        });

        if (mappedNodes.length > 0 && !selectedNodeId) {
          setSelectedNodeId(mappedNodes[0].id);
        }

        setHasFetchedDevices(true);
      } catch (err) {
        console.error("Exception while fetching devices:", err);
      } finally {
        setIsLoadingDevices(false);
      }
    };

    fetchUserDevices();
  }, [user?.id, hasFetchedDevices]); // Keep minimal dependencies

  const handleNodeSelect = (value: string) => {
    setSelectedNodeId(value);
    // Don't sync immediately here, let the useEffect handle it with a delay
  };

  const deleteDevice = async (deviceId: string) => {
    if (!deviceId || !user?.id) return;

    try {
      const response = await fetch(`/api/devices?id=${deviceId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.error(
          "Error deleting device:",
          response.status,
          response.statusText
        );
        return false;
      } else {
        // Remove the node from the list
        setNodes((prevNodes) =>
          prevNodes.filter((node) => node.id !== deviceId)
        );

        // If we deleted the currently selected node, select another one if available
        if (deviceId === selectedNodeId) {
          if (nodes.length > 1) {
            const nextNodeId = nodes.find((node) => node.id !== deviceId)?.id;
            setSelectedNodeId(nextNodeId || "");
          } else {
            setSelectedNodeId("");
          }
        }
        return true;
      }
    } catch (err) {
      console.error("Exception while deleting device:", err);
      return false;
    }
  };

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

  // Check if current uptime exceeds plan limit
  const checkUptimeLimit = () => {
    const currentUptime = getCurrentUptime(selectedNodeId);
    const maxUptime = getMaxUptime();
    return currentUptime >= maxUptime;
  };

  // Check device limits
  const checkDeviceLimit = () => {
    return !canAddDevice(nodes.length);
  };

  // Update restriction states and auto-stop node if uptime exceeded
  useEffect(() => {
    if (selectedNodeId) {
      const isUptimeExceeded = checkUptimeLimit();
      setUptimeExceeded(isUptimeExceeded);
      
      // Auto-stop node if uptime limit is exceeded and node is currently running
      // Use ref to prevent multiple auto-stop calls
      if (isUptimeExceeded && 
          (node.isActive || isDeviceRunning(selectedNodeId)) && 
          !autoStopInProgressRef.current && 
          !isStopping) {
        
        console.log('⏰ Uptime limit exceeded, automatically stopping node...');
        autoStopInProgressRef.current = true; // Set flag to prevent multiple calls
        setIsStopping(true);
        
        const autoStopNode = async () => {
          try {
            // Save any unsaved session earnings before stopping the node
            if (sessionEarnings > 0) {
              console.log(
                "🛑 Auto-stop: Saving session earnings to DB:",
                sessionEarnings
              );
              const saveSuccess = await saveSessionEarningsToDb(true); // Force save
              if (!saveSuccess) {
                console.error(
                  "❌ Failed to save session earnings before auto-stopping node"
                );
              }
            }
    
            // Stop uptime tracking and update server
            const result = await stopDeviceUptime(selectedNodeId);
    
            if (result.success) {
              console.log("Node auto-stopped and uptime updated successfully");
            } else {
              console.error("Failed to update uptime during auto-stop:", result.error);
            }
          } catch (error) {
            console.error("Error during auto-stop:", error);
          }
    
          setTimeout(() => {
            dispatch(stopNode());
            dispatch(resetTasks()); // Clear all proxy tasks when node stops
            setIsStopping(false);
            autoStopInProgressRef.current = false; // Reset flag after completion
            setShowUptimeLimitDialog(true); // Show upgrade dialog
            console.log(`✅ Auto-stop completed. Uptime limit (${formatUptime(getMaxUptime())}) reached for ${currentPlan.toLowerCase()} plan.`);
          }, 2000);
        };
        
        autoStopNode();
      }
    }
    setDeviceLimitExceeded(checkDeviceLimit());
  }, [selectedNodeId, nodes.length, deviceUptimeList, node.isActive]);

  const toggleNodeStatus = async () => {
    if (!selectedNodeId) return;

    const deviceCurrentlyRunning = isDeviceRunning(selectedNodeId);

    if (deviceCurrentlyRunning || node.isActive) {
      setIsStopping(true);

      try {
        // Save any unsaved session earnings before stopping the node
        if (sessionEarnings > 0) {
          console.log(
            "🛑 Node stopping: Saving session earnings to DB:",
            sessionEarnings
          );
          const saveSuccess = await saveSessionEarningsToDb(true); // Force save
          if (!saveSuccess) {
            console.error(
              "❌ Failed to save session earnings before stopping node"
            );
          }
        }

        // Stop uptime tracking and update server
        const result = await stopDeviceUptime(selectedNodeId);

        if (result.success) {
          console.log("Node stopped and uptime updated successfully");
        } else {
          console.error("Failed to update uptime:", result.error);
        }
      } catch (error) {
        console.error("Error stopping node:", error);
      }

      setTimeout(() => {
        dispatch(stopNode());
        dispatch(resetTasks()); // Clear all proxy tasks when node stops
        setIsStopping(false);
      }, 2000);
    } else {
      // Check uptime limits before starting
      if (checkUptimeLimit()) {
        alert(`Node cannot start. Uptime limit (${formatUptime(getMaxUptime())}) reached for ${currentPlan.toLowerCase()} plan.`);
        return;
      }

      if (!node.isRegistered) {
        setShowScanDialog(true);
        return;
      }
      setIsStarting(true);

      // Start uptime tracking
      startDeviceUptime(selectedNodeId);

      setTimeout(() => {
        dispatch(startNode());
        setIsStarting(false);
      }, 2000);
    }
  };

  const handleScanComplete = async (
    hardwareInfo: HardwareInfo,
    deviceName: string
  ) => {
    if (!user?.id) return;

    // Check device limit before adding new device
    if (deviceLimitExceeded) {
      alert(`Device limit reached. Your ${currentPlan.toLowerCase()} plan allows ${planDetails.deviceLimit} device${planDetails.deviceLimit > 1 ? 's' : ''}.`);
      return;
    }

    // Register the device in Redux store
    dispatch(registerDevice(hardwareInfo));

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
      }
    } catch (err) {
      console.error("Exception while saving device:", err);
    }
  };

  const deleteSelectedNode = async () => {
    if (!selectedNodeId || !user?.id) return;

    setIsDeletingNode(true);
    try {
      const success = await deleteDevice(selectedNodeId);
      if (success) {
        setShowDeleteConfirmDialog(false);
      }
    } catch (err) {
      console.error("Exception while deleting device:", err);
    } finally {
      setIsDeletingNode(false);
    }
  };

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

  const handleClaimReward = async () => {
    const totalUnclaimedRewards = sessionEarnings + dbUnclaimedRewards;
    if (totalUnclaimedRewards <= 0) return;

    try {
      console.log(
        "Claiming total rewards:",
        totalUnclaimedRewards,
        "(Session:",
        sessionEarnings,
        "+ DB:",
        dbUnclaimedRewards,
        ")"
      );

      // First, save any unsaved session earnings to ensure we don't lose them
      if (sessionEarnings > 0) {
        console.log(
          "💰 Claiming: First saving unsaved session earnings:",
          sessionEarnings
        );
        const saveSuccess = await saveSessionEarningsToDb(true); // Force save before claiming
        if (!saveSuccess) {
          console.error("❌ Failed to save session earnings before claiming");
          return;
        }
      }

      // Recalculate total after potential save (should now be all in DB)
      const finalDbRewards =
        dbUnclaimedRewards + (sessionEarnings > 0 ? sessionEarnings : 0);

      // Claim the rewards
      const result = await claimTaskRewards(finalDbRewards);

      if (result) {
        // After successful claim, reset everything to 0
        const resetSuccess = await resetAllUnclaimedRewards();
        if (resetSuccess) {
          console.log("Successfully claimed and reset all rewards");
        }

        // Process referral rewards
        const { error } = await processReferralRewards(
          user!.id,
          finalDbRewards
        );

        if (error) {
          console.error("Error processing referral rewards:", error);
        }
      }
    } catch (error) {
      console.error("Error in reward claiming process:", error);
    }
  };

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
                  alert(`Device limit reached. Your ${currentPlan.toLowerCase()} plan allows ${planDetails.deviceLimit} device${planDetails.deviceLimit > 1 ? 's' : ''}. Current: ${nodes.length}`);
                  return;
                }
                setShowScanDialog(true);
              }}
              disabled={deviceLimitExceeded}
              className={`gradient-button rounded-full text-xs sm:text-sm px-2 py-1 sm:px-3 sm:py-2 ${
                deviceLimitExceeded 
                  ? 'opacity-50 cursor-not-allowed text-gray-400' 
                  : 'text-[#8BBEFF]'
              }`}
            >
              <Scan className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Scan Device
            </Button>
          </div>

          <div className="flex flex-row gap-2 sm:gap-4 items-center mb-3 sm:mb-6">
            <Select
              value={selectedNodeId}
              onValueChange={handleNodeSelect}
              open={isOpen}
              onOpenChange={setIsOpen}
            >
              <SelectTrigger className="w-full bg-[#1D1D33] border-0 rounded-full text-[#515194] text-xs sm:text-sm h-9 sm:h-10">
                <div className="flex items-center gap-2">
                  {selectedNode && (
                    <>
                      {getDeviceIcon(selectedNode.type)}
                      <span>{selectedNode.name}</span>
                      {isDeviceRunning(selectedNodeId) && (
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse ml-1"></div>
                      )}
                    </>
                  )}
                  {!selectedNode && (
                    <span>
                      {isLoadingDevices
                        ? "Loading nodes..."
                        : "No nodes available"}
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
                      </div>
                    </SelectItem>
                    <div
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        // Set the node as currently deleting
                        setDeletingNodeId(node.id);
                        // Delete the device directly
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

            <Button
              variant="default"
              disabled={
                isStarting || isStopping || isUpdatingUptime || !selectedNodeId || 
                (uptimeExceeded && !(node.isActive || isDeviceRunning(selectedNodeId)))
              }
              onClick={toggleNodeStatus}
              className={`rounded-full transition-all duration-300 shadow-md hover:shadow-lg text-white text-xs sm:text-sm px-3 py-1 sm:px-4 sm:py-2 h-9 sm:h-10 hover:translate-y-[-0.5px] ${
                node.isActive || isDeviceRunning(selectedNodeId)
                  ? "bg-red-600 hover:bg-red-700 hover:shadow-red-500/30 shadow-red-500"
                  : uptimeExceeded 
                  ? "bg-gray-600 hover:bg-gray-700 cursor-not-allowed opacity-50"
                  : "bg-green-600 hover:bg-green-700 hover:shadow-green-500/30 shadow-green-500"
              }`}
            >
              {(isStarting || isUpdatingUptime) && (
                <>
                  <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 animate-spin" />
                  {isUpdatingUptime ? "Updating..." : "Starting..."}
                </>
              )}
              {isStopping && (
                <>
                  <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 animate-spin" />
                  Stopping...
                </>
              )}
              {!isStarting && !isStopping && !isUpdatingUptime && (
                <>
                  {node.isActive || isDeviceRunning(selectedNodeId)
                    ? "Stop Node"
                    : uptimeExceeded
                    ? "Uptime Limit Reached"
                    : "Start Node"}
                  {!node.isActive && !isDeviceRunning(selectedNodeId) ? (
                    uptimeExceeded ? (
                      <AlertTriangle className="text-white/90 ml-1 sm:ml-2" />
                    ) : (
                      <VscDebugStart className="text-white/90 ml-1 sm:ml-2" />
                    )
                  ) : (
                    <IoStopOutline className="text-white/90 ml-1 sm:ml-2" />
                  )}
                </>
              )}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-3 sm:mb-6">
            <div className="p-4 rounded-xl bg-[#1D1D33] flex flex-col">
              <div className="text-[#515194] text-xs mb-1">Reward Tier</div>
              <div className="flex flex-col sm:flex-row sm:items-center">
                <div className="icon-bg mt-2 icon-container flex items-center justify-center rounded-md p-2 mx-auto sm:mx-0">
                  <img
                    src="/images/cpu_usage.png"
                    alt="NLOV"
                    className="w-8 h-8 object-contain"
                  />
                </div>
                <div className="text-lg font-medium text-white mt-2 text-center sm:text-left sm:ml-3">
                  {isMounted
                    ? (selectedNode?.rewardTier || "CPU").toUpperCase()
                    : "CPU"}
                </div>
              </div>
            </div>

            <div className={`p-4 rounded-xl flex flex-col ${
              uptimeExceeded ? 'bg-red-900/20 border border-red-500/30' : 'bg-[#1D1D33]'
            }`}>
              <div className="text-[#515194] text-xs mb-1 flex items-center justify-between">
                <span>Device Uptime</span>
                {uptimeExceeded && (
                  <span className="text-red-400 text-xs">LIMIT REACHED</span>
                )}
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center">
                <div className="icon-bg mt-2 icon-container flex items-center justify-center rounded-md p-2 mx-auto sm:mx-0">
                  <img
                    src="/images/active_nodes.png"
                    alt="NLOV"
                    className="w-8 h-8 object-contain"
                  />
                </div>
                <div className="flex flex-col mt-2 sm:ml-3 w-full">
                  <div className={`text-lg font-medium text-center sm:text-left ${
                    uptimeExceeded ? 'text-red-400' : 'text-white'
                  }`}>
                    {formatUptime(displayUptime)}
                  </div>
                  <div className="text-xs text-white/50 text-center sm:text-left">
                    of {formatUptime(getMaxUptime())}
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-gray-700 rounded-full h-1.5 mt-1">
                    <div 
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        uptimeExceeded ? 'bg-red-500' : displayUptime / getMaxUptime() > 0.8 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min((displayUptime / getMaxUptime()) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
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
                  <div className={`text-lg font-medium text-center sm:text-left ${
                    deviceLimitExceeded ? 'text-red-400' : 'text-white'
                  }`}>
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
                  className="text-sm text-white mt-2 text-center sm:text-left sm:ml-3 overflow-hidden w-full sm:w-[75%]"
                  title={selectedNode?.gpuInfo || "N/A"}
                >
                  {selectedNode?.gpuInfo || "N/A"}
                </div>
              </div>
            </div>
          </div>

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
                  {isLoadingEarnings
                    ? "..."
                    : sessionEarnings + dbUnclaimedRewards > 0
                    ? (sessionEarnings + dbUnclaimedRewards).toFixed(2)
                    : totalEarnings.toFixed(2)}
                </span>
                <span
                  className={`text-sm transition-all duration-300 ${
                    sessionEarnings + dbUnclaimedRewards > 0
                      ? "text-yellow-300"
                      : "text-white/90"
                  }`}
                >
                  {sessionEarnings + dbUnclaimedRewards > 0 ? "SP" : "NLOV"}
                </span>
              </div>
            </div>

            {sessionEarnings + dbUnclaimedRewards > 0 && (
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
                          NLOV
                        </span>
                      </span>
                      <div className="text-xs text-white/50 space-y-0.5">
                        {isLoadingUnclaimedRewards ? (
                          <div>Loading...</div>
                        ) : (
                          <>
                            {dbUnclaimedRewards > 0 && (
                              <div>
                                Saved: {dbUnclaimedRewards.toFixed(2)} NLOV
                              </div>
                            )}
                            {sessionEarnings > 0 && (
                              <div>
                                Session: {sessionEarnings.toFixed(2)} NLOV{" "}
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
                      <span className="text-red-400 text-xs">{earningsClaimError}</span>
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
                      isSavingToDb ||
                      sessionEarnings + dbUnclaimedRewards <= 0 ||
                      isLoadingUnclaimedRewards ||
                      node.isActive ||
                      isDeviceRunning(selectedNodeId)
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
                  Complete tasks to earn rewards
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

      {/* Uptime Limit Exceeded Dialog */}
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
              Your node has been automatically stopped because you've reached the uptime limit for your {currentPlan.toLowerCase()} plan.
              <br /><br />
              <span className="text-yellow-400">
                Current usage: {formatUptime(displayUptime)} of {formatUptime(getMaxUptime())}
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
                window.open('https://app.neurolov.ai/subscription', '_blank');
                setShowUptimeLimitDialog(false);
              }}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white w-full sm:w-auto"
            >
              Upgrade Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
