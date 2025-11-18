import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/error?message=No authorization code`);
  }

  try {
    
    // Call YOUR Express backend
    const response = await fetch(`${API_URL}/auth/google/callback`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ code })
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.redirect(`${origin}/auth/error?message=${encodeURIComponent(errorData.error || 'Authentication failed')}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      return NextResponse.redirect(`${origin}/auth/error?message=${encodeURIComponent(result.error || 'Authentication failed')}`);
    }

    // ✅ FIX: Pass token and user data through URL hash (client-side only, not logged in server)
    // This ensures the data reaches the client without cookie issues
    const authData = Buffer.from(JSON.stringify({
      token: result.data.token,
      user: result.data.user
    })).toString('base64');

    // Redirect to home page with auth data in hash
    const redirectUrl = `${origin}#auth=${authData}`;
    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    // ✅ SECURITY: No error details logged to prevent data leakage
    return NextResponse.redirect(`${origin}/auth/error?message=Authentication failed`);
  }
}