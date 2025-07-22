"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";

export function AuthDebugger() {
  const { user, profile, session, isLoading, isLoggedIn } = useAuth();
  const [showDebugger, setShowDebugger] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  // Add timestamp logs for state changes
  useEffect(() => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    setLogs(prev => [
      `${timestamp} - Auth state changed: isLoggedIn=${isLoggedIn}, isLoading=${isLoading}`,
      ...prev.slice(0, 19) // Keep last 20 logs
    ]);
  }, [user, profile, session, isLoading, isLoggedIn]);

  if (!showDebugger) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button 
          className="bg-gray-800 text-white px-3 py-1 rounded-md text-xs"
          onClick={() => setShowDebugger(true)}
        >
          Show Auth Debug
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 right-0 w-full sm:w-96 h-96 bg-gray-900/95 text-white z-50 flex flex-col rounded-t-lg overflow-hidden">
      <div className="bg-gray-800 p-2 flex justify-between items-center">
        <h3 className="text-sm font-semibold">Auth Debugger</h3>
        <button 
          className="text-white hover:text-red-400"
          onClick={() => setShowDebugger(false)}
        >
          Close
        </button>
      </div>
      
      <div className="overflow-auto p-3 text-xs flex-grow">
        <h4 className="font-semibold mb-1">Auth State:</h4>
        <div className="bg-gray-800 p-2 rounded mb-3">
          <div><span className="text-blue-400">isLoggedIn:</span> {isLoggedIn.toString()}</div>
          <div><span className="text-blue-400">isLoading:</span> {isLoading.toString()}</div>
          <div><span className="text-blue-400">User ID:</span> {user?.id || "none"}</div>
          <div><span className="text-blue-400">Email:</span> {user?.email || "none"}</div>
          <div><span className="text-blue-400">Has profile:</span> {!!profile ? "true" : "false"}</div>
          {profile && (
            <>
              <div><span className="text-blue-400">Username:</span> {profile.user_name}</div>
              <div><span className="text-blue-400">Credits:</span> {profile.freedom_ai_credits}</div>
              <div><span className="text-blue-400">Referral Code:</span> {profile.referral_code}</div>
            </>
          )}
          <div><span className="text-blue-400">Session expires:</span> {session?.expires_at ? new Date(session.expires_at * 1000).toLocaleString() : "none"}</div>
        </div>

        <h4 className="font-semibold mb-1">Event Log:</h4>
        <div className="bg-gray-800 p-2 rounded h-32 overflow-y-auto">
          {logs.map((log, i) => (
            <div key={i} className="text-gray-300 text-xs mb-1">{log}</div>
          ))}
          {logs.length === 0 && <div className="text-gray-500">No events yet</div>}
        </div>
      </div>
    </div>
  );
} 