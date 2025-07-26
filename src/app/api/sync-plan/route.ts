import { NextRequest, NextResponse } from 'next/server';
import { getUserPlanFromTaskSupabase, syncPlanToUserProfile } from '@/lib/taskSupabase';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const userId = searchParams.get('userId');

    if (!email || !userId) {
      return NextResponse.json(
        { error: 'Email and userId are required' },
        { status: 400 }
      );
    }

    // Get plan from task Supabase
    const plan = await getUserPlanFromTaskSupabase(email);

    if (!plan) {
      return NextResponse.json(
        { error: 'No plan found for user' },
        { status: 404 }
      );
    }
    
    // Get Supabase client
    const supabase = await createClient();
    
    // Update user profile with the plan (optional sync)
    await supabase
      .from('user_profiles')
      .update({ plan })
      .eq('id', userId)
      .then(({ error }) => {
        if (error) console.error('Error updating user profile:', error);
      });

    return NextResponse.json({
      success: true,
      plan,
      message: 'Plan retrieved successfully'
    });

  } catch (error) {
    console.error('Error in sync-plan GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, userId } = body;

    if (!email || !userId) {
      return NextResponse.json(
        { error: 'Email and userId are required' },
        { status: 400 }
      );
    }

    // Get plan from task Supabase
    const plan = await getUserPlanFromTaskSupabase(email);

    if (!plan) {
      return NextResponse.json(
        { error: 'No plan found for user in task Supabase' },
        { status: 404 }
      );
    }

    // Get Supabase client
    const supabase = await createClient();
    
    // Update user profile with the plan
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ plan })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating user profile:', updateError);
      return NextResponse.json(
        { error: 'Failed to update user profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      plan,
      message: 'Plan synced successfully'
    });

  } catch (error) {
    console.error('Error in sync-plan POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT method to manually update plan
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, userId, plan } = body;

    if (!email || !userId || !plan) {
      return NextResponse.json(
        { error: 'Email, userId, and plan are required' },
        { status: 400 }
      );
    }

    // Get Supabase client
    const supabase = await createClient();
    
    // Update user profile with the provided plan
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ plan })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating user profile:', updateError);
      return NextResponse.json(
        { error: 'Failed to update user profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      plan,
      message: 'Plan updated successfully'
    });

  } catch (error) {
    console.error('Error in sync-plan PUT:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
