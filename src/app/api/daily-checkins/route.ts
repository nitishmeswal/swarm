import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Daily reward amounts for each day (1-7)
const DAILY_REWARDS = [10, 20, 30, 40, 50, 60, 70];

// GET - Get current streak status
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
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    // Get or create user streak record
    let { data: streakData, error: streakError } = await supabase
      .from('user_daily_streaks')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (streakError && streakError.code !== 'PGRST116') {
      console.error('Error fetching streak data:', streakError);
      return NextResponse.json(
        { error: 'Failed to fetch streak data' },
        { status: 500 }
      );
    }

    // Create initial streak record if doesn't exist
    if (!streakData) {
      const { data: newStreak, error: createError } = await supabase
        .from('user_daily_streaks')
        .insert({
          user_id: userId,
          current_streak: 0,
          last_checkin_date: null,
          total_completed_cycles: 0
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating streak record:', createError);
        return NextResponse.json(
          { error: 'Failed to create streak record' },
          { status: 500 }
        );
      }
      streakData = newStreak;
    }

    // Check if user already checked in today
    const { data: todayCheckin } = await supabase
      .from('daily_checkins')
      .select('*')
      .eq('user_id', userId)
      .eq('check_in_date', today)
      .maybeSingle();

    // Calculate current streak status
    let currentStreak = streakData.current_streak;
    let canCheckIn = !todayCheckin;
    
    // Check if streak should be reset due to missed days
    if (streakData.last_checkin_date) {
      const lastCheckin = new Date(streakData.last_checkin_date);
      const todayDate = new Date(today);
      const daysDiff = Math.floor((todayDate.getTime() - lastCheckin.getTime()) / (1000 * 60 * 60 * 24));
      
      // If more than 1 day gap, reset streak
      if (daysDiff > 1) {
        currentStreak = 0;
        // Update the streak record
        await supabase
          .from('user_daily_streaks')
          .update({ 
            current_streak: 0,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);
      }
    }

    // Calculate next reward
    const nextDay = (currentStreak % 7) + 1;
    const nextReward = DAILY_REWARDS[nextDay - 1];

    return NextResponse.json({
      currentStreak,
      lastCheckinDate: streakData.last_checkin_date,
      totalCompletedCycles: streakData.total_completed_cycles,
      canCheckIn,
      nextReward,
      hasCheckedInToday: !!todayCheckin,
      todayCheckin: todayCheckin || null
    });

  } catch (error) {
    console.error('Daily checkins GET API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Handle daily check-in
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

    const userId = session.user.id;
    const today = new Date().toISOString().split('T')[0];

    // Check if user already checked in today
    const { data: todayCheckin } = await supabase
      .from('daily_checkins')
      .select('*')
      .eq('user_id', userId)
      .eq('check_in_date', today)
      .maybeSingle();

    if (todayCheckin) {
      return NextResponse.json(
        { error: 'Already checked in today' },
        { status: 400 }
      );
    }

    // Get current streak data
    let { data: streakData, error: streakError } = await supabase
      .from('user_daily_streaks')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (streakError) {
      console.error('Error fetching streak data:', streakError);
      return NextResponse.json(
        { error: 'Failed to fetch streak data' },
        { status: 500 }
      );
    }

    let currentStreak = streakData.current_streak;
    let totalCompletedCycles = streakData.total_completed_cycles;

    // Check if streak should be reset due to missed days
    if (streakData.last_checkin_date) {
      const lastCheckin = new Date(streakData.last_checkin_date);
      const todayDate = new Date(today);
      const daysDiff = Math.floor((todayDate.getTime() - lastCheckin.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff > 1) {
        currentStreak = 0; // Reset streak
      }
    }

    // Calculate new streak and day number
    const newStreak = currentStreak + 1;
    const dayNumber = ((newStreak - 1) % 7) + 1; // 1-7
    const rewardAmount = DAILY_REWARDS[dayNumber - 1];

    // Check if completing a 7-day cycle
    let newCompletedCycles = totalCompletedCycles;
    if (newStreak % 7 === 0) {
      newCompletedCycles += 1;
    }

    // Start transaction to ensure consistency
    const { error: transactionError } = await supabase.rpc('handle_daily_checkin', {
      p_user_id: userId,
      p_check_in_date: today,
      p_day_number: dayNumber,
      p_reward_amount: rewardAmount,
      p_new_streak: newStreak,
      p_new_completed_cycles: newCompletedCycles
    });

    // If the RPC doesn't exist, do it manually
    if (transactionError && transactionError.message?.includes('function')) {
      // Manual transaction using multiple queries
      // 1. Insert daily checkin record
      const { error: checkinError } = await supabase
        .from('daily_checkins')
        .insert({
          user_id: userId,
          check_in_date: today,
          day_number: dayNumber,
          reward_amount: rewardAmount,
          streak_count: newStreak
        });

      if (checkinError) {
        console.error('Error creating checkin record:', checkinError);
        return NextResponse.json(
          { error: 'Failed to record check-in' },
          { status: 500 }
        );
      }

      // 2. Update streak record
      const { error: updateError } = await supabase
        .from('user_daily_streaks')
        .update({
          current_streak: newStreak,
          last_checkin_date: today,
          total_completed_cycles: newCompletedCycles,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Error updating streak:', updateError);
        return NextResponse.json(
          { error: 'Failed to update streak' },
          { status: 500 }
        );
      }
    } else if (transactionError) {
      console.error('Transaction error:', transactionError);
      return NextResponse.json(
        { error: 'Failed to process check-in' },
        { status: 500 }
      );
    }

    // 3. Add reward to user's earnings directly to the earnings table
    try {
      const { error: earningsError } = await supabase
        .from('earnings')
        .insert({
          user_id: userId,
          amount: rewardAmount,
          earning_type: 'other', // This identifies it as daily check-in
          transaction_hash: null,
          task_count: null,
          created_at: new Date().toISOString()
        });

      if (earningsError) {
        console.error('Failed to add earnings record:', earningsError);
        // Don't fail the whole request, but log the error
        console.error('Warning: Check-in recorded but earnings record not added');
      } else {
        console.log(`Successfully added daily check-in earnings: ${rewardAmount} SP`);
      }
    } catch (earningsError) {
      console.error('Error adding earnings record:', earningsError);
      // Don't fail the whole request
    }

    return NextResponse.json({
      success: true,
      streak: newStreak,
      dayNumber,
      rewardAmount,
      totalCompletedCycles: newCompletedCycles,
      message: `Day ${dayNumber} checked in! You earned ${rewardAmount} SP!`,
      isNewCycle: newStreak % 7 === 0
    });

  } catch (error) {
    console.error('Daily checkins POST API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 