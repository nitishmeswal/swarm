import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');

    if (!deviceId) {
      return NextResponse.json({ error: 'Device ID required' }, { status: 400 });
    }

    const supabase = await createClient();
    
    const { data: device, error } = await supabase
      .from('devices')
      .select('status, session_token, session_created_at')
      .eq('id', deviceId)
      .single();

    if (error) {
      return NextResponse.json({ 
        hasActiveSession: false, 
        sessionToken: null,
        sessionCreatedAt: null,
        deviceStatus: "offline" 
      });
    }

    return NextResponse.json({
      hasActiveSession: device.status === 'busy' && !!device.session_token,
      sessionToken: device.session_token,
      sessionCreatedAt: device.session_created_at,
      status: device.status
    });

  } catch (error) {
    console.error('Device session verify error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { deviceId, sessionToken } = await request.json();

    if (!deviceId || !sessionToken) {
      return NextResponse.json({ error: 'Device ID and session token required' }, { status: 400 });
    }

    const supabase = await createClient();
    
    const { data: device, error } = await supabase
      .from('devices')
      .select('session_token')
      .eq('id', deviceId)
      .single();

    if (error) {
      return NextResponse.json({ isSessionValid: false });
    }

    return NextResponse.json({
      isSessionValid: device.session_token === sessionToken
    });

  } catch (error) {
    console.error('Session ownership verify error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
