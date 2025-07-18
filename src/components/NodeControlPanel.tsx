"use client";

import React, { useState, useEffect } from "react";
import { 
  CpuChipIcon, 
  ClockIcon, 
  PlayIcon, 
  StopIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  DeviceTabletIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  ExclamationTriangleIcon
} from "@heroicons/react/24/outline";
import { InfoTooltip } from "./InfoTooltip";
import { Button } from "./ui/button";
import { HardwareScanDialog } from "./HardwareScanDialog";
import { useAppDispatch, useAppSelector } from "@/lib/store";
import { registerDevice, startNode, stopNode, selectCurrentUptime } from "@/lib/store/slices/nodeSlice";
import { selectTotalEarnings, selectSessionEarnings } from "@/lib/store/slices/earningsSlice";
import { formatUptime, TASK_CONFIG } from "@/lib/store/config";
import { HardwareInfo } from "@/lib/store/types";

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

  const getDeviceIcon = (type: "desktop" | "laptop" | "tablet" | "mobile") => {
    switch (type) {
      case "desktop":
        return <ComputerDesktopIcon className="w-6 h-6" />;
      case "laptop":
        return <ComputerDesktopIcon className="w-6 h-6" />;
      case "tablet":
        return <DeviceTabletIcon className="w-6 h-6" />;
      case "mobile":
        return <DevicePhoneMobileIcon className="w-6 h-6" />;
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

  return (
    <div className="node-control-panel p-2.5 sm:p-4 md:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 border border-slate-700 overflow-x-hidden">
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
            className="gradient-button rounded-full text-blue-400 text-xs sm:text-sm px-2 py-1 sm:px-3 sm:py-2 border-slate-600 hover:bg-slate-700"
          >
            <MagnifyingGlassIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            Scan Device
          </Button>
        </div>

        <div className="flex flex-row gap-2 sm:gap-4 items-center mb-3 sm:mb-6">
          <div className="flex-1 bg-slate-700 border-0 rounded-full text-slate-300 text-xs sm:text-sm h-9 sm:h-10 px-3 flex items-center">
            {node.isRegistered ? (
              <span className="flex items-center gap-2">
                {getDeviceIcon(node.hardwareInfo?.deviceType || 'desktop')}
                {(node.hardwareInfo?.rewardTier || 'cpu').toUpperCase()}
              </span>
            ) : (
              <span className="text-slate-500">No device registered</span>
            )}
          </div>

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
                <div className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Starting...
              </>
            )}
            {isStopping && (
              <>
                <div className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Stopping...
              </>
            )}
            {!isStarting && !isStopping && (
              <>
                {node.isActive ? "Stop Node" : "Start Node"}
                {!node.isActive ? (
                  <PlayIcon className="text-white/90 ml-1 sm:ml-2 w-4 h-4" />
                ) : (
                  <StopIcon className="text-white/90 ml-1 sm:ml-2 w-4 h-4" />
                )}
              </>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-3 sm:mb-6">
          <div className="p-2 sm:p-4 rounded-xl bg-slate-700 flex flex-col">
            <div className="flex items-center gap-1.5 sm:gap-3 mb-0.5 sm:mb-2">
              <div className="icon-bg flex items-center justify-center p-1 sm:p-2 bg-yellow-500/20 rounded-lg">
                <div className="w-5 h-5 sm:w-7 sm:h-7 bg-yellow-500 rounded-full z-10" />
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-slate-400 text-[10px] sm:text-sm whitespace-nowrap">
                  Reward Tier
                </span>
                <div className={`text-sm sm:text-xl font-medium ${getRewardTierColor(node.hardwareInfo?.rewardTier || 'cpu')}`}>
                  {(node.hardwareInfo?.rewardTier || 'cpu').toUpperCase()}
                </div>
              </div>
            </div>
          </div>

          <div className="p-2 sm:p-4 rounded-xl bg-slate-700 flex flex-col">
            <div className="flex items-center gap-1.5 sm:gap-3 mb-0.5 sm:mb-2">
              <div className="icon-bg flex items-center justify-center p-1 sm:p-2 bg-blue-500/20 rounded-lg">
                <ClockIcon className="w-5 h-5 sm:w-7 sm:h-7 text-blue-500 z-10" />
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-slate-400 text-[10px] sm:text-sm whitespace-nowrap">
                  Node Uptime
                </span>
                <div className="text-sm sm:text-xl font-medium text-white">
                  {formatUptime(currentUptime)}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-3 sm:mb-6">
          <div className="p-2 sm:p-4 rounded-xl bg-slate-700 flex flex-col">
            <div className="flex items-center gap-1.5 sm:gap-3 mb-0.5 sm:mb-2">
              <div className="icon-bg flex items-center justify-center p-1 sm:p-2 bg-green-500/20 rounded-lg">
                <div className="w-5 h-5 sm:w-7 sm:h-7 bg-green-500 rounded-full z-10" />
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-slate-400 text-[10px] sm:text-sm whitespace-nowrap">
                  Connected Devices
                </span>
                <div className="text-sm sm:text-xl font-medium text-white">
                  {node.isRegistered ? '1' : '0'}
                </div>
              </div>
            </div>
          </div>

          <div className="p-2 sm:p-4 rounded-xl bg-slate-700 flex flex-col">
            <div className="flex items-center gap-1.5 sm:gap-3 mb-0.5 sm:mb-2">
              <div className="icon-bg flex items-center justify-center p-1 sm:p-2 bg-purple-500/20 rounded-lg">
                <CpuChipIcon className="w-5 h-5 sm:w-7 sm:h-7 text-purple-500 z-10" />
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-slate-400 text-[10px] sm:text-sm whitespace-nowrap">
                  GPU Model
                </span>
                <div className="text-sm sm:text-xl font-medium text-white">
                  {node.hardwareInfo?.gpuInfo || 'N/A'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div 
          className="p-4 sm:p-6 flex flex-row items-center justify-between rounded-xl sm:rounded-2xl bg-gradient-to-r from-slate-800 to-slate-700 border border-blue-500/30 relative overflow-hidden gap-4"
        >
          <div className="flex items-center gap-4 z-10">
            <div className="flex items-center justify-center flex-shrink-0">
              <div className="w-11 h-11 bg-yellow-500 rounded-full flex items-center justify-center">
                <span className="text-black font-bold text-lg">$</span>
              </div>
            </div>
            <span className="text-white/90 text-2xl whitespace-nowrap transition-all duration-500">
              Total Earnings
            </span>
          </div>
          <div className="flex items-baseline gap-2 z-10 flex-shrink-0">
            <span className="font-medium lg:text-4xl md:text-3xl sm:text-2xl text-transparent bg-clip-text bg-gradient-to-b from-blue-400 to-blue-600 leading-none">
              {totalEarnings.toFixed(2)}
            </span>
            <span className="text-white/90 text-sm">NLOV</span>
          </div>
          <p className="absolute bottom-2 right-4 text-[10px] text-white/50 italic">
            Session: +{sessionEarnings.toFixed(2)} NLOV
          </p>
        </div>
      </div>
      
      {/* Hardware Scan Dialog */}
      <HardwareScanDialog
        isOpen={showScanDialog}
        onClose={() => setShowScanDialog(false)}
        onScanComplete={handleScanComplete}
      />
    </div>
  );
};
