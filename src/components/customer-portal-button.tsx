"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { supabase } from "../../supabase/supabase";

export default function CustomerPortalButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleManageSubscription = async () => {
    setIsLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/sign-in";
        return;
      }

      const { data, error } = await supabase.functions.invoke(
        "supabase-functions-create-portal-session",
        {
          body: {
            user_id: user.id,
            return_url: window.location.origin + "/dashboard",
          },
        },
      );

      if (error) throw error;

      // Redirect to the customer portal
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No portal URL returned");
      }
    } catch (error) {
      console.error("Error creating customer portal session:", error);
      alert("Failed to open customer portal. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleManageSubscription}
      disabled={isLoading}
      variant="outline"
    >
      {isLoading ? "Loading..." : "Manage Subscription"}
    </Button>
  );
}
