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

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the current session to authenticate the request
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('Session error:', sessionError);
    }

    // Create admin client for bypassing RLS when needed
    const { createClient: createAdminClient } = await import('@supabase/supabase-js');
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Calculate global statistics
    let globalSp = 0;
    let totalUsers = 0;
    let globalComputeGenerated = 0;

    try {
      // 1. Global SP - Sum of all earnings from earnings_history
      const { data: earningsData, error: earningsError } = await adminClient
        .from('earnings_history')
        .select('total_amount');

      if (!earningsError && earningsData) {
        globalSp = earningsData.reduce((sum, record) => sum + Number(record.total_amount || 0), 0);
        console.log('Global SP calculated:', globalSp);
      }

      // 2. Total Users - Count of user_profiles
      const { count: userCount, error: usersError } = await adminClient
        .from('user_profiles')
        .select('*', { count: 'exact', head: true });

      if (!usersError) {
        totalUsers = userCount || 0;
        console.log('Total users:', totalUsers);
      }

      // 3. Global Compute Generated - Calculate from global_stats
      const { data: globalStatsData, error: globalStatsError } = await adminClient
        .from('global_stats')
        .select('id, total_tasks_completed')
        .in('id', [
          'TOTAL_3D_TASKS',
          'TOTAL_IMAGE_TASKS',
          'TOTAL_TEXT_TASKS',
          'TOTAL_VIDEO_TASKS'
        ]);

      if (!globalStatsError && globalStatsData) {
        const COMPUTE_MULTIPLIERS = {
          text: 0.12,
          image: 0.4,
          three_d: 0.8,
          video: 1.6
        };
        
        globalStatsData.forEach((stat) => {
          const count = Number(stat.total_tasks_completed) || 0;
          switch(stat.id) {
            case 'TOTAL_3D_TASKS':
              globalComputeGenerated += count * COMPUTE_MULTIPLIERS.three_d;
              break;
            case 'TOTAL_IMAGE_TASKS':
              globalComputeGenerated += count * COMPUTE_MULTIPLIERS.image;
              break;
            case 'TOTAL_TEXT_TASKS':
              globalComputeGenerated += count * COMPUTE_MULTIPLIERS.text;
              break;
            case 'TOTAL_VIDEO_TASKS':
              globalComputeGenerated += count * COMPUTE_MULTIPLIERS.video;
              break;
          }
        });
        console.log('Global compute generated:', globalComputeGenerated);
      }

    } catch (error) {
      console.error('Error calculating global statistics:', error);
      // Continue with fallback values
    }

    // Fetch leaderboard data
    let leaderboard: LeaderboardEntry[] = [];
    let currentUserRank: LeaderboardEntry | null = null;

    try {
      // Try to use the database function first
      const leaderboardFunctionData = await supabase
        .rpc('get_top10_with_user_rank', {
          target_user_id: session?.user?.id || null
        });

      if (!leaderboardFunctionData.error && leaderboardFunctionData.data) {
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
      } else {
        console.log('Function failed, using fallback leaderboard query');
        throw new Error('Function failed');
      }
    } catch (error) {
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

    // Prepare the response data
    const responseData = {
      stats: {
        globalSp: Number(globalSp.toFixed(2)),
        totalUsers: totalUsers,
        globalComputeGenerated: Number(globalComputeGenerated.toFixed(2))
      },
      leaderboard,
      currentUserRank
    };

    console.log('Global statistics calculated:', {
      globalSp: responseData.stats.globalSp,
      totalUsers: responseData.stats.totalUsers,
      globalComputeGenerated: responseData.stats.globalComputeGenerated,
      leaderboardLength: leaderboard.length,
      currentUserRank: currentUserRank ? 'Found' : 'Not found'
    });

    // Return the data with caching for performance
    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
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