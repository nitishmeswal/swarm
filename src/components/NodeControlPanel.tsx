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

export const NodeControlPanel = () => {
  const dispatch = useAppDispatch();
  const { node, earnings } = useAppSelector(state => state);
  const currentUptime = useAppSelector(selectCurrentUptime);
  const totalEarnings = useAppSelector(selectTotalEarnings);
  const sessionEarnings = useAppSelector(selectSessionEarnings);
  
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
  
  // Demo nodes for the dropdown - in a real implementation, these would come from your data source
  const [nodes, setNodes] = useState<NodeInfo[]>([
    {
      id: "1",
      name: "My Desktop",
      type: "desktop",
      rewardTier: "webgpu",
      status: "idle",
      gpuInfo: "NVIDIA GeForce RTX 3080"
    }
  ]);
  
  // For demo purposes - in a real implementation this would be derived from the selected node ID
  const selectedNode = nodes.find(node => node.id === selectedNodeId);
  
  const handleNodeSelect = (value: string) => {
    setSelectedNodeId(value);
    // Additional logic for selecting a node would go here
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

  const handleScanComplete = (hardwareInfo: HardwareInfo) => {
    // Register the device
    dispatch(registerDevice(hardwareInfo));
    setShowScanDialog(false);
    console.log('Device registered:', hardwareInfo);
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

  const startScan = () => {
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
                  {!selectedNode && <span>Select Node</span>}
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
                        setSelectedNodeId(node.id);
                        setShowDeleteConfirmDialog(true);
                      }}
                    >
                      <button
                        type="button"
                        className="p-1.5 rounded-full hover:bg-red-500/20 focus:outline-none"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="default"
              disabled={isStarting || isStopping}
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
                  {(node.hardwareInfo?.rewardTier || 'CPU').toUpperCase()}
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
                  {node.isRegistered ? '1' : '0'}
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
                  title={node.hardwareInfo?.gpuInfo || 'N/A'}
                >
                  {node.hardwareInfo?.gpuInfo || 'N/A'}
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
      <Dialog open={showScanDialog} onOpenChange={setShowScanDialog}>
        <DialogContent className="sm:max-w-md bg-[#0A1A2F] border-[#112544]">
          <DialogHeader>
            <DialogTitle className="text-white">
              Scanning Device Hardware
            </DialogTitle>
            <DialogDescription className="text-white/70">
              Analyzing your device capabilities to determine the optimal reward
              tier
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
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
              onClick={() => setShowDeleteConfirmDialog(false)}
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
        isOpen={showScanDialog && !isScanning}
        onClose={() => setShowScanDialog(false)}
        onScanComplete={handleScanComplete}
      />
    </>
  );
};
