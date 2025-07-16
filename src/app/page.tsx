'use client';

import { useEffect, useRef } from "react";
import { useSession } from "@/hooks/useSession";
import { useSelector } from "react-redux";
import { RootState, useAppDispatch } from "@/store";
import { useToast } from "@/components/ui/use-toast";
import { getSwarmSupabase, getTaskSupabase } from "@/lib/supabase-client";
import { ConnectAppModal } from "@/components/ConnectAppModal";
import Index from "@/components/pages/Index";
import { 
  syncUptime, 
  updateUptime, 
  checkPendingSyncOperations, 
  getLastActiveNodeId
} from "@/store/slices/nodeSlice";

export default function Home() {
  const { session, subscriptionTier } = useSession();
  const userProfile = session?.userProfile;
  const taskSupabase = getTaskSupabase();
  const swarmSupabase = getSwarmSupabase();
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const { isActive, remainingFreeTierTime, nodeId } = useSelector(
    (state: RootState) => state.node
  );
  const hasShownLimitToast = useRef(false);

  // Check for pending sync operations when app loads
  useEffect(() => {
    const processPendingSyncs = async () => {
      try {
        await checkPendingSyncOperations();
      } catch (error) {
        console.error("Error processing pending sync operations:", error);
      }
    };
    
    processPendingSyncs();
  }, []);

  // Restore last active node on app load
  useEffect(() => {
    const restoreLastActiveNode = async () => {
      if (!userProfile?.id) return;
      
      const lastNodeId = getLastActiveNodeId();
      if (lastNodeId && !nodeId && !isActive) {
        try {
          console.log(`Restoring last active node: ${lastNodeId}`);
          
          const { data, error } = await swarmSupabase
            .from("devices")
            .select("id, device_name, reward_tier, uptime")
            .eq("id", lastNodeId)
            .eq("owner", userProfile.id)
            .single();
            
          if (error) {
            console.error("Error fetching last active node:", error);
            return;
          }
          
          if (data) {
            console.log(`Found last active node: ${data.device_name} (${data.id})`);
            
            dispatch({
              type: 'node/switchCurrentNode',
              payload: {
                nodeId: data.id,
                nodeName: data.device_name,
                nodeType: 'desktop',
                rewardTier: data.reward_tier || 'cpu',
                uptime: data.uptime || 0
              }
            });
          }
        } catch (error) {
          console.error("Error restoring last active node:", error);
        }
      }
    };
    
    restoreLastActiveNode();
  }, [userProfile?.id, nodeId, isActive, dispatch, swarmSupabase]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && isActive) {
        console.log("Page hidden - syncing uptime data");
        dispatch(syncUptime());
      } else if (document.visibilityState === "visible" && isActive) {
        console.log("Page visible again - checking for updates");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    const syncInterval = isActive
      ? setInterval(() => dispatch(syncUptime()), 5 * 60 * 1000)
      : null;

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (syncInterval) clearInterval(syncInterval);
    };
  }, [isActive, dispatch]);

  useEffect(() => {
    let uptimeInterval: NodeJS.Timeout | null = null;

    if (isActive) {
      uptimeInterval = setInterval(() => {
        dispatch(updateUptime());
      }, 1000);

      console.log("Started real-time uptime updates");
    }

    return () => {
      if (uptimeInterval) {
        clearInterval(uptimeInterval);
        console.log("Stopped real-time uptime updates");
      }
    };
  }, [isActive, dispatch]);

  return <Index />;
}
