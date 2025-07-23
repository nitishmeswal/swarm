import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get the current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Fetch user task statistics from user_profiles table
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('task_completed')
      .eq('id', session.user.id)
      .single();

    if (profileError) {
      console.error('Error fetching user task stats:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch user task statistics' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      taskCompleted: userProfile?.task_completed || 0
    });

  } catch (error) {
    console.error('Exception in user-task-stats API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 