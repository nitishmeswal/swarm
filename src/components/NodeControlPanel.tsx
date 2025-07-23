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
  Trash2
} from "lucide-react";
import { VscDebugStart } from "react-icons/vsc";
import { IoStopOutline } from "react-icons/io5";
import { InfoTooltip } from "./InfoTooltip";
import { Button } from "./ui/button";
import { HardwareScanDialog } from "./HardwareScanDialog";
import { useAppDispatch, useAppSelector } from "@/lib/store";
import { registerDevice, startNode, stopNode, selectCurrentUptime, selectNode } from "@/lib/store/slices/nodeSlice";
import { selectTotalEarnings, selectSessionEarnings, selectEarnings } from "@/lib/store/slices/earningsSlice";
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
  const dispatch = useAppDispatch();
  const node = useAppSelector(selectNode);
  const earnings = useAppSelector(selectEarnings);
  const currentUptime = useAppSelector(selectCurrentUptime);
  const totalEarnings = useAppSelector(selectTotalEarnings);
  const sessionEarnings = useAppSelector(selectSessionEarnings);
  const { user } = useAuth();
  const supabase = createClient();
  const { 
    claimTaskRewards, 
    loadTotalEarnings, 
    isClaimingReward, 
    isLoading: isLoadingEarnings, 
    claimError, 
    claimSuccess, 
    resetClaimState 
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
    deviceUptimes: deviceUptimeList
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
  const [showClaimSuccess, setShowClaimSuccess] = useState(false);
  const [displayUptime, setDisplayUptime] = useState(0);
  const [dbUnclaimedRewards, setDbUnclaimedRewards] = useState(0);
  const [isLoadingUnclaimedRewards, setIsLoadingUnclaimedRewards] = useState(true);
  const initializedDevicesRef = useRef<Set<string>>(new Set());
  
  // Replace static nodes with state
  const [nodes, setNodes] = useState<NodeInfo[]>([]);

  // Functions to handle unclaimed rewards in database
  const fetchUnclaimedRewards = async () => {
    if (!user?.id) return;
    
    try {
      setIsLoadingUnclaimedRewards(true);
      const response = await fetch('/api/unclaimed-rewards', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const { unclaimed_reward } = await response.json();
        setDbUnclaimedRewards(unclaimed_reward || 0);
      } else {
        console.error('Failed to fetch unclaimed rewards:', response.status);
      }
    } catch (error) {
      console.error('Error fetching unclaimed rewards:', error);
    } finally {
      setIsLoadingUnclaimedRewards(false);
    }
  };

  const saveUnclaimedRewards = async (amount: number) => {
    if (!user?.id || amount <= 0) return;
    
    try {
      const response = await fetch('/api/unclaimed-rewards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount }),
      });
      
      if (!response.ok) {
        console.error('Failed to save unclaimed rewards:', response.status);
      }
    } catch (error) {
      console.error('Error saving unclaimed rewards:', error);
    }
  };

  const resetUnclaimedRewards = async () => {
    if (!user?.id) return;
    
    try {
      const response = await fetch('/api/unclaimed-rewards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount: 0 }),
      });
      
      if (response.ok) {
        setDbUnclaimedRewards(0);
      } else {
        console.error('Failed to reset unclaimed rewards:', response.status);
      }
    } catch (error) {
      console.error('Error resetting unclaimed rewards:', error);
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

  // Save unclaimed rewards before page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      const totalUnclaimed = sessionEarnings + dbUnclaimedRewards;
      if (totalUnclaimed > 0) {
        // Use sendBeacon with Blob for JSON data
        const data = JSON.stringify({ amount: totalUnclaimed });
        const blob = new Blob([data], { type: 'application/json' });
        navigator.sendBeacon('/api/unclaimed-rewards', blob);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        const totalUnclaimed = sessionEarnings + dbUnclaimedRewards;
        if (totalUnclaimed > 0) {
          saveUnclaimedRewards(totalUnclaimed);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [sessionEarnings, dbUnclaimedRewards, user?.id]);

  // For demo purposes - in a real implementation this would be derived from the selected node ID
  const selectedNode = nodes.find(node => node.id === selectedNodeId);

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
        const response = await fetch('/api/devices', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          console.error("Error fetching devices:", response.status, response.statusText);
          return;
        }
        
        const { devices } = await response.json();
        
        const mappedNodes: NodeInfo[] = devices.map((device: SupabaseDevice) => ({
          id: device.id,
          name: device.device_name || `My ${device.device_type.charAt(0).toUpperCase() + device.device_type.slice(1)}`,
          type: device.device_type,
          rewardTier: device.reward_tier || 'cpu',
          status: device.status === 'online' ? 'running' : device.status === 'offline' ? 'idle' : 'offline',
          gpuInfo: device.gpu_model
        }));
        
        setNodes(mappedNodes);
        
        // Initialize device uptimes with server data (only once per device)
        mappedNodes.forEach(node => {
          if (!initializedDevicesRef.current.has(node.id)) {
            const serverUptime = Number(devices.find((d: SupabaseDevice) => d.id === node.id)?.uptime) || 0;
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
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
        
      if (!response.ok) {
        console.error("Error deleting device:", response.status, response.statusText);
        return false;
      } else {
        // Remove the node from the list
        setNodes(prevNodes => prevNodes.filter(node => node.id !== deviceId));
        
        // If we deleted the currently selected node, select another one if available
        if (deviceId === selectedNodeId) {
          if (nodes.length > 1) {
            const nextNodeId = nodes.find(node => node.id !== deviceId)?.id;
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

  const toggleNodeStatus = async () => {
    if (!selectedNodeId) return;

    const deviceCurrentlyRunning = isDeviceRunning(selectedNodeId);
    
    if (deviceCurrentlyRunning || node.isActive) {
      setIsStopping(true);
      
      try {
        // Save unclaimed rewards before stopping the node
        const totalUnclaimed = sessionEarnings + dbUnclaimedRewards;
        if (totalUnclaimed > 0) {
          await saveUnclaimedRewards(totalUnclaimed);
          setDbUnclaimedRewards(totalUnclaimed);
        }

        // Stop uptime tracking and update server
        const result = await stopDeviceUptime(selectedNodeId);
        
        if (result.success) {
          console.log('Node stopped and uptime updated successfully');
        } else {
          console.error('Failed to update uptime:', result.error);
        }
      } catch (error) {
        console.error('Error stopping node:', error);
      }
      
      setTimeout(() => {
        dispatch(stopNode());
        dispatch(resetTasks()); // Clear all proxy tasks when node stops
        setIsStopping(false);
      }, 2000);
    } else {
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

  const handleScanComplete = async (hardwareInfo: HardwareInfo, deviceName: string) => {
    if (!user?.id) return;
    
    // Register the device in Redux store
    dispatch(registerDevice(hardwareInfo));
    
    // Save the device using API route
    try {
      const response = await fetch('/api/devices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gpu_model: hardwareInfo.gpuInfo,
          device_type: hardwareInfo.deviceType || 'desktop',
          reward_tier: hardwareInfo.rewardTier,
          device_name: deviceName,
        }),
      });
      
      if (!response.ok) {
        console.error("Error saving device:", response.status, response.statusText);
      } else {
        const { device } = await response.json();
        const newDevice = device as SupabaseDevice;
        const newNode: NodeInfo = {
          id: newDevice.id,
          name: newDevice.device_name || `My ${newDevice.device_type.charAt(0).toUpperCase() + newDevice.device_type.slice(1)}`,
          type: newDevice.device_type,
          rewardTier: newDevice.reward_tier || 'cpu',
          status: 'idle',
          gpuInfo: newDevice.gpu_model
        };
        
        setNodes(prevNodes => [...prevNodes, newNode]);
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
      case 'webgpu': return 'text-purple-400';
      case 'wasm': return 'text-blue-400';
      case 'webgl': return 'text-green-400';
      case 'cpu': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const handleClaimReward = async () => {
    const totalUnclaimedRewards = sessionEarnings + dbUnclaimedRewards;
    if (totalUnclaimedRewards <= 0) return;
    
    try {
      // First claim the rewards (using total unclaimed rewards)
      const result = await claimTaskRewards(totalUnclaimedRewards);
      
      if (result) {
        // After successful claim, reset database unclaimed rewards
        await resetUnclaimedRewards();
        
        // Process referral rewards
        const { error } = await processReferralRewards(user!.id, totalUnclaimedRewards);
        
        if (error) {
          console.error('Error processing referral rewards:', error);
        }
      }
    } catch (error) {
      console.error('Error in reward claiming process:', error);
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
              onClick={() => setShowScanDialog(true)}
              className="gradient-button rounded-full text-[#8BBEFF] text-xs sm:text-sm px-2 py-1 sm:px-3 sm:py-2"
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
                  {!selectedNode && <span>{isLoadingDevices ? "Loading nodes..." : "No nodes available"}</span>}
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
              disabled={isStarting || isStopping || isUpdatingUptime || !selectedNodeId}
              onClick={toggleNodeStatus}
              className={`rounded-full transition-all duration-300 shadow-md hover:shadow-lg text-white text-xs sm:text-sm px-3 py-1 sm:px-4 sm:py-2 h-9 sm:h-10 hover:translate-y-[-0.5px] ${
                node.isActive || isDeviceRunning(selectedNodeId)
                  ? "bg-red-600 hover:bg-red-700 hover:shadow-red-500/30 shadow-red-500"
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
                  {node.isActive || isDeviceRunning(selectedNodeId) ? "Stop Node" : "Start Node"}
                  {!node.isActive && !isDeviceRunning(selectedNodeId) ? (
                    <VscDebugStart className="text-white/90 ml-1 sm:ml-2" />
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
              <div className="flex items-center">
                <div className="icon-bg mt-2 icon-container flex items-center justify-center rounded-md p-2">
                  <img src="/images/cpu_usage.png" alt="NLOV" className="w-8 h-8 object-contain" />
                </div>
                <div className="text-lg font-medium text-white ml-3 mt-2">
                  {isMounted ? (selectedNode?.rewardTier || 'CPU').toUpperCase() : 'CPU'}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#1D1D33] flex flex-col">
              <div className="text-[#515194] text-xs mb-1">Device Uptime</div>
              <div className="flex items-center">
                <div className="icon-bg mt-2 icon-container flex items-center justify-center rounded-md p-2">
                  <img src="/images/active_nodes.png" alt="NLOV" className="w-8 h-8 object-contain" />
                </div>
                <div className="text-lg font-medium text-white ml-3 mt-2">
                  {formatUptime(displayUptime)}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-3 sm:mb-6">
            <div className="p-4 rounded-xl bg-[#1D1D33] flex flex-col">
              <div className="text-[#515194] text-xs mb-1">Connected Devices</div>
              <div className="flex items-center">
                <div className="icon-bg mt-2 icon-container flex items-center justify-center rounded-md p-2">
                  <img src="/images/devices.png" alt="NLOV" className="w-8 h-8 object-contain" />
                </div>
                <div className="text-lg font-medium text-white ml-3 mt-2">
                  {nodes.length}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#1D1D33] flex flex-col">
              <div className="text-[#515194] text-xs mb-1">GPU Model</div>
              <div className="flex items-start">
                <div className="icon-bg mt-2 icon-container flex items-center justify-center rounded-md p-2">
                  <img src="/images/gpu_model.png" alt="NLOV" className="w-8 h-8 object-contain" />
                </div>
                <div
                  className="text-sm text-white ml-3 mt-2 overflow-hidden w-[75%]"
                  title={selectedNode?.gpuInfo || 'N/A'}
                >
                  {selectedNode?.gpuInfo || 'N/A'}
                </div>
              </div>
            </div>
          </div>

          <div 
            className="p-4 sm:p-6 flex flex-col rounded-xl sm:rounded-2xl border border-blue-800/30 relative overflow-hidden gap-4 bg-blue-900/10"
          >
            <div className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-4 z-10">
                <img
                  src="/images/nlov-coin.png"
                  alt="coin"
                  className="w-11 h-11 object-contain z-10"
                />
                <div className="flex flex-col">
                  <span className="text-white/90 text-2xl whitespace-nowrap transition-all duration-500">
                    Total Earnings
                  </span>
                  {isLoadingEarnings && (
                    <span className="text-xs text-white/50">Loading earnings...</span>
                  )}
                </div>
              </div>
              <div className="flex items-baseline gap-2 z-10 flex-shrink-0">
                <span className={`font-medium lg:text-4xl md:text-3xl sm:text-2xl ${(sessionEarnings + dbUnclaimedRewards) > 0 ? 'text-white/50' : 'text-blue-400'} leading-none`}>
                  {isLoadingEarnings ? "..." : totalEarnings.toFixed(2)}
                </span>
                <span className="text-white/90 text-sm">NLOV</span>
              </div>
            </div>
            
            {(sessionEarnings + dbUnclaimedRewards) > 0 && (
              <div className="flex flex-col">
                <div className="flex items-center justify-between mt-2 border-t border-blue-800/30 pt-3">
                  <div className="flex items-center gap-2">
                    <img
                      src="/images/pending_reward.png"
                      alt="Unclaimed"
                      className="w-5 h-5 object-contain"
                    />
                    <div className="flex flex-col">
                      <span className="text-white text-base font-medium">
                        Unclaimed: <span className="text-blue-400">+{(sessionEarnings + dbUnclaimedRewards).toFixed(2)} NLOV</span>
                      </span>
                      <span className="text-xs text-white/50">
                        {isLoadingUnclaimedRewards ? "Loading..." : "Saved automatically - will persist until claimed"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3">
                  {claimError && <span className="text-red-400 text-xs">{claimError}</span>}
                  {showClaimSuccess && <span className="text-green-400 text-xs">Reward claimed successfully!</span>}
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleClaimReward}
                    disabled={isClaimingReward || (sessionEarnings + dbUnclaimedRewards) <= 0 || isLoadingUnclaimedRewards}
                    className="bg-green-600 hover:bg-green-700 hover:shadow-green-500/30 shadow-green-500 rounded-full text-white px-4 py-2 w-full"
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
                        Claim Rewards
                      </div>
                    )}
                  </Button>
                </div>
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

      <Dialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
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
    </>
  );
};
