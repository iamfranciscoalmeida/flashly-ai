import { redirect } from "next/navigation";
import { checkUserSubscription } from "@/app/actions";
import { createClient } from "../../supabase/server";

interface SubscriptionCheckProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export async function SubscriptionCheck({
  children,
  redirectTo = "/pricing",
}: SubscriptionCheckProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Check if user has premium status in metadata
  const isPro = user.user_metadata?.is_pro === true;

  // Also check the database subscription as a fallback
  const isSubscribed = isPro || (await checkUserSubscription(user?.id!));

  if (!isSubscribed) {
    redirect(redirectTo);
  }

  return <>{children}</>;
}
