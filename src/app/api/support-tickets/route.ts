import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// POST - Create new support ticket
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const body = await request.json();
    const { name, email, message } = body;

    // Validate input
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: name, email, message' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Insert the support ticket into the database
    const { data, error } = await supabase
      .from('support_tickets')
      .insert({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        message: message.trim()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating support ticket:', error);
      return NextResponse.json(
        { error: 'Failed to create support ticket' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        success: true,
        message: 'Support ticket created successfully',
        ticket: {
          id: data.id,
          created_at: data.created_at
        }
      },
      {
        headers: {
          'Cache-Control': 'private, no-cache',
        },
      }
    );

  } catch (error) {
    console.error('Support tickets POST API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Get support tickets (optional admin functionality)
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

    // For now, just return a simple response - you can extend this for admin functionality
    return NextResponse.json(
      { message: 'Support tickets endpoint is available' },
      {
        headers: {
          'Cache-Control': 'private, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );

  } catch (error) {
    console.error('Support tickets GET API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 