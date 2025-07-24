import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    
    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user ID from session
    const userId = session.user.id;
    
    // Parse request body
    const { user_name, wallet_address, wallet_type } = await request.json();
    
    // Prepare update data (only include fields that are provided)
    const updateData: any = {};
    
    if (user_name !== undefined) {
      updateData.user_name = user_name;
    }
    
    if (wallet_address !== undefined) {
      updateData.wallet_address = wallet_address;
    }
    
    if (wallet_type !== undefined) {
      updateData.wallet_type = wallet_type;
    }
    
    // If no data to update, return early
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No data provided for update' }, { status: 400 });
    }

    // Update user profile in database
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('id', userId)
      .select();

    if (error) {
      console.error('Error updating profile:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Profile updated successfully',
      data: data[0]
    });
    
  } catch (error: any) {
    console.error('Error in profile update API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Also support POST for clients that might not support PATCH
export { PATCH as POST } 