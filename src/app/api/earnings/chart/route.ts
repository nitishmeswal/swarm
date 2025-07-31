import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({
        chartData: [],
        summary: { totalEarnings: 0, periodEarnings: 0, avgDaily: 0, dataPoints: 0 }
      });
    }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || 'monthly';

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (range) {
      case 'daily':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'weekly':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case 'monthly':
      default:
        startDate.setDate(endDate.getDate() - 30);
        break;
    }

    // Fetch earnings data for the period
    const { data: earnings, error } = await supabase
      .from('earnings')
      .select('amount, created_at')
      .eq('user_id', user.id)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching chart data:', error);
      return NextResponse.json({
        chartData: [],
        summary: { totalEarnings: 0, periodEarnings: 0, avgDaily: 0, dataPoints: 0 }
      });
    }

    // Group earnings by date
    const dailyEarnings = new Map<string, number>();
    let totalPeriodEarnings = 0;

    // Initialize all dates in range with 0
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split('T')[0];
      dailyEarnings.set(dateKey, 0);
    }

    // Aggregate earnings by date
    earnings?.forEach(earning => {
      const date = new Date(earning.created_at).toISOString().split('T')[0];
      const amount = Number(earning.amount) || 0;
      dailyEarnings.set(date, (dailyEarnings.get(date) || 0) + amount);
      totalPeriodEarnings += amount;
    });

    // Convert to chart data format
    const chartData = Array.from(dailyEarnings.entries()).map(([date, earnings]) => ({
      date,
      earnings,
      totalEarnings: earnings,
      highlight: earnings > 0
    }));

    const avgDaily = chartData.length > 0 ? totalPeriodEarnings / chartData.length : 0;

    const summary = {
      totalEarnings: totalPeriodEarnings,
      periodEarnings: totalPeriodEarnings,
      avgDaily,
      dataPoints: chartData.length
    };

    return NextResponse.json({
      chartData,
      summary
    });

  } catch (error) {
    console.error('Chart API error:', error);
    return NextResponse.json({
      chartData: [],
      summary: { totalEarnings: 0, periodEarnings: 0, avgDaily: 0, dataPoints: 0 }
    });
  }
}