// Security monitoring endpoint - Admin only
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if user is admin (you can customize this logic)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('email, plan')
      .eq('id', user.id)
      .single();

    // Only allow admin emails (customize this list)
    const adminEmails = ['admin@yourdomain.com', 'security@yourdomain.com'];
    if (!profile || !adminEmails.includes(profile.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Check for users with suspicious SP amounts
    const { data: suspiciousUsers, error: queryError } = await supabase
      .from('user_profiles')
      .select('id, user_name, email, unclaimed_reward')
      .gt('unclaimed_reward', 1000) // Users with more than 1000 SP
      .order('unclaimed_reward', { ascending: false })
      .limit(50);

    if (queryError) {
      console.error('Error fetching suspicious users:', queryError);
      return NextResponse.json({ error: 'Failed to fetch security report' }, { status: 500 });
    }

    // Check earnings_history for large amounts
    const { data: suspiciousEarnings, error: earningsError } = await supabase
      .from('earnings_history')
      .select('user_id, total_amount, created_at')
      .gt('total_amount', 5000) // Users with more than 5000 total earnings
      .order('total_amount', { ascending: false })
      .limit(20);

    if (earningsError) {
      console.error('Error fetching suspicious earnings:', earningsError);
    }

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        suspicious_unclaimed_rewards: suspiciousUsers?.length || 0,
        suspicious_earnings: suspiciousEarnings?.length || 0,
        total_checked: 'Active monitoring'
      },
      suspicious_users: suspiciousUsers || [],
      suspicious_earnings: suspiciousEarnings || [],
      security_measures: {
        sp_validation: 'ACTIVE - Max 100 SP per request',
        rate_limiting: 'ACTIVE - 10-20 requests/minute',
        security_logging: 'ACTIVE - All attempts logged',
        authentication: 'PARTIAL - 18 routes need fixing'
      },
      recommendations: [
        'Monitor users with >1000 unclaimed SP',
        'Check earnings_history for amounts >5000',
        'Review server logs for 999999999999 attempts',
        'Complete authentication fixes on remaining routes'
      ]
    };

    return NextResponse.json(report, {
      headers: {
        'Cache-Control': 'private, no-cache',
      },
    });

  } catch (error) {
    console.error('Security report error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
