import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    console.log('Initializing global stats...');
    
    // Check if global_stats table has data
    const { data: existingStats, error: checkError } = await supabase
      .from('global_stats')
      .select('id, total_tasks_completed')
      .in('id', [
        'TOTAL_3D_TASKS',
        'TOTAL_IMAGE_TASKS',
        'TOTAL_TEXT_TASKS',
        'TOTAL_VIDEO_TASKS'
      ]);
    
    if (checkError) {
      console.error('Error checking global stats:', checkError);
      return NextResponse.json({ error: 'Failed to check global stats' }, { status: 500 });
    }
    
    // If stats exist, return them
    if (existingStats && existingStats.length > 0) {
      return NextResponse.json({
        message: 'Global stats already exist',
        stats: existingStats
      });
    }
    
    // Insert sample data
    const sampleStats = [
      { id: 'TOTAL_3D_TASKS', total_tasks_completed: 150 },
      { id: 'TOTAL_IMAGE_TASKS', total_tasks_completed: 300 },
      { id: 'TOTAL_TEXT_TASKS', total_tasks_completed: 500 },
      { id: 'TOTAL_VIDEO_TASKS', total_tasks_completed: 75 }
    ];
    
    const { data: insertedStats, error: insertError } = await supabase
      .from('global_stats')
      .insert(sampleStats)
      .select();
    
    if (insertError) {
      console.error('Error inserting global stats:', insertError);
      return NextResponse.json({ error: 'Failed to insert global stats' }, { status: 500 });
    }
    
    return NextResponse.json({
      message: 'Global stats initialized successfully',
      stats: insertedStats
    });
    
  } catch (error) {
    console.error('Initialize global stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current global stats
    const { data: stats, error } = await supabase
      .from('global_stats')
      .select('id, total_tasks_completed')
      .in('id', [
        'TOTAL_3D_TASKS',
        'TOTAL_IMAGE_TASKS',
        'TOTAL_TEXT_TASKS',
        'TOTAL_VIDEO_TASKS'
      ]);
    
    if (error) {
      console.error('Error fetching global stats:', error);
      return NextResponse.json({ error: 'Failed to fetch global stats' }, { status: 500 });
    }
    
    return NextResponse.json({
      stats: stats || [],
      hasData: stats && stats.length > 0
    });
    
  } catch (error) {
    console.error('Get global stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 