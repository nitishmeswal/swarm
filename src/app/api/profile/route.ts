import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// GET - Fetch user profile
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    
    if (error) {
      console.error('Error fetching user profile:', error);
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { profile },
      {
        headers: {
          'Cache-Control': 'private, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
    
  } catch (error) {
    console.error('Profile GET API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update user profile
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const updates = await request.json();

    // Remove id and other protected fields from updates
    const { id, ...safeUpdates } = updates;

    const { data: updatedProfile, error } = await supabase
      .from('user_profiles')
      .update(safeUpdates)
      .eq('id', session.user.id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating user profile:', error);
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { profile: updatedProfile },
      {
        headers: {
          'Cache-Control': 'private, no-cache',
        },
      }
    );
    
  } catch (error) {
    console.error('Profile PUT API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create user profile
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const profileData = await request.json();

    // Generate referral code if not provided
    const generateReferralCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = '';
      for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    const newProfileData = {
      id: session.user.id,
      email: session.user.email,
      user_name: profileData.user_name || session.user.email?.split('@')[0],
      joined_at: new Date().toISOString(),
      referral_code: generateReferralCode(),
      freedom_ai_credits: 10000,
      music_video_credits: 0,
      deepfake_credits: 0,
      video_generator_credits: 0,
      plan: 'free',
      reputation_score: 0,
      ...profileData
    };

    const { data: newProfile, error } = await supabase
      .from('user_profiles')
      .insert(newProfileData)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating user profile:', error);
      return NextResponse.json(
        { error: 'Failed to create profile' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { profile: newProfile },
      {
        headers: {
          'Cache-Control': 'private, no-cache',
        },
      }
    );
    
  } catch (error) {
    console.error('Profile POST API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update task_completed count
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { completed_tasks } = await request.json();

    if (!completed_tasks || typeof completed_tasks !== 'object') {
      return NextResponse.json(
        { error: 'completed_tasks object is required' },
        { status: 400 }
      );
    }

    console.log('PATCH /api/profile - Received completed_tasks:', completed_tasks);

    // Calculate total tasks completed
    const totalTasks = (completed_tasks.three_d || 0) + 
                      (completed_tasks.video || 0) + 
                      (completed_tasks.text || 0) + 
                      (completed_tasks.image || 0);

    // Add bonus if all task types have at least 1 completed task
    const allTypesCompleted = completed_tasks.three_d > 0 && 
                             completed_tasks.video > 0 && 
                             completed_tasks.text > 0 && 
                             completed_tasks.image > 0;
    
    const tasksToAdd = allTypesCompleted ? totalTasks + 4 : totalTasks;

    console.log('PATCH /api/profile - Calculation:', {
      totalTasks,
      allTypesCompleted,
      tasksToAdd,
      userId: session.user.id
    });

    if (tasksToAdd <= 0) {
      return NextResponse.json(
        { message: 'No tasks to update', tasks_added: 0 },
        { status: 200 }
      );
    }

    // First get current task_completed count
    const { data: currentProfile, error: fetchError } = await supabase
      .from('user_profiles')
      .select('task_completed')
      .eq('id', session.user.id)
      .single();

    if (fetchError) {
      console.error('Error fetching current task count:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch current task count' },
        { status: 500 }
      );
    }

    const newTaskCount = (currentProfile.task_completed || 0) + tasksToAdd;

    // Update the task_completed count
    const { data: updatedProfile, error } = await supabase
      .from('user_profiles')
      .update({ 
        task_completed: newTaskCount
      })
      .eq('id', session.user.id)
      .select('task_completed')
      .single();
    
    if (error) {
      console.error('Error updating task_completed:', error);
      return NextResponse.json(
        { error: 'Failed to update task completed count' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        message: 'Task completed count updated successfully',
        tasks_added: tasksToAdd,
        bonus_applied: allTypesCompleted,
        new_total: updatedProfile.task_completed,
        breakdown: {
          base_tasks: totalTasks,
          bonus: allTypesCompleted ? 4 : 0,
          total_added: tasksToAdd
        }
      },
      {
        headers: {
          'Cache-Control': 'private, no-cache',
        },
      }
    );
    
  } catch (error) {
    console.error('Profile PATCH API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 