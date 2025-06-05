import { createClient } from "../../../../supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  console.log("🚀 Waitlist API endpoint hit");
  
  try {
    const body = await request.json();
    console.log("📝 Request body:", body);
    
    const { email, full_name } = body;

    // Validate email
    if (!email || !email.trim()) {
      console.log("❌ Email validation failed");
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      console.log("❌ Email format validation failed");
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    console.log("✅ Email validation passed");

    // Check environment variables
    console.log("🔍 Checking environment variables...");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    console.log("NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl ? "✅ Set" : "❌ Missing");
    console.log("NEXT_PUBLIC_SUPABASE_ANON_KEY:", supabaseAnonKey ? "✅ Set" : "❌ Missing");

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("💥 Missing required environment variables");
      return NextResponse.json(
        { error: "Server configuration error. Please contact support." },
        { status: 500 }
      );
    }

    const supabase = await createClient();
    console.log("✅ Supabase client created")

    // Insert into waitlist table
    console.log("💾 Attempting to insert into waitlist table...");
    const { data, error } = await supabase
      .from("waitlist")
      .insert([
        {
          email: email.trim().toLowerCase(),
          full_name: full_name?.trim() || null,
        },
      ])
      .select();

    if (error) {
      console.error("💥 Supabase error:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      console.error("Error details:", error.details);
      console.error("Error hint:", error.hint);
      
      // Handle duplicate email error
      if (error.code === "23505" || error.message.includes("duplicate")) {
        return NextResponse.json(
          { error: "This email is already on our waitlist" },
          { status: 409 }
        );
      }

      // Handle table doesn't exist error
      if (error.code === "42P01" || error.message.includes("does not exist")) {
        console.error("💥 Waitlist table does not exist in database");
        return NextResponse.json(
          { error: "Database table not found. Please contact support." },
          { status: 500 }
        );
      }

      // Handle RLS policy errors
      if (error.code === "42501" || error.message.includes("policy")) {
        console.error("💥 Row Level Security policy blocking insert");
        return NextResponse.json(
          { error: "Database permission error. Please contact support." },
          { status: 500 }
        );
      }

      // Generic database error
      return NextResponse.json(
        { error: "Failed to join waitlist. Please try again." },
        { status: 500 }
      );
    }

    console.log("✅ Successfully inserted into waitlist:", data);

    return NextResponse.json(
      { 
        message: "Successfully joined waitlist",
        data: data?.[0] 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("💥 Unexpected error in waitlist API:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
    console.error("Error name:", error instanceof Error ? error.name : "Unknown");
    console.error("Error cause:", error instanceof Error ? error.cause : "No cause");
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 