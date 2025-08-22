import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    console.log('Fetching global statistics...');
    
    // Create admin client with service role key to bypass RLS
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get total earnings (global_sp) from all users
    const { data: earningsData, error: earningsError } = await adminClient
      .from('earnings_history')
      .select('total_amount');
    
    let globalSp = 0;
    if (!earningsError && earningsData) {
      globalSp = earningsData.reduce((sum, record) => sum + Number(record.total_amount), 0);
    }
    console.log('Global SP calculated:', globalSp);

    // Get total users count
    const { count: totalUsers, error: usersError } = await adminClient
      .from('user_profiles')
      .select('*', { count: 'exact', head: true });
    
    console.log('Total users:', totalUsers);

    // Get task completion data from global_stats table
    const { data: globalStatsData, error: globalStatsError } = await adminClient
      .from('global_stats')
      .select('id, total_tasks_completed')
      .in('id', [
        'TOTAL_3D_TASKS',
        'TOTAL_IMAGE_TASKS', 
        'TOTAL_TEXT_TASKS',
        'TOTAL_VIDEO_TASKS'
      ]);

    // Calculate global compute generated
    const COMPUTE_MULTIPLIERS = {
      text: 0.12,
      image: 0.4,
      three_d: 0.8,
      video: 1.6
    };
    
    let globalComputeGenerated = 0;
    if (!globalStatsError && globalStatsData) {
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
    }
    console.log('Global compute generated:', globalComputeGenerated);

    // Prepare response data
    const responseData = {
      global_sp: Number(globalSp.toFixed(2)),
      total_users: totalUsers || 0,
      global_compute_generated: Number(globalComputeGenerated.toFixed(2))
    };

    console.log('Final global stats:', responseData);

    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });

  } catch (error) {
    console.error('Global stats API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 