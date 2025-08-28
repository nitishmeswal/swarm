import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the current session to authenticate the request
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      // Session error
    }

    // Testing get_top10_with_user_rank function

    // Test the function with current user ID
    const { data: functionResult, error: functionError } = await supabase
      .rpc('get_top10_with_user_rank', {
        target_user_id: session?.user?.id || null
      })
      .order('total_amount', { ascending: false })
      .limit(10);

    if (functionError) {
      return NextResponse.json({ 
        error: 'Function call failed', 
        details: functionError,
        user_id: session?.user?.id || null
      }, { status: 500 });
    }

    // Function result logged

    // Also test the fallback query for comparison
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('user_profiles')
      .select(`
        id,
        total_amount,
        task_completed
      `)
      .not('total_amount', 'is', null)
      .order('total_amount', { ascending: false })
      .limit(10);

    // Fallback data and error logged

    return NextResponse.json({
      success: true,
      function_result: functionResult,
      fallback_data: fallbackData,
      fallback_error: fallbackError,
      user_id: session?.user?.id || null,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    // Test leaderboard API error
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    );
  }
} 