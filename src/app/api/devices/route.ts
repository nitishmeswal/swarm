import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// GET - Fetch user devices
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

    const { data, error } = await supabase
      .from('devices')
      .select('*')
      .eq('owner', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user devices:', error);
      return NextResponse.json(
        { error: 'Failed to fetch devices' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { devices: data || [] },
      {
        headers: {
          'Cache-Control': 'private, s-maxage=30, stale-while-revalidate=60',
        },
      }
    );

  } catch (error) {
    console.error('Devices GET API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new device
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
    const { gpu_model, device_type, reward_tier, device_name } = body;

    // Validate input
    if (!device_type || !reward_tier || !device_name) {
      return NextResponse.json(
        { error: 'Missing required fields: device_type, reward_tier, device_name' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('devices')
      .insert({
        owner: session.user.id,
        gpu_model: gpu_model || null,
        device_type,
        reward_tier,
        device_name,
        status: 'offline'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating device:', error);
      return NextResponse.json(
        { error: 'Failed to create device' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { device: data },
      {
        headers: {
          'Cache-Control': 'private, no-cache',
        },
      }
    );

  } catch (error) {
    console.error('Devices POST API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete user device
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('id');

    if (!deviceId) {
      return NextResponse.json(
        { error: 'Device ID is required' },
        { status: 400 }
      );
    }

    // Verify the device belongs to the authenticated user
    const { data: deviceData, error: deviceError } = await supabase
      .from('devices')
      .select('owner')
      .eq('id', deviceId)
      .single();

    if (deviceError || !deviceData) {
      return NextResponse.json(
        { error: 'Device not found' },
        { status: 404 }
      );
    }

    if (deviceData.owner !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized access to device' },
        { status: 403 }
      );
    }

    const { error: deleteError } = await supabase
      .from('devices')
      .delete()
      .eq('id', deviceId);

    if (deleteError) {
      console.error('Error deleting device:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete device' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Device deleted successfully' },
      {
        headers: {
          'Cache-Control': 'private, no-cache',
        },
      }
    );

  } catch (error) {
    console.error('Devices DELETE API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update device status and other fields
export async function PATCH(request: NextRequest) {
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
    const { device_id, status, uptime, last_seen } = body;

    // Validate input
    if (!device_id) {
      return NextResponse.json(
        { error: 'Device ID is required' },
        { status: 400 }
      );
    }

    // Build update object
    const updateData: any = {};
    if (status) updateData.status = status;
    if (uptime !== undefined) updateData.uptime = uptime;
    if (last_seen !== undefined) updateData.last_seen = last_seen;

    const { data, error } = await supabase
      .from('devices')
      .update(updateData)
      .eq('id', device_id)
      .eq('owner', session.user.id) // Ensure user owns the device
      .select()
      .single();

    if (error) {
      console.error('Error updating device:', error);
      return NextResponse.json(
        { error: 'Failed to update device' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { device: data },
      {
        headers: {
          'Cache-Control': 'private, no-cache',
        },
      }
    );

  } catch (error) {
    console.error('Devices PATCH API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
