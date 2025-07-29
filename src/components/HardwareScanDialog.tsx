"use client";

import React, { useState } from "react";
import { X, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { detectHardware } from "@/lib/hardwareDetection";
import { extractGPUModel } from "@/lib/gpuUtils";

interface HardwareInfo {
  cpuCores: number;
  deviceMemory: number | string;
  gpuInfo: string;
  deviceGroup: 'desktop_laptop' | 'mobile_tablet';
  deviceType?: 'desktop' | 'laptop' | 'tablet' | 'mobile';
  rewardTier: 'webgpu' | 'wasm' | 'webgl' | 'cpu';
}

interface HardwareScanDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onScanComplete: (hardwareInfo: HardwareInfo, deviceName: string) => void;
}

type ScanStep = 'scanning' | 'analyzing' | 'complete';

const LoadingSpinner = () => (
  <div className="flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
  </div>
);

const ScanningDialog = ({ step, onClose }: { step: ScanStep; onClose: () => void }) => {
  return (
    <DialogContent className="sm:max-w-[400px] bg-[#0A1A2F] border-[#112544] text-white">
      <DialogHeader className="flex flex-row items-center justify-between">
        <DialogTitle className="text-lg font-semibold">
          {step === 'scanning' ? 'Analyzing system capabilities...' : 'Analyzing system capabilities...'}
        </DialogTitle>

      </DialogHeader>

      <div className="py-8 text-center">
        <LoadingSpinner />
        <p className="mt-4 text-sm text-gray-300">
          Please wait while we analyze your device. Do not close this window.
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
  onRegister: (deviceName: string) => void;
  onScanAgain: () => void;
}) => {
  const [deviceName, setDeviceName] = useState("");

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'webgpu': return 'text-purple-400';
      case 'wasm': return 'text-blue-400';
      case 'webgl': return 'text-green-400';
      case 'cpu': return 'text-yellow-400';
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

  const handleRegister = () => {
    if (deviceName.trim()) {
      onRegister(deviceName.trim());
    }
  };

  return (
    <DialogContent className="sm:max-w-lg bg-[#0A1A2F] border-[#112544] text-white p-0 overflow-hidden">
      <div className="p-6">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-white text-xl font-medium">Hardware Scan Results</h2>

        </div>

        {/* Success icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-green-800/30 flex items-center justify-center">
            <div className="text-green-500">
              <CheckCircle className="h-10 w-10" />
            </div>
          </div>
        </div>

        {/* Device tier heading */}
        <div className="text-center mb-5">
          <h3 className="text-white text-xl">
            Your Device Tier: <span className={getTierColor(hardwareInfo.rewardTier)}>{hardwareInfo.rewardTier.toUpperCase()}</span>
          </h3>
          <p className="text-gray-400 text-sm">
            {getTierDescription(hardwareInfo.rewardTier)}
          </p>
        </div>

        {/* Hardware specs box */}
        <div className="bg-[#111827] rounded-lg p-4 mb-6 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Device Type:</span>
            <span className="text-white text-right capitalize">{hardwareInfo.deviceType || 'laptop'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">CPU Cores:</span>
            <span className="text-white text-right">{hardwareInfo.cpuCores}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Memory:</span>
            <span className="text-white text-right">
              {typeof hardwareInfo.deviceMemory === 'number'
                ? `${hardwareInfo.deviceMemory} GB`
                : hardwareInfo.deviceMemory}
            </span>
          </div>
          <div className="flex justify-between items-start">
            <span className="text-gray-400">GPU:</span>
            <span className="text-white text-right max-w-[60%] break-words" title={hardwareInfo.gpuInfo}>
              {extractGPUModel(hardwareInfo.gpuInfo)}
            </span>
          </div>
        </div>

        {/* Device name input */}
        <div className="mb-6">
          <Label htmlFor="deviceName" className="text-white mb-2 block text-sm">Device Name</Label>
          <Input
            id="deviceName"
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value)}
            placeholder="Name your device as you want"
            className="bg-[#111827] border-[#334155] text-white w-full focus:ring-1 focus:ring-blue-500 focus-visible:ring-offset-0 py-2 px-3 rounded-md"
          />
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mb-4">
          <Button
            onClick={handleRegister}
            disabled={!deviceName.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white flex-1 py-2 rounded-md"
          >
            Register Device
          </Button>
          <Button
            variant="outline"
            onClick={onScanAgain}
            className="border-[#334155] text-white hover:bg-[#334155]/30 py-2 px-4 rounded-md bg-transparent"
          >
            Scan Again
          </Button>
        </div>

        {/* Form link */}
        <div className="text-center text-xs text-gray-500">
          Think this scan result is incorrect?
          <br />
          <a href="#" className="text-blue-400 hover:text-blue-300 underline mt-1">Submit Device Validation Form</a>
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
  const [isScanning, setIsScanning] = useState(false);

  const startScan = async () => {
    if (isScanning) return;

    setIsScanning(true);
    setScanStep('scanning');

    try {
      // Simulate scanning delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      setScanStep('analyzing');
      await new Promise(resolve => setTimeout(resolve, 1500));

      const result = await detectHardware();
      setHardwareInfo(result);
      setScanStep('complete');

    } catch (error) {
      console.error('Hardware scan failed:', error);
      // Fallback to basic detection if scan fails
      setHardwareInfo({
        cpuCores: navigator.hardwareConcurrency || 4,
        deviceMemory: 'Unknown',
        gpuInfo: 'Unknown GPU',
        deviceGroup: 'desktop_laptop',
        deviceType: 'laptop',
        rewardTier: 'cpu'
      });
      setScanStep('complete');
    } finally {
      setIsScanning(false);
    }
  };

  const handleRegister = (deviceName: string) => {
    if (hardwareInfo) {
      onScanComplete(hardwareInfo, deviceName);
      onClose();
    }
  };

  const handleScanAgain = () => {
    setHardwareInfo(null);
    startScan();
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
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {scanStep === 'complete' && hardwareInfo ? (
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
