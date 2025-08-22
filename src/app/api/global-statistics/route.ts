import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Define types for leaderboard entries
interface LeaderboardEntry {
  user_id: string;
  username: string;
  total_earnings: number;
  rank: number;
  task_count: number;
}

interface LeaderboardFunctionResult {
  top10: LeaderboardEntry[];
  user_rank: LeaderboardEntry | null;
}

// Interface for edge function response
interface EdgeFunctionStats {
  global_sp: number;
  total_users: number;
  global_compute_generated: number;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the current session to authenticate the request
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('Session error:', sessionError);
    }

    // Fetch data from edge function and leaderboard in parallel
    const [edgeFunctionResponse, leaderboardFunctionData] = await Promise.all([
      // Get global statistics from edge function
      fetch('https://phpaoasgtqsnwohtevwf.supabase.co/functions/v1/global_statistics_data', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || ''}`,
        },
      }),

      // Use the get_top10_with_user_rank function to get consistent leaderboard data
      supabase
        .rpc('get_top10_with_user_rank', {
          target_user_id: session?.user?.id || null
        })
    ]);

    // Handle edge function response
    if (!edgeFunctionResponse.ok) {
      console.error('Edge function error:', edgeFunctionResponse.status, edgeFunctionResponse.statusText);
      return NextResponse.json({ error: 'Failed to fetch global statistics' }, { status: 500 });
    }

    const edgeFunctionData: EdgeFunctionStats = await edgeFunctionResponse.json();
    console.log('Debug - Edge function data:', edgeFunctionData);

    // Handle leaderboard function error
    if (leaderboardFunctionData.error) {
      console.error('Error fetching leaderboard from function:', leaderboardFunctionData.error);
      return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
    }

    // Parse the leaderboard data from the function
    console.log('Debug - leaderboardFunctionData:', leaderboardFunctionData);
    
    let leaderboard: LeaderboardEntry[] = [];
    let currentUserRank: LeaderboardEntry | null = null;

    if (leaderboardFunctionData.data) {
      // Extract top10 and user_rank from the function result
      const { top10, user_rank } = leaderboardFunctionData.data as LeaderboardFunctionResult;
      
      // Format the top10 leaderboard
      if (top10 && Array.isArray(top10)) {
        leaderboard = top10.map((entry: any) => ({
          user_id: entry.user_id,
          username: entry.username,
          total_earnings: Number(entry.total_earnings) || 0,
          rank: entry.rank,
          task_count: entry.task_count || 0
        }));
      }

      // Set current user rank if available
      if (user_rank) {
        currentUserRank = {
          user_id: user_rank.user_id,
          username: user_rank.username,
          total_earnings: Number(user_rank.total_earnings) || 0,
          rank: user_rank.rank,
          task_count: user_rank.task_count || 0
        };
      }
    }

    // Fallback: If function fails, use the old method
    if (!leaderboardFunctionData.data || leaderboard.length === 0) {
      console.log('Fallback: Using manual leaderboard query');
      
      // Get top 10 leaderboard with user names - FALLBACK
      const { data: fallbackLeaderboardData, error: fallbackError } = await supabase
        .from('earnings_history')
        .select(`
          user_id,
          total_amount,
          user_profiles!inner(
            user_name
          )
        `)
        .order('total_amount', { ascending: false })
        .limit(10);

      if (!fallbackError && fallbackLeaderboardData) {
        leaderboard = fallbackLeaderboardData.map((entry: any, index: number) => {
          const userProfile = Array.isArray(entry.user_profiles) ? entry.user_profiles[0] : entry.user_profiles;
          return {
            user_id: entry.user_id,
            username: userProfile?.user_name || `User${entry.user_id.slice(0, 6)}`,
            total_earnings: Number(entry.total_amount) || 0,
            rank: index + 1,
            task_count: 0
          };
        });

        // Get current user rank if session exists and not in top 10
        if (session?.user) {
          const userInLeaderboard = leaderboard.find((entry: LeaderboardEntry) => entry.user_id === session.user.id);

          if (userInLeaderboard) {
            currentUserRank = userInLeaderboard;
          } else {
            // If not in top 10, get their specific rank and earnings
            try {
              // Get current user's total earnings
              const { data: userEarningsData, error: userEarningsError } = await supabase
                .from('earnings_history')
                .select(`
                  total_amount,
                  user_profiles!inner(
                    user_name
                  )
                `)
                .eq('user_id', session.user.id)
                .single();

              if (!userEarningsError && userEarningsData) {
                // Count how many users have higher earnings to determine rank
                const { count: higherEarningsCount, error: rankError } = await supabase
                  .from('earnings_history')
                  .select('*', { count: 'exact', head: true })
                  .gt('total_amount', userEarningsData.total_amount);

                if (!rankError) {
                  const userRank = (higherEarningsCount || 0) + 1;

                  const userProfile = Array.isArray(userEarningsData.user_profiles) ? userEarningsData.user_profiles[0] : userEarningsData.user_profiles;
                  currentUserRank = {
                    user_id: session.user.id,
                    username: userProfile?.user_name || `User${session.user.id.slice(0, 6)}`,
                    total_earnings: Number(userEarningsData.total_amount) || 0,
                    rank: userRank,
                    task_count: 0
                  };
                }
              }
            } catch (error) {
              console.error('Error fetching current user rank:', error);
              // Don't fail the entire request if user rank fails
            }
          }
        }
      }
    }

    // Calculate total tasks based on global compute generated (estimate)
    const totalTasksCount = Math.round((edgeFunctionData.global_compute_generated || 0) * 10);

    // Prepare the response data using edge function stats
    const responseData = {
      stats: {
        totalUsers: edgeFunctionData.total_users || 0,
        totalEarnings: edgeFunctionData.global_sp || 0,
        globalComputeGenerated: edgeFunctionData.global_compute_generated || 0,
        totalTasks: totalTasksCount
      },
      leaderboard,
      currentUserRank
    };

    console.log('Debug - Final response data:', {
      leaderboardLength: leaderboard.length,
      currentUserRank: currentUserRank ? 'Found' : 'Not found',
      totalUsers: edgeFunctionData.total_users,
      totalEarnings: edgeFunctionData.global_sp,
      globalComputeGenerated: edgeFunctionData.global_compute_generated
    });

    // Return the data with aggressive caching for memory optimization
    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600', // Increased cache from 60s to 5min
        'CDN-Cache-Control': 'public, s-maxage=300',
      },
    });

  } catch (error) {
    console.error('Global statistics API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}