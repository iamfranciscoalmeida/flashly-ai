"use client";

import { User } from "@supabase/supabase-js";
import { Button } from "./ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { supabase } from "../../supabase/supabase";

// Define features for each plan based on product name
const getPlanFeatures = (planName: string) => {
  const planNameLower = planName?.toLowerCase() || "";

  if (planNameLower.includes("free")) {
    return [
      "1 document upload per month",
      "Basic flashcard generation",
      "Limited quiz generation",
      "Community support",
    ];
  } else if (planNameLower.includes("pro")) {
    return [
      "Unlimited document uploads per month",
      "Unlimited flashcard generation",
      "Unlimited quiz generation",
      "Priority support",
      "Study progress tracking",
    ];
  } else if (planNameLower.includes("custom") || planNameLower.includes("enterprise") || planNameLower.includes("school")) {
    return [
      "Everything in Pro",
      "Unlimited document uploads",
      "Team/Class sharing features",
      "Collaborative study groups",
      "Admin dashboard & analytics",
      "Bulk user management",
      "Custom branding options",
      "Dedicated support",
      "Volume discounts available",
    ];
  }

  // Default features if plan name doesn't match
  return ["Custom features", "Contact sales for details"];
};

export default function PricingCard({
  item,
  user,
}: {
  item: any;
  user: User | null;
}) {
  // Get product details from expanded product data
  const product = item.product as any;
  const productName = product?.name || item.nickname || "";

  // Get features based on plan name
  const features = getPlanFeatures(productName);

  // Determine if this is the popular plan (middle tier)
  const isPopular = productName.toLowerCase().includes("pro");

  // Handle checkout process
  const handleCheckout = async (priceId: string) => {
    if (!user) {
      // Redirect to login if user is not authenticated
      window.location.href = "/login?redirect=pricing";
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke(
        "supabase-functions-create-checkout",
        {
          body: {
            price_id: priceId,
            user_id: user.id,
            return_url: `${window.location.origin}/dashboard`,
          },
          headers: {
            "X-Customer-Email": user.email || "",
          },
        },
      );

      if (error) {
        throw error;
      }

      // Redirect to Stripe checkout
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      console.error("Error creating checkout session:", error);
    }
  };

  return (
    <Card
      className={`w-full h-full flex flex-col max-w-[350px] mx-auto relative overflow-hidden ${isPopular ? "border-2 border-blue-500 shadow-xl scale-105" : "border border-gray-200"}`}
    >
      {isPopular && (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 opacity-30" />
      )}
      <CardHeader className="relative flex-grow">
        {isPopular && (
          <div className="px-4 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-full w-fit mb-4">
            Most Popular
          </div>
        )}
        <CardTitle className="text-2xl font-bold tracking-tight text-gray-900">
          {(item.product as any)?.name || item.nickname || "Plan"}
        </CardTitle>
        <CardDescription className="flex items-baseline gap-2 mt-2">
          <span className="text-4xl font-bold text-gray-900">
            ${((item.unit_amount || 0) / 100).toFixed(2)}
          </span>
          <span className="text-gray-600">
            /{item.recurring?.interval || "month"}
          </span>
        </CardDescription>

        {/* Features list */}
        <div className="mt-6 space-y-2">
          {features.map((feature, index) => (
            <div key={index} className="flex items-start">
              <svg
                className="h-5 w-5 text-green-500 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span className="text-gray-600">{feature}</span>
            </div>
          ))}
        </div>
      </CardHeader>
      <CardFooter className="relative mt-auto pb-6">
        <Button
          onClick={async () => {
            await handleCheckout(item.id);
          }}
          className="w-full py-6 text-lg font-medium"
        >
          Get Started
        </Button>
      </CardFooter>
    </Card>
  );
}
