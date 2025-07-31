import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { transactions: [] },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '15');

    // Fetch recent transactions from earnings table
    const { data: transactions, error } = await supabase
      .from('earnings')
      .select(`
        id,
        amount,
        created_at,
        earning_type,
        transaction_hash,
        task_count
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching transactions:', error);
      return NextResponse.json(
        { transactions: [] },
        { status: 500 }
      );
    }

    return NextResponse.json({
      transactions: transactions || []
    });

  } catch (error) {
    console.error('Transactions API error:', error);
    return NextResponse.json(
      { transactions: [] },
      { status: 500 }
    );
  }
}