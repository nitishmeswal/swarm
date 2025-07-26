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

    // Call the Supabase edge function with server-side auth
    const response = await fetch('https://phpaoasgtqsnwohtevwf.supabase.co/functions/v1/claim-rewards', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`,
      },
      body: JSON.stringify({
        user_id: user.id
      })
    });

    // If the edge function call fails, use our local API route as fallback
    if (!response.ok) {
      console.error(`Edge function failed with status ${response.status}`);
      
      // Start a transaction to move unclaimed rewards to earnings
      const { data: profile, error: fetchError } = await supabase
        .from('user_profiles')
        .select('unclaimed_reward')
        .eq('id', user.id)
        .single();

      if (fetchError) {
        console.error('Error fetching current unclaimed rewards:', fetchError);
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to fetch current rewards' 
        }, { status: 500 });
      }

      const unclaimedAmount = profile.unclaimed_reward || 0;
      
      if (unclaimedAmount <= 0) {
        return NextResponse.json({ 
          success: false, 
          message: 'No rewards to claim' 
        });
      }

      // Reset unclaimed rewards to 0
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ unclaimed_reward: 0 })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error resetting unclaimed rewards:', updateError);
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to reset unclaimed rewards' 
        }, { status: 500 });
      }

      // Get current total earnings
      const { data: earnings, error: earningsError } = await supabase
        .from('earnings_leaderboard')
        .select('total_earnings')
        .eq('user_id', user.id)
        .single();

      const currentEarnings = earnings?.total_earnings || 0;
      const newTotalEarnings = currentEarnings + unclaimedAmount;

      // Update or insert into earnings_leaderboard
      const { error: leaderboardError } = await supabase
        .from('earnings_leaderboard')
        .upsert({
          user_id: user.id,
          total_earnings: newTotalEarnings,
          updated_at: new Date().toISOString()
        });

      if (leaderboardError) {
        console.error('Error updating earnings leaderboard:', leaderboardError);
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to update earnings leaderboard' 
        }, { status: 500 });
      }

      // Add entry to earnings_history
      const { error: historyError } = await supabase
        .from('earnings_history')
        .insert({
          user_id: user.id,
          total_amount: newTotalEarnings,
          created_at: new Date().toISOString()
        });

      if (historyError) {
        console.error('Error adding earnings history:', historyError);
        // Not returning an error here as the main operation succeeded
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Rewards claimed successfully',
        data: {
          claimed_amount: unclaimedAmount,
          new_total_earnings: newTotalEarnings
        }
      });
    }

    // Return the edge function response
    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Exception in POST /api/claim-rewards:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
