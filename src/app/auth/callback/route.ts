import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

  console.log("🔑 Auth callback triggered", { 
    hasCode: !!code,
    url: requestUrl.toString(),
    origin 
  });

  if (code) {
    const supabase = await createClient();
    
    try {
      console.log("🔄 Exchanging code for session");
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error('❌ Error exchanging code for session:', error);
        return NextResponse.redirect(`${origin}/auth/error?message=${encodeURIComponent(error.message)}`);
      }
      
      console.log("✅ Session established successfully", {
        userId: data?.session?.user?.id,
        email: data?.session?.user?.email,
        hasSession: !!data?.session
      });

      // Check if user has a profile, create one if not
      if (data?.session?.user) {
        // Use upsert to prevent duplicate profile creation
        const email = data.session.user.email || '';
        const username = data.session.user.user_metadata?.username || email.split('@')[0];
        
        try {
          // Try to insert, but if profile exists, it will be ignored due to unique constraint
          const { error: upsertError } = await supabase
            .from('user_profiles')
            .upsert({
              id: data.session.user.id,
              email: email,
              user_name: username,
              joined_at: new Date().toISOString(),
              referral_code: generateReferralCode(),
              freedom_ai_credits: 10000,
              music_video_credits: 0,
              deepfake_credits: 0,
              video_generator_credits: 0,
              plan: 'free',
              reputation_score: 0
            }, {
              onConflict: 'id', // Use upsert to handle existing profiles gracefully
              ignoreDuplicates: true
            });
          
          if (upsertError) {
            console.error("❌ Error upserting user profile in callback:", upsertError);
            // Don't fail the auth flow if profile creation fails
          } else {
            console.log("✅ User profile ensured in auth callback");
          }
        } catch (err) {
          console.error("❌ Exception ensuring profile in callback:", err);
          // Don't fail the auth flow if profile creation fails
        }
      }
    } catch (error) {
      console.error('❌ Unexpected error in auth callback:', error);
      return NextResponse.redirect(`${origin}/auth/error?message=Authentication failed`);
    }
  }

  // Redirect to production domain after successful authentication
  const redirectUrl = process.env.NODE_ENV === 'production' 
    ? 'https://swarm.neurolov.ai/' 
    : `${origin}/`;
    
  console.log("🔄 Redirecting to:", redirectUrl);
  return NextResponse.redirect(redirectUrl);
}

// Helper function to generate a referral code
function generateReferralCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
