"use client";

import React, { useState, useEffect } from "react";
import {
  CheckCircle,
  Clock,
  Zap,
  XCircle,
  Loader2,
  FileCode,
  ImageIcon,
  AlignLeft,
  Calculator,
  RefreshCw,
  Video,
  Boxes,
} from "lucide-react";
import { InfoTooltip } from "./InfoTooltip";
import { Button } from "./ui/button";
import { useAppDispatch, useAppSelector } from "@/lib/store";
import { setAutoMode, selectTasks, selectRecentTasks, selectProcessingTasks, selectPendingTasks, selectTaskProgress } from "@/lib/store/slices/taskSlice";
import { selectCurrentUptime, selectNode } from "@/lib/store/slices/nodeSlice";
import { selectSessionEarnings } from "@/lib/store/slices/earningsSlice";
import { getTaskEngine } from "@/lib/store/taskEngine";
import { formatUptimeShort, TASK_CONFIG } from "@/lib/store/config";
import { useAuth } from "@/contexts/AuthContext";

export const TaskPipeline = () => {
  const { user, isLoggedIn, isLoading } = useAuth();
  const dispatch = useAppDispatch();
  const node = useAppSelector(selectNode);
  const tasks = useAppSelector(selectTasks);
  const currentUptime = useAppSelector(selectCurrentUptime);
  const recentTasks = useAppSelector(state => selectRecentTasks(state, 5));
  const processingTasks = useAppSelector(selectProcessingTasks);
  const pendingTasks = useAppSelector(selectPendingTasks);
  const sessionEarnings = useAppSelector(selectSessionEarnings);

  // Early return if not authenticated (extra safety)
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isLoggedIn || !user) {
    return (
      <div className="p-6 text-center text-gray-400">
        <p>Please log in to access the Task Pipeline</p>
      </div>
    );
  }

  const getTaskIcon = (type: string) => {
    switch (type) {
      case "image":
        return <ImageIcon className="w-4 h-4 text-purple-500" />;
      case "text":
        return <AlignLeft className="w-4 h-4 text-blue-500" />;
      case "code":
        return <FileCode className="w-4 h-4 text-gray-500" />;
      case "three_d":
        return <Boxes className="w-4 h-4 text-green-500" />;
      case "video":
        return <Video className="w-4 h-4 text-red-500" />;
      default:
        return <Calculator className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-400";
      case "processing":
        return "text-yellow-400";
      case "pending":
        return "text-blue-400";
      case "failed":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "processing":
        return <Loader2 className="w-5 h-5 text-yellow-400 animate-spin" />;
      case "pending":
        return <Clock className="w-5 h-5 text-blue-400" />;
      case "failed":
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };
  
  const handleAutoModeToggle = (checked: boolean) => {
    dispatch(setAutoMode(checked));
  };
  
  const handleGenerateTasks = () => {
    const engine = getTaskEngine();
    if (engine) {
      engine.generateTasksManually();
    }
  };
  
  const getHardwareTierColor = (tier: string) => {
    switch (tier) {
      case 'webgpu': return 'text-purple-400';
      case 'wasm': return 'text-blue-400';
      case 'webgl': return 'text-green-400';
      case 'cpu': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="task-pipeline p-2.5 sm:p-6 rounded-2xl sm:rounded-3xl stat-card relative">
      <div className="flex flex-row justify-between items-center gap-2 sm:gap-0 mb-3 sm:mb-6">
        <div className="flex items-center gap-1 sm:gap-2">
          <h2 className="text-sm sm:text-lg font-medium text-white/90">
            Task Pipeline
          </h2>
          <InfoTooltip content="Monitor and manage AI task processing pipeline" />
        </div>
        <div className="flex items-center gap-1 sm:gap-2 order-1 sm:order-2">
          <span className="text-[10px] sm:text-sm text-white/60">Auto</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={tasks.autoMode}
              onChange={(e) => handleAutoModeToggle(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      {/* Task Status Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-3 sm:mb-6">
        <div className="rounded-xl overflow-hidden bg-[#1D1D33] relative">
          <div className="p-2 sm:p-4 pb-1.5 sm:pb-3 flex flex-col items-center">
            <img
              src="/images/completed.png"
              alt="Completed"
              className="w-3.5 h-3.5 sm:w-5 sm:h-5 object-contain mb-0.5 sm:mb-2"
            />
            <span className="text-[10px] sm:text-sm text-white/60">Completed</span>
            <span className="text-lg sm:text-2xl font-semibold text-white mt-0.5 sm:mt-1">
              {tasks.stats.completed}
            </span>
          </div>
          <div className="h-1.5 sm:h-2 w-full bg-[#0361DA]"></div>
        </div>

        <div className="rounded-xl overflow-hidden bg-[#1D1D33] relative">
          <div className="p-2 sm:p-4 pb-1.5 sm:pb-3 flex flex-col items-center">
            <img
              src="/images/processing.png"
              alt="Processing"
              className="w-3.5 h-3.5 sm:w-5 sm:h-5 object-contain mb-0.5 sm:mb-2"
            />
            <span className="text-[10px] sm:text-sm text-white/60">Processing</span>
            <span className="text-lg sm:text-2xl font-semibold text-white mt-0.5 sm:mt-1">
              {tasks.stats.processing}
            </span>
          </div>
          <div className="h-1.5 sm:h-2 w-full bg-[#0361DA]"></div>
        </div>

        <div className="rounded-xl overflow-hidden bg-[#1D1D33] relative">
          <div className="p-2 sm:p-4 pb-1.5 sm:pb-3 flex flex-col items-center">
            <img
              src="/images/pending.png"
              alt="Pending"
              className="w-3.5 h-3.5 sm:w-5 sm:h-5 object-contain mb-0.5 sm:mb-2"
            />
            <span className="text-[10px] sm:text-sm text-white/60">Pending</span>
            <span className="text-lg sm:text-2xl font-semibold text-white mt-0.5 sm:mt-1">
              {tasks.stats.pending}
            </span>
          </div>
          <div className="h-1.5 sm:h-2 w-full bg-[#0361DA]"></div>
        </div>

        <div className="rounded-xl overflow-hidden bg-[#1D1D33] relative">
          <div className="p-2 sm:p-4 pb-1.5 sm:pb-3 flex flex-col items-center">
            <img
              src="/images/error.png"
              alt="Failed"
              className="w-3.5 h-3.5 sm:w-5 sm:h-5 object-contain mb-0.5 sm:mb-2"
            />
            <span className="text-[10px] sm:text-sm text-white/60">Failed</span>
            <span className="text-lg sm:text-2xl font-semibold text-white mt-0.5 sm:mt-1">
              {tasks.stats.failed}
            </span>
          </div>
          <div className="h-1.5 sm:h-2 w-full bg-[#0361DA]"></div>
        </div>
      </div>

      {/* Node Status */}
      {node.isActive && (
        <div className="mb-4 sm:mb-6">
          <h3 className="text-sm font-medium text-white/90 mb-3">Node Status</h3>
          <div className="p-3 sm:p-4 rounded-xl bg-[#1D1D33] border border-green-500/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-white">Node Active</span>
              </div>
              <div className={`text-xs font-medium ${getHardwareTierColor(node.hardwareInfo?.rewardTier || 'cpu')}`}>
                {(node.hardwareInfo?.rewardTier || 'cpu').toUpperCase()} Tier
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Uptime: {formatUptimeShort(currentUptime)}</span>
              <span>Multiplier: {TASK_CONFIG.HARDWARE_MULTIPLIERS[node.hardwareInfo?.rewardTier || 'cpu']}x</span>
            </div>
          </div>
        </div>
      )}

      {/* Current Processing Task */}
      {processingTasks.length > 0 && (
        <div className="mb-4 sm:mb-6">
          <h3 className="text-sm font-medium text-white/90 mb-3">Current Task</h3>
          {processingTasks.slice(0, 1).map(task => {
            const progress = selectTaskProgress(task, node.hardwareInfo?.rewardTier || 'cpu');
            
            return (
              <div key={task.id} className="rounded-xl overflow-hidden bg-[#1D1D33] border border-[#252547] transition-all duration-200 hover:border-blue-600/30">
                <div className="p-3 sm:p-4">
                  <div className="flex items-start gap-1.5 sm:gap-3">
                    <div className="flex-shrink-0 mt-0.5 sm:mt-1">
                      {getTaskIcon(task.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-1 sm:gap-2">
                        <div className="flex items-center rounded-full py-0.5 sm:py-1">
                          <span className="text-[10px] sm:text-sm text-[#0361DA] font-medium truncate">
                            {task.type === "image"
                              ? "neuro-image-gen"
                              : task.type === "text"
                              ? "freedomai-llm"
                              : task.type === "video"
                              ? "video-gen"
                              : "3d-model-gen"}
                          </span>
                        </div>
                        <div className="border rounded-full border-blue-500 bg-blue-500/10 text-blue-400 text-[10px] sm:text-xs font-medium px-1.5 sm:px-3 py-0.5 sm:py-1">
                          Processing
                        </div>
                      </div>
                      <p className="text-[10px] sm:text-sm text-white/80 mt-1 sm:mt-2 break-all">
                        Task ID: {task.id}
                      </p>
                      <p className="text-xs text-white/55 mt-1">
                        Processing...
                      </p>
                      <div className="w-full h-1.5 bg-[#1A1A4C] rounded-full overflow-hidden mt-2">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 rounded-full"
                          style={{ width: `${Math.round(progress)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tasks in Queue */}
      <div className="mb-4">
        <h3 className="text-sm font-medium text-white/90 mb-3">Tasks in Queue</h3>
        <div className="space-y-2 max-h-[500px] sm:max-h-[600px] overflow-y-auto pr-1 sm:pr-2 custom-scrollbar">
          {pendingTasks.length > 0 ? (
            pendingTasks.map(task => {
              const timeAgo = task.completed_at 
                ? Math.floor((Date.now() - new Date(task.completed_at).getTime()) / 1000 / 60)
                : Math.floor((Date.now() - new Date(task.updated_at).getTime()) / 1000 / 60);
              
              return (
                <div key={task.id} className="rounded-xl overflow-hidden bg-[#1D1D33] border border-[#252547] transition-all duration-200 hover:border-blue-600/30">
                  <div className="p-2 sm:p-4">
                    <div className="flex items-start gap-1.5 sm:gap-3">
                      <div className="flex-shrink-0 mt-0.5 sm:mt-1">
                        {getTaskIcon(task.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-1 sm:gap-2">
                          <div className="flex items-center rounded-full py-0.5 sm:py-1">
                            <span className="text-[10px] sm:text-sm text-[#0361DA] font-medium truncate">
                              {task.type === "image"
                                ? "neuro-image-gen"
                                : task.type === "text"
                                ? "freedomai-llm"
                                : task.type === "video"
                                ? "video-gen"
                                : "3d-model-gen"}
                            </span>
                          </div>
                          <div className="border border-amber-500 bg-amber-500/10 text-amber-400 text-[10px] sm:text-xs font-medium px-1.5 sm:px-3 py-0.5 sm:py-1 rounded-full">
                            Queued
                          </div>
                        </div>
                        <p className="text-[10px] sm:text-sm text-white/80 mt-1 sm:mt-2 break-all">
                          Task ID: {task.id}
                        </p>
                        <p className="text-xs text-amber-400 mt-1">
                          Waiting in queue...
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-6 sm:py-16 text-white/60">
              {!node.isActive ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 sm:w-16 sm:h-16 flex items-center justify-center rounded-md bg-[#1D1D33]/50 mb-3 sm:mb-6">
                    <FileCode className="w-5 h-5 sm:w-8 sm:h-8 text-white/30" />
                  </div>
                  <p className="text-base sm:text-xl font-medium">Node is not active</p>
                  <p className="text-[10px] sm:text-sm mt-1 sm:mt-2">
                    Start your node to receive and view tasks
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 sm:w-16 sm:h-16 flex items-center justify-center rounded-md bg-[#1D1D33]/50 mb-3 sm:mb-6">
                    <Clock className="w-5 h-5 sm:w-8 sm:h-8 text-white/30" />
                  </div>
                  <p className="text-base sm:text-xl font-medium">No tasks in queue</p>
                  <p className="text-[10px] sm:text-sm mt-1 sm:mt-2">
                    Pending tasks will appear here when generated
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Pending Rewards Section */}
      {sessionEarnings > 0 && node.isActive && (
        <div className="mb-4 p-4 rounded-xl bg-blue-900/20 border border-blue-700/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img
                src="/images/pending_reward.png"
                alt="Pending Rewards"
                className="w-5 h-5 object-contain"
              />
              <span className="text-sm text-white/90">Pending Rewards</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-medium text-blue-400">+{sessionEarnings.toFixed(2)}</span>
              <span className="text-xs text-white/70">NLOV</span>
            </div>
          </div>
          <p className="text-xs text-white/50 mt-2">
            Complete tasks to earn rewards. Claim from the Node Control Panel.
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        {node.isActive ? (
          <>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
              onClick={handleGenerateTasks}
              disabled={tasks.isGenerating}
            >
              {tasks.isGenerating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Zap className="w-4 h-4 mr-2" />
              )}
              {tasks.isGenerating ? 'Generating...' : 'Generate Tasks'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              View All ({tasks.tasks.length})
            </Button>
          </>
        ) : (
          <div className="flex-1 text-center text-slate-400 text-sm py-2">
            Start your node to begin processing tasks
          </div>
        )}
      </div>
    </div>
  );
};
