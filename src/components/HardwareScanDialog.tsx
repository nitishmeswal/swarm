"use client";

import React, { useState } from "react";
import { X, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { detectHardware } from "@/lib/hardwareDetection";

interface HardwareInfo {
  cpuCores: number;
  deviceMemory: number | string;
  gpuInfo: string;
  deviceGroup: 'desktop_laptop' | 'mobile_tablet';
  deviceType?: 'desktop' | 'laptop' | 'tablet' | 'mobile';
  rewardTier: 'webgpu' | 'wasm' | 'webgl' | 'cpu';
  customDeviceName?: string;
}

interface HardwareScanDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onScanComplete: (hardwareInfo: HardwareInfo) => void;
}

type ScanStep = 'scanning' | 'analyzing' | 'complete';

const LoadingSpinner = () => (
  <div className="flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
  </div>
);

const ScanningDialog = ({ step, onClose }: { step: ScanStep; onClose: () => void }) => {
  return (
    <DialogContent className="sm:max-w-[400px] bg-slate-800 border-slate-700 text-white">
      <DialogHeader className="flex flex-row items-center justify-between">
        <DialogTitle className="text-lg font-semibold">
          {step === 'scanning' ? 'Scanning Device Hardware' : 'Analyzing system capabilities...'}
        </DialogTitle>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </DialogHeader>

      <div className="py-8 text-center">
        <LoadingSpinner />
        <p className="mt-4 text-sm text-gray-300">
          {step === 'scanning' 
            ? 'Analyzing your device capabilities to determine the optimal reward tier. Please wait while we analyze your device. Do not close this window.'
            : 'Please wait while we analyze your device. Do not close this window.'
          }
        </p>
        
        {step === 'analyzing' && (
          <div className="mt-4 bg-blue-500/20 border border-blue-500/30 rounded-lg p-3">
            <div className="flex items-center justify-center gap-2">
              <div className="animate-pulse h-2 w-2 bg-blue-500 rounded-full"></div>
              <div className="animate-pulse h-2 w-2 bg-blue-500 rounded-full" style={{ animationDelay: '0.2s' }}></div>
              <div className="animate-pulse h-2 w-2 bg-blue-500 rounded-full" style={{ animationDelay: '0.4s' }}></div>
            </div>
            <p className="text-xs text-blue-300 mt-2">Analyzing system capabilities...</p>
          </div>
        )}
      </div>
    </DialogContent>
  );
};

const ResultsDialog = ({ 
  hardwareInfo, 
  onClose, 
  onRegister, 
  onScanAgain 
}: { 
  hardwareInfo: HardwareInfo; 
  onClose: () => void;
  onRegister: () => void;
  onScanAgain: () => void;
}) => {
  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'webgpu': return 'text-green-400';
      case 'wasm': return 'text-blue-400';
      case 'webgl': return 'text-yellow-400';
      case 'cpu': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const getTierDescription = (tier: string) => {
    switch (tier) {
      case 'webgpu': return 'High-performance GPU with WebGPU support - Maximum rewards';
      case 'wasm': return 'High-performance system with WASM support - High rewards';
      case 'webgl': return 'WebGL-capable device - Medium rewards';
      case 'cpu': return 'CPU-based processing - Basic rewards';
      default: return 'Basic processing capabilities';
    }
  };

  return (
    <DialogContent className="sm:max-w-[500px] bg-slate-800 border-slate-700 text-white">
      <DialogHeader className="flex flex-row items-center justify-between">
        <DialogTitle className="text-lg font-semibold">Hardware Scan Results</DialogTitle>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </DialogHeader>

      <div className="py-4">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-full mb-4">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <h3 className="text-xl font-semibold mb-2">
            Your Device Tier: <span className={`${getTierColor(hardwareInfo.rewardTier)} uppercase`}>
              {hardwareInfo.rewardTier}
            </span>
          </h3>
          <p className="text-sm text-gray-300">
            {getTierDescription(hardwareInfo.rewardTier)}
          </p>
        </div>

        <div className="space-y-3 bg-slate-900/50 rounded-lg p-4 border border-slate-700">
          <div className="flex justify-between">
            <span className="text-gray-300">Device Type:</span>
            <span className="font-medium capitalize">{hardwareInfo.deviceType || 'Unknown'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-300">CPU Cores:</span>
            <span className="font-medium">{hardwareInfo.cpuCores}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-300">Memory:</span>
            <span className="font-medium">
              {typeof hardwareInfo.deviceMemory === 'number' 
                ? `${hardwareInfo.deviceMemory} GB` 
                : hardwareInfo.deviceMemory}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-300">GPU:</span>
            <span className="font-medium text-right max-w-[200px] truncate" title={hardwareInfo.gpuInfo}>
              {hardwareInfo.gpuInfo}
            </span>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <Button
            onClick={onRegister}
            className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white"
          >
            Register Device
          </Button>
          <Button
            onClick={onScanAgain}
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            Scan Again
          </Button>
        </div>

        <div className="mt-4 text-center">
          <p className="text-xs text-gray-400">
            Think this scan result is incorrect?
          </p>
          <button 
            onClick={() => {
              // Handle validation form submission
              console.log('Opening validation form...');
            }}
            className="text-xs text-blue-400 hover:text-blue-300 underline mt-1"
          >
            Submit Device Validation Form
          </button>
        </div>
      </div>
    </DialogContent>
  );
};

const DeviceNamingDialog = ({ 
  hardwareInfo, 
  onClose, 
  onConfirm 
}: { 
  hardwareInfo: HardwareInfo; 
  onClose: () => void;
  onConfirm: (deviceName: string) => void;
}) => {
  const [deviceName, setDeviceName] = React.useState(
    `My ${hardwareInfo.deviceType?.charAt(0).toUpperCase() || 'D'}${hardwareInfo.deviceType?.slice(1) || 'evice'}`
  );

  const handleRegister = () => {
    if (deviceName.trim()) {
      onConfirm(deviceName.trim());
    }
  };

  return (
    <DialogContent className="sm:max-w-[400px] bg-slate-800 border-slate-700 text-white">
      <DialogHeader className="flex flex-row items-center justify-between">
        <DialogTitle className="text-lg font-semibold">Name Your Device</DialogTitle>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </DialogHeader>

      <div className="py-4">
        <p className="text-sm text-gray-300 mb-4">
          Give your device a memorable name to help identify it in your dashboard.
        </p>
        
        <div className="mb-6">
          <input
            type="text"
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value)}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter device name"
            maxLength={50}
          />
        </div>

        <div className="flex gap-3">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            Cancel
          </Button>
          <Button
            onClick={handleRegister}
            disabled={!deviceName.trim()}
            className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Register
          </Button>
        </div>
      </div>
    </DialogContent>
  );
};

