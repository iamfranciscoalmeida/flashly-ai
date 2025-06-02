import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id } = await req.json();

    if (!user_id) {
      throw new Error("User ID is required");
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Get user data
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.admin.getUserById(user_id);

    if (userError || !user) {
      throw new Error("User not found");
    }

    // Check if user has an active subscription in the database
    const { data: subscription, error: subError } = await supabaseClient
      .from("subscriptions")
      .select("*")
      .eq("user_id", user_id)
      .eq("status", "active")
      .maybeSingle();

    // If there's a subscription but user_metadata doesn't reflect it, update the metadata
    if (subscription && user.user_metadata?.is_pro !== true) {
      await supabaseClient.auth.admin.updateUserById(user_id, {
        user_metadata: {
          ...user.user_metadata,
          is_pro: true,
          plan: subscription.interval,
          period_end: subscription.current_period_end,
        },
      });
    }

    // If there's no subscription but user_metadata says there is, update the metadata
    if (!subscription && user.user_metadata?.is_pro === true) {
      await supabaseClient.auth.admin.updateUserById(user_id, {
        user_metadata: {
          ...user.user_metadata,
          is_pro: false,
          plan: null,
          period_end: null,
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        is_premium: subscription ? true : false,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error syncing subscription:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
