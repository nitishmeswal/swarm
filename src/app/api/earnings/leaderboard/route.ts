import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    console.log('Starting /api/earnings/leaderboard GET request');
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('User authentication error:', userError);
      return NextResponse.json({ error: 'Unauthorized', details: userError }, { status: 401 });
    }
    
    console.log('User authenticated:', user.id);

    // Check if we have the service role key
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
      // Fall back to regular client if service role key is missing
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('earnings_leaderboard')
        .select('total_earnings')
        .eq('user_id', user.id)
        .single();
        
      if (fallbackError) {
        console.log('Fallback query error:', fallbackError);
        // If no record exists, return 0
        if (fallbackError.code === 'PGRST116') {
          return NextResponse.json({ total_earnings: 0 });
        }
        return NextResponse.json({ total_earnings: 0 });
      }
      
      return NextResponse.json({ 
        total_earnings: fallbackData?.total_earnings || 0 
      });
    }

    // Create an admin client with the service role key to access the view
    console.log('Creating admin client with service role key');
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // Fetch total earnings from earnings_leaderboard using admin client
    console.log('Fetching earnings for user:', user.id);
    const { data, error } = await adminClient
      .from('earnings_leaderboard')
      .select('total_earnings')
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error fetching total earnings:', error);
      
      // If no record exists yet, return 0
      if (error.code === 'PGRST116') {
        console.log('No earnings record found, returning 0');
        return NextResponse.json({ total_earnings: 0 });
      }
      
      // For any other error, return 0 instead of error to avoid breaking the UI
      console.error('Returning 0 due to error:', error);
      return NextResponse.json({ total_earnings: 0 });
    }

    console.log('Successfully fetched earnings:', data?.total_earnings || 0);
    return NextResponse.json({ 
      total_earnings: data?.total_earnings || 0 
    });

  } catch (error) {
    console.error('Exception in GET /api/earnings/leaderboard:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
