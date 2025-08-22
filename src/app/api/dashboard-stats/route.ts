import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the current session to authenticate the request
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('Session error:', sessionError);
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }

    // Make the external API call server-side with fallback
    let data = {
      total_users: 0,
      total_compute_generated: 0,
      total_tasks: 0
    };

    try {
          const response = await fetch(
        'https://phpaoasgtqsnwohtevwf.supabase.co/functions/v1/global_stats',
      {
        method: 'GET',
                headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,

          'Content-Type': 'application/json',
          'x-use-service-role': 'true',
        },
      }
    );

      if (response.ok) {
        const responseData = await response.json();
        console.log('Edge function response:', responseData);
        
        // Check if response has the right structure for global_stats
        if (responseData && responseData.global_sp !== undefined) {
          // Map global_stats response to dashboard format
          data = {
            total_users: responseData.total_users || 0,
            total_compute_generated: responseData.global_compute_generated || 0,
            total_tasks: responseData.total_tasks || 0
          };
        } else if (responseData && (responseData.total_users > 0 || responseData.total_compute_generated > 0 || responseData.total_tasks > 0)) {
          data = responseData;
        } else {
          console.log('Edge function returned invalid/zero data, using fallback...');
          // Continue to fallback calculation
        }
      }
      
      // Run fallback calculation if edge function failed or returned all zeros
      if (!response.ok || (data.total_users === 0 && data.total_compute_generated === 0 && data.total_tasks === 0)) {
      console.error('External API error:', response.status, response.statusText);
                // Fallback: Calculate stats from database using admin access
        console.log('Calculating dashboard stats from database...');
        
        // Create admin client for bypassing RLS
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

        // Get active nodes (online devices) - for dashboard "Active Nodes"
        const { data: activeDevicesData, error: devicesError } = await adminClient
          .from('devices')
          .select('status, uptime')
          .eq('status', 'online');

        if (!devicesError && activeDevicesData) {
          data.total_users = activeDevicesData.length; // Active nodes count
          console.log('Active devices found:', activeDevicesData.length);
        }

        // Get total users count for reference
        const { count: totalUsersCount, error: usersCountError } = await adminClient
          .from('user_profiles')
          .select('*', { count: 'exact', head: true });

        // Get total tasks completed across all users
        const { data: profilesData, error: profilesError } = await adminClient
          .from('user_profiles')
          .select('task_completed');

        if (!profilesError && profilesData) {
          data.total_tasks = profilesData.reduce((sum, profile) => sum + (profile.task_completed || 0), 0);
          console.log('Total tasks calculated:', data.total_tasks);
        }

        // Calculate compute from global stats if available
        const { data: globalStatsData, error: globalStatsError } = await adminClient
          .from('global_stats')
          .select('id, total_tasks_completed')
          .in('id', ['TOTAL_3D_TASKS', 'TOTAL_IMAGE_TASKS', 'TOTAL_TEXT_TASKS', 'TOTAL_VIDEO_TASKS']);

        if (!globalStatsError && globalStatsData) {
          const COMPUTE_MULTIPLIERS = {
            text: 0.12,
            image: 0.4,
            three_d: 0.8,
            video: 1.6
          };
          
          let totalCompute = 0;
          globalStatsData.forEach((stat) => {
            const count = Number(stat.total_tasks_completed) || 0;
            switch(stat.id) {
              case 'TOTAL_3D_TASKS':
                totalCompute += count * COMPUTE_MULTIPLIERS.three_d;
                break;
              case 'TOTAL_IMAGE_TASKS':
                totalCompute += count * COMPUTE_MULTIPLIERS.image;
                break;
              case 'TOTAL_TEXT_TASKS':
                totalCompute += count * COMPUTE_MULTIPLIERS.text;
                break;
              case 'TOTAL_VIDEO_TASKS':
                totalCompute += count * COMPUTE_MULTIPLIERS.video;
                break;
            }
          });
          data.total_compute_generated = Number(totalCompute.toFixed(2));
          console.log('Global compute calculated:', data.total_compute_generated);
        } else if (!devicesError && activeDevicesData) {
          // Fallback compute calculation from uptime
          data.total_compute_generated = activeDevicesData.reduce((sum, device) => sum + (device.uptime || 0), 0) / 1000;
          console.log('Fallback compute from uptime:', data.total_compute_generated);
        }

        console.log('Final dashboard data:', data);
      }
    } catch (fetchError) {
      console.error('Dashboard fetch error:', fetchError);
      // Use fallback values calculated above
    }

    // Return the data with proper caching headers for performance
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });

  } catch (error) {
    console.error('Dashboard stats API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 