"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../supabase/supabase";

interface PremiumCheckProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PremiumCheck({ children, fallback }: PremiumCheckProps) {
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function checkPremiumStatus() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setIsPremium(false);
          setIsLoading(false);
          return;
        }

        // Check if user has premium status in metadata
        const isPro = user.user_metadata?.is_pro === true;
        setIsPremium(isPro);
        setIsLoading(false);
      } catch (error) {
        setIsPremium(false);
        setIsLoading(false);
      }
    }

    checkPremiumStatus();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">Loading...</div>
    );
  }

  if (!isPremium) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Premium Feature</h2>
        <p className="mb-6 text-muted-foreground">
          This feature requires a premium subscription.
        </p>
        <a
          href="/pricing"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Upgrade Now
        </a>
      </div>
    );
  }

  return <>{children}</>;
}
