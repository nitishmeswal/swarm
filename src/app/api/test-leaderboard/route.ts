import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the current session to authenticate the request
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('Session error:', sessionError);
    }

    console.log('Testing get_top10_with_user_rank function...');
    console.log('Current user ID:', session?.user?.id || 'No user');

    // Test the function with current user ID
    const { data: functionResult, error: functionError } = await supabase
      .rpc('get_top10_with_user_rank', {
        target_user_id: session?.user?.id || null
      });

    if (functionError) {
      console.error('Function error:', functionError);
      return NextResponse.json({ 
        error: 'Function call failed', 
        details: functionError,
        user_id: session?.user?.id || null
      }, { status: 500 });
    }

    console.log('Function result:', functionResult);

    // Also test the fallback query for comparison
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('earnings_history')
      .select(`
        user_id,
        total_amount,
        user_profiles!inner(
          user_name
        )
      `)
      .order('total_amount', { ascending: false })
      .limit(10);

    console.log('Fallback data:', fallbackData);
    console.log('Fallback error:', fallbackError);

    return NextResponse.json({
      success: true,
      function_result: functionResult,
      fallback_data: fallbackData,
      fallback_error: fallbackError,
      user_id: session?.user?.id || null,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Test leaderboard API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    );
  }
} 