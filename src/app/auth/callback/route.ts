import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createClient();
    
    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error('Error exchanging code for session:', error);
        return NextResponse.redirect(`${origin}/auth/error?message=${encodeURIComponent(error.message)}`);
      }
    } catch (error) {
      console.error('Unexpected error in auth callback:', error);
      return NextResponse.redirect(`${origin}/auth/error?message=Authentication failed`);
    }
  }

  // Redirect to dashboard or intended page after successful authentication
  return NextResponse.redirect(`${origin}/dashboard`);
}
