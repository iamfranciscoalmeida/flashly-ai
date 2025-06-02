"use client";

import { useEffect } from "react";
import { supabase } from "../../supabase/supabase";

export default function SyncSubscription() {
  useEffect(() => {
    const syncSubscription = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        // Call the edge function to sync subscription status
        await supabase.functions.invoke(
          "supabase-functions-sync-subscription",
          {
            body: { user_id: user.id },
          },
        );
      } catch (error) {
        // Silent fail - this is just a background sync
      }
    };

    // Sync on initial load
    syncSubscription();

    // Set up auth state change listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        syncSubscription();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // This component doesn't render anything
  return null;
}
