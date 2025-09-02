import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch unclaimed rewards for the user
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('unclaimed_reward')
      .eq('id', user.id)
      .single();

    if (error) {
      // Error fetching unclaimed rewards
      return NextResponse.json({ error: 'Failed to fetch unclaimed rewards' }, { status: 500 });
    }

    return NextResponse.json({ 
      unclaimed_reward: profile?.unclaimed_reward || 0 
    });

  } catch (error) {
    // Exception in GET /api/unclaimed-rewards
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount } = await request.json();

    if (typeof amount !== 'number' || amount < 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    // Update unclaimed rewards for the user
    const { data, error } = await supabase
      .from('user_profiles')
      .update({ unclaimed_reward: amount })
      .eq('id', user.id)
      .select('unclaimed_reward')
      .single();

    if (error) {
      // Error updating unclaimed rewards
      return NextResponse.json({ error: 'Failed to update unclaimed rewards' }, { status: 500 });
    }

    return NextResponse.json({ 
      unclaimed_reward: data.unclaimed_reward,
      success: true 
    });

  } catch (error) {
    // Exception in POST /api/unclaimed-rewards
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { increment_amount } = await request.json();

    if (typeof increment_amount !== 'number') {
      return NextResponse.json({ error: 'Invalid increment amount' }, { status: 400 });
    }

    // First fetch current unclaimed rewards, then increment
    const { data: profile, error: fetchError } = await supabase
      .from('user_profiles')
      .select('unclaimed_reward')
      .eq('id', user.id)
      .single();

    if (fetchError) {
      // Error fetching current unclaimed rewards
      return NextResponse.json({ error: 'Failed to fetch current rewards' }, { status: 500 });
    }

    const newAmount = (profile.unclaimed_reward || 0) + increment_amount;

    const { data: updateData, error: updateError } = await supabase
      .from('user_profiles')
      .update({ unclaimed_reward: newAmount })
      .eq('id', user.id)
      .select('unclaimed_reward')
      .single();

    if (updateError) {
      // Error updating unclaimed rewards
      return NextResponse.json({ error: 'Failed to update unclaimed rewards' }, { status: 500 });
    }

    return NextResponse.json({ 
      unclaimed_reward: updateData.unclaimed_reward,
      success: true 
    });

  } catch (error) {
    // Exception in PUT /api/unclaimed-rewards
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 