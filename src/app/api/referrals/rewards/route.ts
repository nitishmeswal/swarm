import { createClient } from '@/utils/supabase/server';

import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const session = await supabase.auth.getSession();

    if (!session.data.session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { referralCode, userId } = await request.json();

    if (!referralCode || !userId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Find the referrer using the referral code
    const { data: referrerData, error: referrerError } = await supabase
      .from('user_profiles')
      .select('id, email')
      .eq('referral_code', referralCode)
      .single();

    if (referrerError || !referrerData) {
      return NextResponse.json(
        { error: 'Invalid referral code' },
        { status: 400 }
      );
    }

    // Add rewards to both users
    const referrerReward = 250; // SP for referrer
    const referredReward = 500; // SP for referred user

    // Add reward for referrer
    const referrerResponse = await fetch(
      'https://phpaoasgtqsnwohtevwf.supabase.co/functions/v1/add_earnings',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.data.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reward_type: 'referral',
          amount: referrerReward,
          user_id: referrerData.id,
        }),
      }
    );

    // Add reward for referred user
    const referredResponse = await fetch(
      'https://phpaoasgtqsnwohtevwf.supabase.co/functions/v1/add_earnings',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.data.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reward_type: 'referral',
          amount: referredReward,
          user_id: userId,
        }),
      }
    );

    if (!referrerResponse.ok || !referredResponse.ok) {
      throw new Error('Failed to add rewards');
    }

    return NextResponse.json({
      success: true,
      message: 'Referral rewards added successfully',
    });

  } catch (error) {
    console.error('Error processing referral rewards:', error);
    return NextResponse.json(
      { error: 'Failed to process referral rewards' },
      { status: 500 }
    );
  }
} 