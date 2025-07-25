import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const { 
      increment_amount, 
      task_id, 
      task_type, 
      hardware_tier, 
      multiplier 
    } = await request.json();

    if (typeof increment_amount !== 'number') {
      return NextResponse.json({ error: 'Invalid increment amount' }, { status: 400 });
    }

    // Call the Supabase edge function with server-side auth
    const response = await fetch('https://phpaoasgtqsnwohtevwf.supabase.co/functions/v1/complete-task', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`,
      },
      body: JSON.stringify({
        user_id: user.id,
        increment_amount,
        task_id,
        task_type,
        hardware_tier,
        multiplier
      })
    });

    // If the edge function call fails, use our local API route as fallback
    if (!response.ok) {
      console.error(`Edge function failed with status ${response.status}`);
      
      // First fetch current unclaimed rewards, then increment
      const { data: profile, error: fetchError } = await supabase
        .from('user_profiles')
        .select('unclaimed_reward')
        .eq('id', user.id)
        .single();

      if (fetchError) {
        console.error('Error fetching current unclaimed rewards:', fetchError);
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
        console.error('Error updating unclaimed rewards:', updateError);
        return NextResponse.json({ error: 'Failed to update unclaimed rewards' }, { status: 500 });
      }

      return NextResponse.json({ 
        unclaimed_reward: updateData.unclaimed_reward,
        success: true 
      });
    }

    // Return the edge function response
    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Exception in POST /api/complete-task:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
