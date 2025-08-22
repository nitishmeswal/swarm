import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// POST - Update node uptime
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
    const { device_id, uptime_seconds, completed_tasks } = body;

    // Validate input
    if (!device_id || uptime_seconds === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: device_id, uptime_seconds' },
        { status: 400 }
      );
    }

    // Verify the device belongs to the authenticated user
    const { data: deviceData, error: deviceError } = await supabase
      .from('devices')
      .select('owner')
      .eq('id', device_id)
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

    // Format completed_tasks as the Edge Function expects
    const formattedTasks = {
      three_d: completed_tasks?.three_d || 0,
      video: completed_tasks?.video || 0,
      text: completed_tasks?.text || 0,
      image: completed_tasks?.image || 0
    };

    // Make the external API call server-side
    const response = await fetch(
      'https://phpaoasgtqsnwohtevwf.supabase.co/functions/v1/node_uptime_updation',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          device_id,
          uptime_seconds,
          completed_tasks: formattedTasks  // Send as object, not number
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('External API error:', {
        status: response.status,
        error: errorText,
        sentPayload: {
          device_id,
          uptime_seconds,
          completed_tasks: formattedTasks
        }
      });
      return NextResponse.json(
        { error: 'Failed to update node uptime', details: errorText },
        { status: response.status }
      );
    }

    const result = await response.json();

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'private, no-cache',
      },
    });

  } catch (error) {
    console.error('Node uptime API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}