export const HardwareScanDialog: React.FC<HardwareScanDialogProps> = ({
  isOpen,
  onClose,
  onScanComplete
}) => {
  const [scanStep, setScanStep] = useState<ScanStep>('scanning');
  const [hardwareInfo, setHardwareInfo] = useState<HardwareInfo | null>(null);
  const [showNamingDialog, setShowNamingDialog] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const startScan = async () => {
    if (isScanning) return;
    
    setIsScanning(true);
    setScanStep('scanning');
    
    try {
      // Show scanning step for at least 1 second
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setScanStep('analyzing');
      
      // Show analyzing step for at least 1 second while detecting
      const [result] = await Promise.all([
        detectHardware(),
        new Promise(resolve => setTimeout(resolve, 1000))
      ]);
      
      setHardwareInfo(result);
      setScanStep('complete');
      
    } catch (error) {
      console.error('Hardware scan failed:', error);
      // Handle error - could show error dialog
    } finally {
      setIsScanning(false);
    }
  };

  const handleRegister = () => {
    if (hardwareInfo) {
      // Show device naming dialog instead of registering immediately
      setShowNamingDialog(true);
    }
  };

  const handleScanAgain = () => {
    setHardwareInfo(null);
    startScan();
  };

  const handleDeviceNaming = (deviceName: string) => {
    if (hardwareInfo) {
      // Pass hardware info with custom device name to parent
      onScanComplete({ ...hardwareInfo, customDeviceName: deviceName });
      onClose();
    }
  };

  const handleNamingCancel = () => {
    setShowNamingDialog(false);
  };

  // Start scan when dialog opens
  React.useEffect(() => {
    if (isOpen && !isScanning && !hardwareInfo) {
      startScan();
    }
  }, [isOpen]);

  // Reset state when dialog closes
  React.useEffect(() => {
    if (!isOpen) {
      setHardwareInfo(null);
      setScanStep('scanning');
      setIsScanning(false);
      setShowNamingDialog(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {showNamingDialog && hardwareInfo ? (
        <DeviceNamingDialog
          hardwareInfo={hardwareInfo}
          onClose={handleNamingCancel}
          onConfirm={handleDeviceNaming}
        />
      ) : scanStep === 'complete' && hardwareInfo ? (
        <ResultsDialog
          hardwareInfo={hardwareInfo}
          onClose={onClose}
          onRegister={handleRegister}
          onScanAgain={handleScanAgain}
        />
      ) : (
        <ScanningDialog step={scanStep} onClose={onClose} />
      )}
    </Dialog>
  );
};
