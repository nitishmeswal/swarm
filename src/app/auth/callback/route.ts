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
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('id', data.session.user.id)
          .single();
        
        if (profileError || !profileData) {
          console.log("⚠️ No profile found for user, creating one");
          // Create a new profile for the user
          const email = data.session.user.email || '';
          const username = data.session.user.user_metadata?.username || email.split('@')[0];
          
          try {
            const { error: createError } = await supabase
              .from('user_profiles')
              .insert({
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
              });
            
            if (createError) {
              console.error("❌ Error creating user profile in callback:", createError);
            } else {
              console.log("✅ User profile created in auth callback");
            }
          } catch (err) {
            console.error("❌ Exception creating profile in callback:", err);
          }
        } else {
          console.log("✅ User profile already exists");
        }
      }
    } catch (error) {
      console.error('❌ Unexpected error in auth callback:', error);
      return NextResponse.redirect(`${origin}/auth/error?message=Authentication failed`);
    }
  }

  // Redirect to dashboard or intended page after successful authentication
  return NextResponse.redirect(`${origin}/dashboard`);
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
