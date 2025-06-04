import Navbar from "@/components/navbar";
import PricingCard from "@/components/pricing-card";
import { createClient } from "../../../supabase/server";

export default async function Pricing() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get plans from Stripe
  const { data: stripePlans, error } = await supabase.functions.invoke(
    "supabase-functions-get-plans",
  );

  // Sort plans by price
  const allPlans = stripePlans
    ? [...stripePlans].sort(
        (a, b) => (a.unit_amount || 0) - (b.unit_amount || 0),
      )
    : [];

  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-xl text-muted-foreground">
            Choose the perfect plan for your needs
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {allPlans.map((item: any) => (
            <PricingCard key={item.id} item={item} user={user} />
          ))}
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold mb-4">Need a custom solution?</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
            Contact our sales team for custom pricing and enterprise solutions.
            We offer special discounts for educational institutions and bulk
            licenses.
          </p>
          <a
            href="mailto:sales@studywithai.io"
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Contact Sales
          </a>
        </div>
      </div>
    </>
  );
}
