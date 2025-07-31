import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// POST - Verify referral code
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
    const { code } = body;

    // Validate input
    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'Referral code is required' },
        { status: 400 }
      );
    }

    // Call the RPC function to verify referral code
    const { data: referrerId, error } = await supabase.rpc('verify_referral_code', {
      code: code.trim()
    });

    if (error) {
      console.error('Referral verification error:', error);
      return NextResponse.json(
        { error: error.message || 'Invalid referral code' },
        { status: 400 }
      );
    }

    if (!referrerId) {
      return NextResponse.json(
        { error: 'Referral code does not exist' },
        { status: 404 }
      );
    }

    // Check if user is trying to refer themselves
    if (referrerId === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot use your own referral code' },
        { status: 400 }
      );
    }

    // Check if user is already referred
    const { data: existingReferral, error: checkError } = await supabase
      .from('referrals')
      .select('id')
      .eq('referred_id', session.user.id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing referral:', checkError);
      return NextResponse.json(
        { error: 'Failed to verify referral status' },
        { status: 500 }
      );
    }

    if (existingReferral) {
      return NextResponse.json(
        { error: 'You have already been referred by someone else' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        referrerId,
        message: 'Referral code verified successfully'
      },
      {
        headers: {
          'Cache-Control': 'private, no-cache',
        },
      }
    );

  } catch (error) {
    console.error('Referral verify API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 