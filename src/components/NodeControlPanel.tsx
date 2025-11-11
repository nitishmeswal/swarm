"use client";

import React, { useState } from "react";
import {
  Clock,
  Laptop,
  Monitor,
  Tablet,
  Smartphone,
  Scan,
  Loader2,
  Trash2,
} from "lucide-react";
import { VscDebugStart } from "react-icons/vsc";
import { IoStopOutline } from "react-icons/io5";
import { InfoTooltip } from "@/components/InfoTooltip";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HardwareScanDialog } from "@/components/HardwareScanDialog";
import { MultiTabWarningDialog } from "@/components/MultiTabWarningDialog";
import { useNodeController } from "@/hooks/useNodeController";
import { extractGPUModel } from "@/lib/gpuUtils";
import { formatUptime } from "@/lib/store/config";

export const NodeControlPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showScanDialog, setShowScanDialog] = useState(false);
  const [localUptime, setLocalUptime] = useState(0); // ✅ Local ticker for smooth UI
  
  const {
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
    runningDeviceId,
  } = useNodeController();
  
  // Check if selected node is running (has active session in database)
  const selectedNodeIsRunning = selectedNode?.status === 'online';
  const selectedNodeIsRunningElsewhere = selectedNodeIsRunning && !isNodeActive;

  // 🔥 HANDLE DEVICE SWITCH: Stop running device before switching
  const handleDeviceChange = async (newDeviceId: string) => {
    // If a device is currently running AND user is switching to a DIFFERENT device
    if (isNodeActive && runningDeviceId && runningDeviceId !== newDeviceId) {
      console.log(`🔄 Switching from ${runningDeviceId} to ${newDeviceId} - stopping current device first`);
      
      // Stop the currently running device
      await toggleNodeStatus();
      
      // Wait a moment for stop to complete
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // ✅ CLEAR STALE DATA: Remove localStorage for old device to prevent stale uptime
    if (selectedNodeId) {
      localStorage.removeItem(`device_session_${selectedNodeId}`);
    }
    
    // Now switch to the new device
    setSelectedNodeId(newDeviceId);
  };

  // ✅ SINGLE SOURCE OF TRUTH: Backend uptime calculation
  const planMaxUptime = planDetails?.maxUptime || 14400;
  
  // Backend stores REMAINING time (countdown)
  const dbUptimeRemaining = selectedNode?.uptime || planMaxUptime;
  
  // Calculate ACCUMULATED time (count up for display)
  // Formula: accumulated = maxUptime - backend_remaining + current_session_elapsed
  const totalAccumulatedUptime = isNodeActive 
    ? planMaxUptime - dbUptimeRemaining + localUptime  // Active: base + current session
    : planMaxUptime - dbUptimeRemaining;                // Offline: just base from DB

  // ✅ FIXED: Smooth uptime ticker every second
  React.useEffect(() => {
    if (!isNodeActive) {
      setLocalUptime(0);
      return;
    }

    // Sync with Redux uptime
    setLocalUptime(currentUptime);

    // Tick every second
    const interval = setInterval(() => {
      setLocalUptime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isNodeActive, currentUptime]);

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case "desktop":
        return <Monitor className="w-6 h-6" />;
      case "laptop":
        return <Laptop className="w-6 h-6" />;
      case "tablet":
        return <Tablet className="w-6 h-6" />;
      case "mobile":
        return <Smartphone className="w-6 h-6" />;
      default:
        return <Monitor className="w-6 h-6" />;
    }
  };


  // Show guest state when not logged in
  if (!user) {
    return (
      <div className="node-control-panel p-4 md:p-6 rounded-3xl stat-card">
        <div className="flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-medium text-white/90">
                Node Control Panel
              </h2>
              <InfoTooltip content="Manage your computing nodes" />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowScanDialog(true)}
              disabled={true}
              className="gradient-button rounded-full opacity-50 cursor-not-allowed"
            >
              <Scan className="w-4 h-4 mr-2" />
              Scan Device
            </Button>
          </div>

          {/* Login Required Warning */}
          <div className="flex gap-4 items-center mb-6">
            <div className="w-3/4 bg-[#1D1D33] border-0 rounded-full px-4 py-3 text-[#515194]">
              Loading...
            </div>
            <Button
              disabled={true}
              className="w-1/4 rounded-full bg-gray-600 cursor-not-allowed opacity-50"
            >
              Login Required
            </Button>
          </div>

          {/* Warning Banner */}
          <div className="mb-6 px-4 py-3 rounded-xl bg-yellow-900/20 border border-yellow-500/30 flex items-center gap-3">
            <div className="text-yellow-400">⚠</div>
            <span className="text-sm text-yellow-400">Login required to start node and track uptime</span>
          </div>

          {/* First Row: Reward Tier + Uptime */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Reward Tier */}
            <div className="p-4 rounded-xl bg-[#1D1D33]">
              <div className="text-[#515194] text-xs mb-1">Reward Tier</div>
              <div className="flex items-center">
                <img
                  src="/images/coins.png"
                  className="w-8 h-8 mr-3"
                  alt="Coins"
                />
                <div className="text-lg font-medium text-white">N/A</div>
              </div>
            </div>

            {/* Uptime */}
            <div className="p-4 rounded-xl bg-[#1D1D33]">
              <div className="text-[#515194] text-xs mb-1">Device Uptime</div>
              <div className="flex items-center">
                <Clock className="w-7 h-7 text-white mr-3" />
                <div>
                  <div className="text-lg font-medium text-white">0h 0m 0s</div>
                  <div className="text-xs text-white/50">of 4h 0m 0s</div>
                </div>
              </div>
            </div>
          </div>

          {/* Second Row: Devices + GPU */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Connected Devices */}
            <div className="p-4 rounded-xl bg-[#1D1D33]">
              <div className="text-[#515194] text-xs mb-1">Connected Devices</div>
              <div className="flex items-center">
                <img
                  src="/images/devices.png"
                  className="w-8 h-8 mr-3"
                  alt="Devices"
                />
                <div>
                  <div className="text-lg font-medium text-white">0</div>
                  <div className="text-xs text-white/50">of 1</div>
                </div>
              </div>
            </div>

            {/* GPU Model */}
            <div className="p-4 rounded-xl bg-[#1D1D33]">
              <div className="text-[#515194] text-xs mb-1">GPU Model</div>
              <div className="flex items-center">
                <img
                  src="/images/gpu_model.png"
                  className="w-8 h-8 mr-3"
                  alt="GPU"
                />
                <div className="text-lg text-white truncate">Unknown</div>
              </div>
            </div>
          </div>

          {/* Earnings Section */}
          <div className="p-6 rounded-2xl border border-blue-800/30 bg-blue-900/10">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <img
                  src="/images/nlov-coin.png"
                  className="w-11 h-11"
                  alt="NLOV Coin"
                />
                <span className="text-2xl text-white/90">Total Earnings</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-medium text-blue-400">0.00</span>
                <span className="text-sm text-white/90">SP</span>
              </div>
            </div>

            {/* Info Text */}
            <div className="flex items-center justify-center border-t border-blue-800/30 pt-3 mt-4">
              <span className="text-white/50 text-sm">
                <i>*All Swarm Points will be converted to $NLOV after TGE</i>
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="node-control-panel p-4 md:p-6 rounded-3xl stat-card">
      <div className="flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-medium text-white/90">
              Node Control Panel
            </h2>
            <InfoTooltip content="Manage your computing nodes" />
            {isViewOnlyMode && (
              <div className="ml-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30">
                <span className="text-xs text-blue-400">View Only - Running in Another Tab</span>
              </div>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowScanDialog(true)}
            disabled={!user || nodes.length >= (planDetails?.deviceLimit || 1)}
            className="gradient-button rounded-full"
          >
            <Scan className="w-4 h-4 mr-2" />
            Scan Device
          </Button>
        </div>

        {/* Device Selector + Start/Stop Button */}
        <div className="flex gap-4 items-center mb-6">
          <Select
            value={selectedNodeId}
            onValueChange={handleDeviceChange}
            open={isOpen}
            onOpenChange={setIsOpen}
          >
            <SelectTrigger className="w-3/4 bg-[#1D1D33] border-0 rounded-full text-[#515194]">
              <div className="flex items-center gap-2">
                {isLoadingDevices ? (
                  <span>Loading...</span>
                ) : selectedNode ? (
                  <>
                    {getDeviceIcon(selectedNode.device_type || "desktop")}
                    <span>{selectedNode.device_name}</span>
                    {isNodeActive && (
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      </div>
                    )}
                  </>
                ) : (
                  <span>No devices</span>
                )}
              </div>
            </SelectTrigger>
            <SelectContent className="bg-[#0A1A2F] border-[#1E293B]">
              {nodes.map((device) => {
                const isOnline = device.status === 'online';
                return (
                  <div key={device.id} className="relative">
                    <SelectItem
                      value={device.id}
                      className="text-[#515194] hover:bg-[#1D1D33] pr-10"
                    >
                      <div className="flex items-center gap-2">
                        {getDeviceIcon(device.device_type || "desktop")}
                        <span>{device.device_name}</span>
                        {isOnline && (
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        )}
                      </div>
                    </SelectItem>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteDevice(device.id);
                      }}
                      disabled={isNodeActive}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-red-500/20"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                );
              })}
            </SelectContent>
          </Select>

          {(isViewOnlyMode && otherTabSessionInfo) || selectedNodeIsRunningElsewhere ? (
            <Button
              onClick={handleTakeOverSession}
              disabled={isStarting || !selectedNodeId || !user}
              className="w-1/4 rounded-full bg-blue-600 hover:bg-blue-700"
            >
              {isStarting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Taking Over...
                </>
              ) : (
                <>
                  <VscDebugStart className="mr-1" />
                  Switch Here
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={toggleNodeStatus}
              disabled={isStarting || isStopping || !selectedNodeId || !user}
              className={`w-1/4 rounded-full ${
                isNodeActive
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {isStarting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Starting...
                </>
              ) : isStopping ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Stopping...
                </>
              ) : isNodeActive ? (
                <>
                  <IoStopOutline className="mr-1" />
                  Stop Node
                </>
              ) : (
                <>
                  <VscDebugStart className="mr-1" />
                  Start Node
                </>
              )}
            </Button>
          )}
        </div>

        {/* First Row: Reward Tier + Uptime */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Reward Tier */}
          <div className="p-4 rounded-xl bg-[#1D1D33]">
            <div className="text-[#515194] text-xs mb-1">Reward Tier</div>
            <div className="flex items-center">
              <img
                src="/images/coins.png"
                className="w-8 h-8 mr-3"
                alt="Coins"
              />
              <div className="text-lg font-medium text-white">
                {isMounted ? (selectedNode?.hardware_tier.toUpperCase() || "N/A") : "N/A"}
              </div>
            </div>
          </div>

          {/* Uptime */}
          <div className="p-4 rounded-xl bg-[#1D1D33]">
            <div className="text-[#515194] text-xs mb-1">Uptime</div>
            <div className="flex items-center">
              <Clock className="w-7 h-7 text-white mr-3" />
              <div>
                <div className="text-lg font-medium text-white">
                  {isMounted ? formatUptime(Math.max(0, totalAccumulatedUptime)) : "0h 0m 0s"}
                </div>
                <div className="text-xs text-white/50">
                  Remaining: {isMounted ? formatUptime(Math.max(0, dbUptimeRemaining - (isNodeActive ? localUptime : 0))) : "0h 0m 0s"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Second Row: Devices + GPU */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Connected Devices */}
          <div className="p-4 rounded-xl bg-[#1D1D33]">
            <div className="text-[#515194] text-xs mb-1">Connected Devices</div>
            <div className="flex items-center">
              <img
                src="/images/devices.png"
                className="w-8 h-8 mr-3"
                alt="Devices"
              />
              <div>
                <div className="text-lg font-medium text-white">
                  {isMounted ? nodes.length : 0}
                </div>
                <div className="text-xs text-white/50">of {isMounted ? (planDetails?.deviceLimit || 1) : 1}</div>
              </div>
            </div>
          </div>

          {/* GPU Model */}
          <div className="p-4 rounded-xl bg-[#1D1D33]">
            <div className="text-[#515194] text-xs mb-1">GPU Model</div>
            <div className="flex items-center">
              <img
                src="/images/gpu_model.png"
                className="w-8 h-8 mr-3"
                alt="GPU"
              />
              <div className="text-lg text-white truncate">
                {isMounted ? extractGPUModel(selectedNode?.gpu_model || "N/A") : "N/A"}
              </div>
            </div>
          </div>
        </div>

        {/* Earnings Section */}
        <div className={`p-6 rounded-2xl border transition-colors ${
          unclaimedRewards > 0
            ? "border-yellow-500/30 bg-yellow-900/10"
            : "border-blue-800/30 bg-blue-900/10"
        }`}>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <img
                src="/images/nlov-coin.png"
                className="w-11 h-11"
                alt="NLOV Coin"
              />
              <span className="text-2xl text-white/90">
                {unclaimedRewards > 0 ? "Rewards Available" : "Total Earnings"}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-4xl font-medium ${
                unclaimedRewards > 0 ? "text-yellow-400" : "text-blue-400"
              }`}>
                {isMounted ? (unclaimedRewards > 0 ? unclaimedRewards.toFixed(2) : totalEarnings.toFixed(2)) : "0.00"}
              </span>
              <span className="text-sm text-white/90">SP</span>
            </div>
          </div>

          {/* Unclaimed Rewards Section */}
          {unclaimedRewards > 0 && (
            <div className="border-t border-yellow-500/30 pt-3 mt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-yellow-400" />
                  <div>
                    <div className="text-white font-medium">Unclaimed: +{unclaimedRewards.toFixed(2)} SP</div>
                    <div className="text-xs text-white/50">Saved: {unclaimedRewards.toFixed(2)} SP</div>
                  </div>
                </div>
              </div>
              <Button
                onClick={handleClaimRewards}
                disabled={isNodeActive || unclaimedRewards <= 0 || isClaiming}
                className="w-full bg-green-600 hover:bg-green-700 rounded-full"
              >
                {isClaiming ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Claiming...
                  </>
                ) : isNodeActive ? (
                  "Stop Node to Claim"
                ) : (
                  "Claim Rewards"
                )}
              </Button>
            </div>
          )}

          {/* Info Text */}
          {unclaimedRewards === 0 && (
            <div className="flex items-center justify-center border-t border-blue-800/30 pt-3 mt-4">
              <span className="text-white/50 text-sm">
                <i>*All Swarm Points will be converted to $NLOV after TGE</i>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Hardware Scan Dialog */}
      <HardwareScanDialog
        isOpen={showScanDialog}
        onClose={() => setShowScanDialog(false)}
        onScanComplete={handleScanComplete}
      />

      {/* Multi-Tab Warning Dialog */}
      <MultiTabWarningDialog
        isOpen={showMultiTabDialog}
        onClose={() => setShowMultiTabDialog(false)}
        onSwitchHere={handleTakeOverSession}
        userPlan={user?.plan || 'free'}
      />
    </div>
  );
};
