import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

  console.log("🔑 Auth callback triggered", { 
    hasCode: !!code,
    url: requestUrl.toString(),
    origin 
  });

  if (!code) {
    console.error('❌ No code provided in callback');
    return NextResponse.redirect(`${origin}/auth/error?message=No authorization code`);
  }

  try {
    console.log("🔄 Sending code to Express backend");
    
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
      console.error('❌ Backend returned error:', errorData);
      return NextResponse.redirect(`${origin}/auth/error?message=${encodeURIComponent(errorData.error || 'Authentication failed')}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      console.error('❌ Authentication failed:', result.error);
      return NextResponse.redirect(`${origin}/auth/error?message=${encodeURIComponent(result.error || 'Authentication failed')}`);
    }

    console.log("✅ Google auth successful", {
      userId: result.data?.user?.id,
      email: result.data?.user?.email,
      hasToken: !!result.data?.token
    });

    // Store the token in httpOnly cookie
    const cookieStore = await cookies();
    cookieStore.set('token', result.data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    // Also store in regular cookie for client-side access (if needed)
    cookieStore.set('auth_token', result.data.token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    console.log("✅ Token stored in cookies");

    // Redirect to home page
    const redirectUrl = origin; // Just http://localhost:3000
    console.log("🔄 Redirecting to:", redirectUrl);
    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error('❌ Unexpected error in auth callback:', error);
    return NextResponse.redirect(`${origin}/auth/error?message=Authentication failed`);
  }
}