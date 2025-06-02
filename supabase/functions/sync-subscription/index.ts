import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Define plan limits
const planLimits = {
  free: {
    uploads: 1,
    folders: 2,
    storage_mb: 100,
  },
  pro: {
    uploads: 10,
    folders: 10,
    storage_mb: 2048, // 2 GB
  },
  ultra: {
    uploads: "unlimited",
    folders: "unlimited",
    storage_mb: 5120, // 5 GB
  },
  school: {
    uploads: "unlimited",
    folders: "unlimited",
    storage_mb: 10240, // 10 GB per seat
  },
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

    // Determine the plan based on subscription
    let plan = "free";
    let isPro = false;
    let periodEnd = null;

    if (subscription) {
      // Check if it's a pro or ultra plan based on price or metadata
      if (
        subscription.stripe_price_id?.includes("ultra") ||
        subscription.metadata?.plan === "ultra" ||
        subscription.amount >= 1900
      ) {
        // $19 or more
        plan = "ultra";
      } else if (
        subscription.stripe_price_id?.includes("school") ||
        subscription.metadata?.plan === "school"
      ) {
        plan = "school";
      } else {
        plan = "pro";
      }

      isPro = true;
      periodEnd = subscription.current_period_end;
    }

    // Get the limits for the determined plan
    const limits = planLimits[plan as keyof typeof planLimits];

    // If there's a subscription but user_metadata doesn't reflect it, update the metadata
    if (
      subscription &&
      (!user.user_metadata?.is_pro || user.user_metadata?.plan !== plan)
    ) {
      await supabaseClient.auth.admin.updateUserById(user_id, {
        user_metadata: {
          ...user.user_metadata,
          is_pro: true,
          plan: plan,
          period_end: periodEnd,
          limits: limits,
        },
      });
    }

    // If there's no subscription but user_metadata says there is, update the metadata
    if (!subscription && user.user_metadata?.is_pro === true) {
      await supabaseClient.auth.admin.updateUserById(user_id, {
        user_metadata: {
          ...user.user_metadata,
          is_pro: false,
          plan: "free",
          period_end: null,
          limits: planLimits.free,
        },
      });
    }

    // If user has no metadata about plans at all, set up the free plan
    if (!user.user_metadata?.plan) {
      await supabaseClient.auth.admin.updateUserById(user_id, {
        user_metadata: {
          ...user.user_metadata,
          is_pro: false,
          plan: "free",
          period_end: null,
          limits: planLimits.free,
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        is_premium: isPro,
        plan: plan,
        limits: limits,
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
