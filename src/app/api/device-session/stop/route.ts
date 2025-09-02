import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const { deviceId, sessionToken } = await request.json();
    
    if (!deviceId) {
      return NextResponse.json(
        { error: "Device ID is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Query for the device
    const { data: device, error: deviceError } = await supabase
      .from("devices")
      .select("*")
      .eq("id", deviceId)
      .eq("owner", user.id)
      .single();

    if (deviceError || !device) {
      return NextResponse.json(
        { error: "Device not found" },
        { status: 404 }
      );
    }

    // Validate the session token if provided
    if (sessionToken && device.session_token !== sessionToken) {
      return NextResponse.json(
        { error: "Invalid session token" },
        { status: 403 }
      );
    }

    // Update device status to offline and clear session
    const { error: updateError } = await supabase
      .from("devices")
      .update({
        status: "offline",
        session_token: null,
        session_created_at: null,
        last_seen: new Date().toISOString()
      })
      .eq("id", deviceId);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to stop device session" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Device session stopped successfully",
      deviceId
    });
  } catch (error) {
    console.error("Error stopping device session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}