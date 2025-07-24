import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// GET - Check if current user has been referred by someone
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if the current user appears as a referred user in any referral relationship
    const { data: referralData, error: referralError } = await supabase
      .from('referrals')
      .select('id, referrer_id, referred_id, referred_name, tier_level, referred_at')
      .eq('referred_id', user.id)
      .eq('tier_level', 'tier_1') // Only check direct referrals
      .maybeSingle();

    if (referralError) {
      console.error('Error checking referral status:', referralError);
      return NextResponse.json(
        { error: 'Failed to check referral status' },
        { status: 500 }
      );
    }

    // If referralData exists, get the referrer's profile info
    let referrerName = 'Anonymous User';
    if (referralData) {
      const { data: referrerProfile } = await supabase
        .from('user_profiles')
        .select('full_name, email')
        .eq('id', referralData.referrer_id)
        .maybeSingle();
      
      referrerName = referrerProfile?.full_name || referrerProfile?.email || 'Anonymous User';
    }

    // If referralData exists, user has been referred
    const isReferred = !!referralData;
    
    return NextResponse.json({
      isReferred,
      referrerInfo: referralData ? {
        id: referralData.referrer_id,
        name: referrerName,
        referredAt: referralData.referred_at
      } : null
    }, {
      headers: {
        'Cache-Control': 'private, s-maxage=60, stale-while-revalidate=120',
      },
    });
    
  } catch (error) {
    console.error('Check referred API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
