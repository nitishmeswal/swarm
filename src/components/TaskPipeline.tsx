"use client";

import React, { useState, useEffect } from "react";
import {
  CheckCircleIcon,
  ClockIcon,
  BoltIcon,
  XCircleIcon,
  ArrowPathIcon,
  CodeBracketIcon,
  PhotoIcon,
  DocumentTextIcon,
  CalculatorIcon,
  VideoCameraIcon,
  CubeIcon,
} from "@heroicons/react/24/outline";
import { InfoTooltip } from "./InfoTooltip";
import { Button } from "./ui/button";
import { useAppDispatch, useAppSelector } from "@/lib/store";
import { setAutoMode } from "@/lib/store/slices/taskSlice";
import { selectCurrentUptime } from "@/lib/store/slices/nodeSlice";
import { selectRecentTasks, selectProcessingTasks, selectTaskProgress } from "@/lib/store/slices/taskSlice";
import { getTaskEngine } from "@/lib/store/taskEngine";
import { formatUptimeShort, TASK_CONFIG } from "@/lib/store/config";

export const TaskPipeline = () => {
  const dispatch = useAppDispatch();
  const { node, tasks } = useAppSelector(state => state);
  const currentUptime = useAppSelector(selectCurrentUptime);
  const recentTasks = useAppSelector(state => selectRecentTasks(state, 5));
  const processingTasks = useAppSelector(state => selectProcessingTasks(state));

  const getTaskIcon = (type: string) => {
    switch (type) {
      case "image":
        return <PhotoIcon className="w-4 h-4" />;
      case "text":
        return <DocumentTextIcon className="w-4 h-4" />;
      case "code":
        return <CodeBracketIcon className="w-4 h-4" />;
      case "three_d":
        return <CubeIcon className="w-4 h-4" />;
      case "video":
        return <VideoCameraIcon className="w-4 h-4" />;
      default:
        return <CalculatorIcon className="w-4 h-4" />;
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
        return <CheckCircleIcon className="w-5 h-5 text-green-400" />;
      case "processing":
        return <ArrowPathIcon className="w-5 h-5 text-yellow-400 animate-spin" />;
      case "pending":
        return <ClockIcon className="w-5 h-5 text-blue-400" />;
      case "failed":
        return <XCircleIcon className="w-5 h-5 text-red-400" />;
      default:
        return <ClockIcon className="w-5 h-5 text-gray-400" />;
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
    <div className="task-pipeline p-2.5 sm:p-4 md:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 border border-slate-700 overflow-x-hidden">
      <div className="flex flex-col">
        <div className="flex flex-row justify-between items-center gap-2 sm:gap-0 mb-3 sm:mb-6">
          <div className="flex items-center gap-1 sm:gap-2">
            <h2 className="text-sm sm:text-lg font-medium text-white/90">
              Task Pipeline
            </h2>
            <InfoTooltip content="Monitor and manage AI task processing pipeline" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Auto Mode</span>
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
          <div className="p-3 sm:p-4 rounded-xl bg-slate-700 flex flex-col items-center">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircleIcon className="w-5 h-5 text-green-400" />
              <span className="text-xs sm:text-sm text-slate-400">Completed</span>
            </div>
            <div className="text-lg sm:text-2xl font-bold text-green-400">
              {tasks.stats.completed}
            </div>
          </div>

          <div className="p-3 sm:p-4 rounded-xl bg-slate-700 flex flex-col items-center">
            <div className="flex items-center gap-2 mb-2">
              <ArrowPathIcon className="w-5 h-5 text-yellow-400 animate-spin" />
              <span className="text-xs sm:text-sm text-slate-400">Processing</span>
            </div>
            <div className="text-lg sm:text-2xl font-bold text-yellow-400">
              {tasks.stats.processing}
            </div>
          </div>

          <div className="p-3 sm:p-4 rounded-xl bg-slate-700 flex flex-col items-center">
            <div className="flex items-center gap-2 mb-2">
              <ClockIcon className="w-5 h-5 text-blue-400" />
              <span className="text-xs sm:text-sm text-slate-400">Pending</span>
            </div>
            <div className="text-lg sm:text-2xl font-bold text-blue-400">
              {tasks.stats.pending}
            </div>
          </div>

          <div className="p-3 sm:p-4 rounded-xl bg-slate-700 flex flex-col items-center">
            <div className="flex items-center gap-2 mb-2">
              <XCircleIcon className="w-5 h-5 text-red-400" />
              <span className="text-xs sm:text-sm text-slate-400">Failed</span>
            </div>
            <div className="text-lg sm:text-2xl font-bold text-red-400">
              {tasks.stats.failed}
            </div>
          </div>
        </div>

        {/* Node Status */}
        {node.isActive && (
          <div className="mb-4 sm:mb-6">
            <h3 className="text-sm font-medium text-white/90 mb-3">Node Status</h3>
            <div className="p-3 sm:p-4 rounded-xl bg-slate-700 border border-green-500/30">
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
                <div key={task.id} className="p-3 sm:p-4 rounded-xl bg-slate-700 border border-yellow-500/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {getTaskIcon(task.type)}
                        <span className="text-sm text-white capitalize">{task.type.replace('_', ' ')} Task</span>
                      </div>
                      <div className="px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs">
                        Processing
                      </div>
                    </div>
                    <div className="text-xs text-slate-400">
                      ID: {task.id.slice(0, 8)}...
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="w-full bg-slate-600 rounded-full h-2">
                      <div 
                        className="bg-yellow-500 h-2 rounded-full transition-all duration-1000" 
                        style={{ width: `${Math.round(progress)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-slate-400 mt-1">
                      <span>Processing...</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Task History */}
        <div className="mb-4">
          <h3 className="text-sm font-medium text-white/90 mb-3">Recent Tasks</h3>
          <div className="space-y-2">
            {recentTasks.length > 0 ? (
              recentTasks.map(task => {
                const timeAgo = task.completed_at 
                  ? Math.floor((Date.now() - new Date(task.completed_at).getTime()) / 1000 / 60)
                  : Math.floor((Date.now() - new Date(task.updated_at).getTime()) / 1000 / 60);
                
                return (
                  <div key={task.id} className="p-3 rounded-lg bg-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(task.status)}
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          {getTaskIcon(task.type)}
                          <span className="text-sm text-white capitalize">
                            {task.type.replace('_', ' ')} Task
                          </span>
                        </div>
                        <span className="text-xs text-slate-400">
                          {task.status === 'completed' ? `Completed ${timeAgo}m ago` : 
                           task.status === 'processing' ? 'Processing...' : 
                           task.status === 'pending' ? 'Pending' : 'Failed'}
                          {task.reward_amount && ` • +${task.reward_amount} NLOV`}
                        </span>
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs ${
                      task.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                      task.status === 'processing' ? 'bg-yellow-500/20 text-yellow-400' :
                      task.status === 'pending' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-4 rounded-lg bg-slate-700 text-center text-slate-400">
                {!node.isActive ? (
                  <div className="flex flex-col items-center gap-2">
                    <BoltIcon className="w-8 h-8 text-slate-500" />
                    <p className="text-sm">Node is not active</p>
                    <p className="text-xs">Start your node to receive and view tasks</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <ClockIcon className="w-8 h-8 text-slate-500" />
                    <p className="text-sm">No tasks yet</p>
                    <p className="text-xs">Tasks will appear here once generated</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

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
                  <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <BoltIcon className="w-4 h-4 mr-2" />
                )}
                {tasks.isGenerating ? 'Generating...' : 'Generate Tasks'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
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
    </div>
  );
};
