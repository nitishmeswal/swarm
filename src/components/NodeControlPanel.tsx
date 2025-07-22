"use client";

import React, { useState, useEffect } from "react";
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
import { registerDevice, startNode, stopNode, selectCurrentUptime } from "@/lib/store/slices/nodeSlice";
import { selectTotalEarnings, selectSessionEarnings } from "@/lib/store/slices/earningsSlice";
import { resetTasks } from "@/lib/store/slices/taskSlice";
import { formatUptime, TASK_CONFIG } from "@/lib/store/config";
import { HardwareInfo } from "@/lib/store/types";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const { node, earnings } = useAppSelector(state => state);
  const currentUptime = useAppSelector(selectCurrentUptime);
  const totalEarnings = useAppSelector(selectTotalEarnings);
  const sessionEarnings = useAppSelector(selectSessionEarnings);
  const { user } = useAuth();
  const supabase = createClient();
  
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [showScanDialog, setShowScanDialog] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStage, setScanStage] = useState("");
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [isDeletingNode, setIsDeletingNode] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasFetchedDevices, setHasFetchedDevices] = useState(false);
  const [customDeviceName, setCustomDeviceName] = useState("");
  const [scannedHardwareInfo, setScannedHardwareInfo] = useState<HardwareInfo | null>(null);
  const [showNameInputDialog, setShowNameInputDialog] = useState(false);
  const [scanCompleted, setScanCompleted] = useState(false);
  const [deletingNodeId, setDeletingNodeId] = useState<string | null>(null);
  
  // Replace static nodes with state
  const [nodes, setNodes] = useState<NodeInfo[]>([]);
  
  // Ensure hydration safety
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch user devices from Supabase
  useEffect(() => {
    if (!user?.id || hasFetchedDevices) return;
    
    const fetchUserDevices = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('devices')
          .select('*')
          .eq('owner', user.id);
        
        if (error) {
          console.error("Error fetching devices:", error);
          return;
        }
        
        const mappedNodes: NodeInfo[] = data.map((device: SupabaseDevice) => ({
          id: device.id,
          name: device.device_name || `My ${device.device_type.charAt(0).toUpperCase() + device.device_type.slice(1)}`,
          type: device.device_type,
          rewardTier: device.reward_tier || 'cpu',
          status: device.status === 'online' ? 'running' : device.status === 'offline' ? 'idle' : 'offline',
          gpuInfo: device.gpu_model
        }));
        
        setNodes(mappedNodes);
        
        if (mappedNodes.length > 0 && !selectedNodeId) {
          setSelectedNodeId(mappedNodes[0].id);
        }
        
        setHasFetchedDevices(true);
      } catch (err) {
        console.error("Exception while fetching devices:", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserDevices();
  }, [user?.id, hasFetchedDevices]); // Only depend on user ID and fetch flag
  
  // For demo purposes - in a real implementation this would be derived from the selected node ID
  const selectedNode = nodes.find(node => node.id === selectedNodeId);
  
  const handleNodeSelect = (value: string) => {
    setSelectedNodeId(value);
    // Additional logic for selecting a node would go here
  };

  const deleteDevice = async (deviceId: string) => {
    if (!deviceId || !user?.id) return;
    
    try {
      const { error } = await supabase
        .from('devices')
        .delete()
        .eq('id', deviceId)
        .eq('owner', user.id);
        
      if (error) {
        console.error("Error deleting device:", error);
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
    if (node.isActive) {
      setIsStopping(true);
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
      setTimeout(() => {
        dispatch(startNode());
        setIsStarting(false);
      }, 2000);
    }
  };

  const handleScanComplete = async (hardwareInfo: HardwareInfo) => {
    // Store the hardware info and show name input in the same dialog
    setScannedHardwareInfo(hardwareInfo);
    setCustomDeviceName(`My ${hardwareInfo.deviceType?.charAt(0).toUpperCase() || 'D'}${hardwareInfo.deviceType?.slice(1) || 'evice'}`);
    setScanCompleted(true);
    setIsScanning(false);
    // Don't close the scan dialog, just mark it as completed
  };
  
  const completeDeviceRegistration = async () => {
    if (!scannedHardwareInfo || !user?.id) return;
    
    // Register the device in Redux store
    dispatch(registerDevice(scannedHardwareInfo));
    
    // Save the device to Supabase with custom name
    try {
      const { data, error } = await supabase.from('devices').insert({
        owner: user.id,
        gpu_model: scannedHardwareInfo.gpuInfo,
        device_type: scannedHardwareInfo.deviceType || 'desktop',
        reward_tier: scannedHardwareInfo.rewardTier,
        device_name: customDeviceName.trim() || `My ${scannedHardwareInfo.deviceType?.charAt(0).toUpperCase() || 'D'}${scannedHardwareInfo.deviceType?.slice(1) || 'evice'}`,
        status: 'offline'
      }).select();
      
      if (error) {
        console.error("Error saving device to Supabase:", error);
      } else if (data) {
        // Add the new device to the nodes list
        const newDevice = data[0] as SupabaseDevice;
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
    } finally {
      // Reset scan state and close the dialog
      setScanCompleted(false);
      setShowScanDialog(false);
      setScannedHardwareInfo(null);
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

  const resetScan = () => {
    // Reset scan state for a new scan
    setScanCompleted(false);
    setIsScanning(false);
    setScannedHardwareInfo(null);
    setScanProgress(0);
    setScanStage("");
  };

  const startScan = () => {
    resetScan();
    setShowScanDialog(true);
    setIsScanning(true);
    setScanProgress(0);
    setScanStage("Detecting device type...");

    setTimeout(() => {
      setScanProgress(20);
      setScanStage("Analyzing system capabilities...");
      
      setTimeout(() => {
        setScanProgress(60);
        setScanStage("Detecting hardware tier...");
        
        setTimeout(() => {
          setScanProgress(100);
          setScanStage("Scan complete!");
          setIsScanning(false);
          setScanCompleted(true);
          const mockHardwareInfo: HardwareInfo = {
            cpuCores: 8,
            deviceMemory: "8 GB",
            gpuInfo: "ANGLE (Intel, Intel(R) UHD Graphics, OpenGL 4.6)",
            deviceGroup: 'desktop_laptop',
            deviceType: 'laptop',
            rewardTier: 'cpu'
          };
          setScannedHardwareInfo(mockHardwareInfo);
          setCustomDeviceName(`My ${mockHardwareInfo.deviceType?.charAt(0).toUpperCase() || 'D'}${mockHardwareInfo.deviceType?.slice(1) || 'evice'}`);
        }, 1000);
      }, 800);
    }, 1000);
  };

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
              onClick={startScan}
              disabled={isScanning}
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
                    </>
                  )}
                  {!selectedNode && <span>{isLoading ? "Loading nodes..." : "No nodes available"}</span>}
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
              disabled={isStarting || isStopping || !selectedNodeId}
              onClick={toggleNodeStatus}
              className={`rounded-full transition-all duration-300 shadow-md hover:shadow-lg text-white text-xs sm:text-sm px-3 py-1 sm:px-4 sm:py-2 h-9 sm:h-10 hover:translate-y-[-0.5px] ${
                node.isActive
                  ? "bg-red-600 hover:bg-red-700 hover:shadow-red-500/30 shadow-red-500"
                  : "bg-green-600 hover:bg-green-700 hover:shadow-green-500/30 shadow-green-500"
              }`}
            >
              {isStarting && (
                <>
                  <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 animate-spin" />
                  Starting...
                </>
              )}
              {isStopping && (
                <>
                  <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 animate-spin" />
                  Stopping...
                </>
              )}
              {!isStarting && !isStopping && (
                <>
                  {node.isActive ? "Stop Node" : "Start Node"}
                  {!node.isActive ? (
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
              <div className="text-[#515194] text-xs mb-1">Node Uptime</div>
              <div className="flex items-center">
                <div className="icon-bg mt-2 icon-container flex items-center justify-center rounded-md p-2">
                  <img src="/images/active_nodes.png" alt="NLOV" className="w-8 h-8 object-contain" />
                </div>
                <div className="text-lg font-medium text-white ml-3 mt-2">
                  {formatUptime(currentUptime)}
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
            className="p-4 sm:p-6 flex flex-row items-center justify-between rounded-xl sm:rounded-2xl border border-blue-800/30 relative overflow-hidden gap-4 bg-blue-900/10"
          >
            <div className="flex items-center gap-4 z-10">
              <img
                src="/images/nlov-coin.png"
                alt="coin"
                className="w-11 h-11 object-contain z-10"
              />
              <span className="text-white/90 text-2xl whitespace-nowrap transition-all duration-500">
                Total Earnings
              </span>
            </div>
            <div className="flex items-baseline gap-2 z-10 flex-shrink-0">
              <span className="font-medium lg:text-4xl md:text-3xl sm:text-2xl text-blue-400 leading-none">
                {totalEarnings.toFixed(2)}
              </span>
              <span className="text-white/90 text-sm">NLOV</span>
            </div>
            <p className="absolute bottom-2 right-4 text-[10px] text-white/50 italic">
              Session: +{sessionEarnings.toFixed(2)} NLOV
            </p>
          </div>
        </div>
      </div>
      
      {/* Hardware Scan Dialog */}
      <Dialog open={showScanDialog} onOpenChange={(open) => {
        if (!open) {
          resetScan();
        }
        setShowScanDialog(open);
      }}>
        <DialogContent className="sm:max-w-lg bg-[#0A1A2F] border-[#112544] p-0 overflow-hidden">
          <div className="p-6">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-white text-xl font-medium">Hardware Scan Results</h2>
            </div>

            {!scanCompleted && !scannedHardwareInfo && (
              <div>
                <div className="mb-2 text-sm font-medium text-white">
                  {scanStage}
                </div>
                <div className="w-full bg-[#112544] rounded-full h-2.5">
                  <div
                    className="bg-[#0066FF] h-2.5 rounded-full transition-all duration-300 ease-in-out"
                    style={{ width: `${scanProgress}%` }}
                  ></div>
                </div>
                <div className="mt-4 text-sm text-white/70">
                  {scanProgress < 100
                    ? "Please wait while we analyze your device. Do not close this window."
                    : "Scan completed successfully!"}
                </div>
              </div>
            )}

            {scanCompleted && scannedHardwareInfo && (
              <div>
                {/* Success icon */}
                <div className="flex justify-center mb-6">
                  <div className="w-16 h-16 rounded-full bg-green-800/30 flex items-center justify-center">
                    <div className="text-green-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                {/* Device tier heading */}
                <div className="text-center mb-5">
                  <h3 className="text-white text-xl">
                    Your Device Tier: <span className="text-gray-400">{scannedHardwareInfo.rewardTier.toUpperCase()}</span>
                  </h3>
                  <p className="text-gray-400 text-sm">
                    CPU-based processing - Basic rewards
                  </p>
                </div>
                
                {/* Hardware specs box */}
                <div className="bg-[#111827] rounded-lg p-4 mb-6">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-gray-400">Device Type:</span>
                    <span className="text-white text-right">{scannedHardwareInfo.deviceType}</span>
                  </div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-gray-400">CPU Cores:</span>
                    <span className="text-white text-right">{scannedHardwareInfo.cpuCores}</span>
                  </div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-gray-400">Memory:</span>
                    <span className="text-white text-right">{scannedHardwareInfo.deviceMemory}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">GPU:</span>
                    <span className="text-white text-right truncate max-w-[70%]" title={scannedHardwareInfo.gpuInfo}>
                      {scannedHardwareInfo.gpuInfo}
                    </span>
                  </div>
                </div>
                
                {/* Device name input */}
                <div className="mb-6">
                  <Label htmlFor="deviceName" className="text-white mb-2 block">Device Name</Label>
                  <Input
                    id="deviceName"
                    value={customDeviceName}
                    onChange={(e) => setCustomDeviceName(e.target.value)}
                    placeholder="Enter a name for your device"
                    className="bg-[#111827] border-0 text-white w-full focus:ring-1 focus:ring-blue-500 focus-visible:ring-offset-0 py-2"
                  />
                </div>

                {/* Action buttons */}
                <div className="flex gap-3">
                  <Button
                    onClick={completeDeviceRegistration}
                    className="bg-blue-600 hover:bg-blue-700 text-white flex-1 py-2"
                  >
                    Register Device
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => resetScan()}
                    className="border-[#112544] text-white hover:bg-[#112544]/30 py-2"
                  >
                    Scan Again
                  </Button>
                </div>
                
                {/* Form link */}
                <div className="text-center mt-5 text-xs text-gray-500">
                  Think this scan result is incorrect?
                  <br />
                  <a href="#" className="text-blue-500 hover:underline">Submit Device Validation Form</a>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

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

      {/* Original Hardware Scan Dialog - kept for functionality */}
      <HardwareScanDialog
        isOpen={showScanDialog && !isScanning && !scanCompleted}
        onClose={() => setShowScanDialog(false)}
        onScanComplete={handleScanComplete}
      />
    </>
  );
};
