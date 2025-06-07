"use client";

import Link from "next/link";
import { createClient } from "../../supabase/client";
import { Button } from "./ui/button";
import { UserCircle } from "lucide-react";
import EnhancedUserProfile from "./enhanced-user-profile";
import LanguageSelector from "./language-selector";
import { ThemeToggle } from "./theme-toggle";
import Logo from "./logo";
import { useEffect, useState } from "react";

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    getUser();
  }, [supabase]);

  // Check if we're in waitlist mode
  const isWaitlistMode = process.env.NEXT_PUBLIC_WAITLIST_MODE === 'true';

  if (loading) {
    return null; // Or a loading spinner
  }

  return (
    <nav className="w-full border-b border-border bg-background py-3">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <Link href="/" prefetch className="flex items-center group">
          <Logo className="mr-3 transition-transform duration-200 group-hover:scale-105" />
          <span className="text-2xl font-extrabold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            StudyWithAI
          </span>
        </Link>

        {/* Centered Navigation */}
        <div className="hidden md:flex items-center justify-center flex-1">
          <div className="flex space-x-8">
            <a 
              href="#features" 
              className="text-muted-foreground hover:text-foreground transition-colors duration-200 font-medium"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="text-muted-foreground hover:text-foreground transition-colors duration-200 font-medium"
            >
              How It Works
            </a>
            {!isWaitlistMode && (
              <a 
                href="#pricing" 
                className="text-muted-foreground hover:text-foreground transition-colors duration-200 font-medium"
              >
                Pricing
              </a>
            )}
          </div>
        </div>

        <div className="flex gap-2 items-center">
          <LanguageSelector />
          <ThemeToggle />
          {user ? (
            // Show user profile and dashboard for authenticated users
            <>
              <Link
                href="/dashboard"
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                <Button>Dashboard</Button>
              </Link>
              <EnhancedUserProfile />
            </>
          ) : (
            // Conditionally show auth links based on waitlist mode
            !isWaitlistMode && (
              <>
                <Link
                  href="/sign-in"
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  Sign In
                </Link>
                <Link
                  href="/sign-up"
                  className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90"
                >
                  Sign Up Free
                </Link>
              </>
            )
          )}
        </div>
      </div>
    </nav>
  );
}
