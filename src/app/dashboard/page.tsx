import DashboardNavbar from "@/components/dashboard-navbar";
import { createClient } from "../../../supabase/server";
import { InfoIcon, UserCircle, Upload, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { syncUserSubscription } from "../actions";

export default async function Dashboard() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  // Sync user subscription status
  const isPremium = await syncUserSubscription();

  // Get document count
  const { count } = await supabase
    .from("documents")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  const documentCount = count || 0;

  return (
    <>
      <DashboardNavbar />
      <main className="w-full">
        <div className="container mx-auto px-4 py-8 flex flex-col gap-8">
          {/* Header Section */}
          <header className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold">
                  Welcome back
                  {user.user_metadata?.full_name
                    ? `, ${user.user_metadata.full_name}`
                    : ""}
                  !
                </h1>
                <p className="text-muted-foreground mt-1">
                  Manage your study materials and generate flashcards
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 text-blue-800 text-xs font-medium px-3 py-1 rounded-full">
                  {isPremium ? "Pro Plan" : "Free Plan"}
                </div>
                {!isPremium && (
                  <Link href="/pricing">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex items-center gap-1"
                    >
                      <Sparkles className="h-4 w-4" />
                      <span>Upgrade</span>
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </header>

          {/* Dashboard Content */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Quick Stats */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{documentCount}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {isPremium
                    ? "Unlimited uploads available"
                    : `${documentCount}/1 free uploads used`}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Flashcards
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Generated from your documents
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Quizzes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Test your knowledge
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Dashboard Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-blue-500" />
                  <span>Upload Document</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Upload your study materials to generate flashcards and
                  quizzes.
                </p>
                <Link href="/dashboard/upload">
                  <Button className="w-full sm:w-auto">Upload Document</Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-blue-500" />
                  <span>Study Dashboard</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Access your flashcards, quizzes, and study materials.
                </p>
                <Link href="/dashboard/study">
                  <Button className="w-full sm:w-auto">
                    Go to Study Dashboard
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}
