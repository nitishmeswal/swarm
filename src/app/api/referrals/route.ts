import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// GET - Fetch referral rewards and earnings stats
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

    const userId = session.user.id;

    // Fetch data in parallel for better performance
    const [
      { data: unclaimedRewards, error: rewardsError },
      { data: referralEarnings, error: earningsError },
      { data: referralsCount, error: countError }
    ] = await Promise.all([
      // Get unclaimed referral rewards
      supabase
        .from('referral_rewards')
        .select(`
          id,
          reward_type,
          reward_amount,
          reward_timestamp,
          referral_id,
          referrals!inner(
            id,
            referred_id,
            referred_name,
            tier_level,
            referred_at
          )
        `)
        .eq('referrals.referrer_id', userId)
        .eq('claimed', false)
        .order('reward_timestamp', { ascending: false }),
      
      // Get total referral earnings from earnings table
      supabase
        .from('earnings')
        .select('amount')
        .eq('user_id', userId)
        .eq('earning_type', 'referral'),
      
      // Get referrals count for stats
      supabase
        .from('referrals')
        .select('id, tier_level', { count: 'exact' })
        .eq('referrer_id', userId)
    ]);

    if (rewardsError) {
      console.error('Error fetching referral rewards:', rewardsError);
      return NextResponse.json(
        { error: 'Failed to fetch referral rewards' },
        { status: 500 }
      );
    }

    if (earningsError) {
      console.error('Error fetching referral earnings:', earningsError);
      return NextResponse.json(
        { error: 'Failed to fetch referral earnings' },
        { status: 500 }
      );
    }

    // Calculate totals
    const pendingRewards = (unclaimedRewards || [])
      .reduce((sum, reward) => sum + Number(reward.reward_amount), 0);
    
    const totalClaimedRewards = (referralEarnings || [])
      .reduce((sum, earning) => sum + Number(earning.amount), 0);
    
    const totalReferralEarnings = pendingRewards + totalClaimedRewards;

    // Calculate tier-wise referral counts
    const tierCounts = (referralsCount || []).reduce((acc: Record<string, number>, referral: any) => {
      acc[referral.tier_level] = (acc[referral.tier_level] || 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({
      unclaimedRewards: unclaimedRewards || [],
      totalReferrals: referralsCount?.length || 0,
      tierCounts,
      pendingRewards,
      claimedRewards: totalClaimedRewards,
      totalReferralEarnings
    }, {
      headers: {
        'Cache-Control': 'private, s-maxage=30, stale-while-revalidate=60',
      },
    });
    
  } catch (error) {
    console.error('Referral rewards GET API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Claim referral rewards
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

    const body = await request.json();
    const { reward_id } = body;

    if (!reward_id) {
      return NextResponse.json(
        { error: 'Reward ID is required' },
        { status: 400 }
      );
    }

    // First, get the reward details and verify ownership
    const { data: reward, error: fetchError } = await supabase
      .from('referral_rewards')
      .select(`
        id,
        reward_amount,
        referral_id,
        claimed,
        referrals!inner(referrer_id)
      `)
      .eq('id', reward_id)
      .eq('referrals.referrer_id', session.user.id)
      .eq('claimed', false)
      .single();

    if (fetchError) {
      console.error('Error fetching reward:', fetchError);
      return NextResponse.json(
        { error: 'Reward not found or already claimed' },
        { status: 404 }
      );
    }

    const rewardAmount = Number(reward.reward_amount);

    // Use a transaction to ensure data consistency
    const { data, error } = await supabase.rpc('claim_referral_reward', {
      p_reward_id: reward_id,
      p_user_id: session.user.id,
      p_reward_amount: rewardAmount
    });

    if (error) {
      // If RPC function doesn't exist, do it manually with error handling
      console.log('RPC function not found, handling manually...');
      
      // Start transaction-like operations
      try {
        // 1. Update referral_rewards table
        const { error: updateError } = await supabase
          .from('referral_rewards')
          .update({
            claimed: true,
            reward_amount: 0,
            claimed_at: new Date().toISOString()
          })
          .eq('id', reward_id)
          .eq('claimed', false); // Double-check it's still unclaimed

        if (updateError) {
          throw updateError;
        }

        // 2. Add entry to earnings table
        const { error: earningsError } = await supabase
          .from('earnings')
          .insert({
            user_id: session.user.id,
            amount: rewardAmount,
            earning_type: 'referral'
          });

        if (earningsError) {
          // Try to rollback the referral_rewards update
          await supabase
            .from('referral_rewards')
            .update({
              claimed: false,
              reward_amount: rewardAmount,
              claimed_at: null
            })
            .eq('id', reward_id);
          
          throw earningsError;
        }

        return NextResponse.json({
          success: true,
          message: 'Referral reward claimed successfully',
          claimedAmount: rewardAmount
        }, {
          headers: {
            'Cache-Control': 'private, no-cache',
          },
        });

      } catch (manualError) {
        console.error('Error in manual transaction:', manualError);
        return NextResponse.json(
          { error: 'Failed to claim reward. Please try again.' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Referral reward claimed successfully',
      claimedAmount: rewardAmount
    }, {
      headers: {
        'Cache-Control': 'private, no-cache',
      },
    });
    
  } catch (error) {
    console.error('Referral rewards POST API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 