"use client";

import { useState, useEffect } from "react";
import DashboardNavbar from "@/components/dashboard-navbar";
import FileUpload from "@/components/file-upload";
import UpsellModal from "@/components/upsell-modal";
import { createClient } from "../../../../supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText } from "lucide-react";
import Link from "next/link";

export default function UploadPage() {
  const [isPremium, setIsPremium] = useState(false);
  const [documentCount, setDocumentCount] = useState(0);
  const [showUpsell, setShowUpsell] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/sign-in");
        return;
      }

      // Check premium status and plan limits
      const isPro = user.user_metadata?.is_pro === true;
      setIsPremium(isPro);

      // Get document count
      const { count } = await supabase
        .from("documents")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      setDocumentCount(count || 0);
      setLoading(false);
    };

    checkAuth();
  }, [supabase, router]);

  const handleUploadComplete = (fileId: string, fileName: string) => {
    setUploadComplete(true);
    setUploadedFileName(fileName);
    setDocumentCount((prev) => prev + 1);
  };

  const handleUploadAttempt = () => {
    if (!isPremium && documentCount >= 1) {
      setShowUpsell(true);
    } else if (isPremium && documentCount >= 25) {
      // Pro plan limit reached
      alert("You've reached your Pro plan limit of 25 uploads per month.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardNavbar />
        <div className="container mx-auto px-4 py-8 flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardNavbar />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <Link
              href="/dashboard"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold">Upload Document</h1>
            <p className="text-muted-foreground mt-1">
              {isPremium
                ? `Pro plan: ${documentCount}/25 uploads used this month`
                : `Free plan: ${documentCount}/1 uploads used`}
            </p>
          </div>

          {/* Upload area */}
          {uploadComplete ? (
            <div className="bg-card border rounded-lg p-8 text-center">
              <div className="flex flex-col items-center justify-center">
                <div className="bg-green-100 p-3 rounded-full mb-4">
                  <FileText className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Upload Complete!</h2>
                <p className="text-muted-foreground mb-6">
                  {uploadedFileName} has been uploaded successfully and is being
                  processed.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={() => setUploadComplete(false)}
                    variant="outline"
                  >
                    Upload Another
                  </Button>
                  <Link href="/dashboard/study">
                    <Button>Go to Study Dashboard</Button>
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-card border rounded-lg p-6">
              <FileUpload
                onUploadComplete={handleUploadComplete}
                isPremium={isPremium}
                documentCount={documentCount}
                onUploadAttempt={handleUploadAttempt}
              />

              {!isPremium && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-100 p-1 rounded-full">
                      <svg
                        className="h-5 w-5 text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-medium text-blue-900">
                        Free Plan Limit
                      </h3>
                      <p className="text-sm text-blue-700 mt-1">
                        Free accounts can upload 1 document. Upgrade to Pro for
                        25 uploads per month and advanced features.
                      </p>
                      <Link href="/pricing" className="mt-3 inline-block">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-blue-700 border-blue-300 hover:bg-blue-100"
                        >
                          View Pricing
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Upsell Modal */}
      <UpsellModal isOpen={showUpsell} onClose={() => setShowUpsell(false)} />
    </div>
  );
}
