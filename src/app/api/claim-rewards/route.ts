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
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || ''}`,
      },
      body: JSON.stringify({
        user_id: user.id
      })
    });

    // If the edge function call fails, use our local API route as fallback
    if (!response.ok) {
      console.error(`Edge function failed with status ${response.status}`);
      // Start a safe sequence to move unclaimed rewards to earnings
      // 1) Read current unclaimed_reward
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

      const unclaimedAmount = Number(profile?.unclaimed_reward) || 0;

      if (unclaimedAmount <= 0) {
        return NextResponse.json({
          success: false,
          message: 'No rewards to claim'
        });
      }

      // 2) Conditionally reset to 0 only if the amount still matches (prevents double-claim in race)
      const { data: resetRow, error: conditionalUpdateError } = await supabase
        .from('user_profiles')
        .update({ unclaimed_reward: 0 })
        .eq('id', user.id)
        .eq('unclaimed_reward', unclaimedAmount)
        .select('unclaimed_reward')
        .maybeSingle();

      if (conditionalUpdateError) {
        console.error('Error resetting unclaimed rewards (conditional):', conditionalUpdateError);
        return NextResponse.json({
          success: false,
          error: 'Failed to reset unclaimed rewards'
        }, { status: 500 });
      }

      // If no row was updated (e.g., someone else already claimed), treat as no rewards to claim
      if (!resetRow) {
        return NextResponse.json({
          success: false,
          message: 'No rewards to claim'
        });
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

      // Upsert into earnings_history (single row per user_id), update timestamp column
      const { error: historyError } = await supabase
        .from('earnings_history')
        .upsert({
          user_id: user.id,
          total_amount: newTotalEarnings,
          timestamp: new Date().toISOString(),
          payout_status: 'pending'
        }, { onConflict: 'user_id' });

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
