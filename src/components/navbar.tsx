import Link from "next/link";
import { createClient } from "../../supabase/server";
import { Button } from "./ui/button";
import { UserCircle } from "lucide-react";
import UserProfile from "./user-profile";
import Logo from "./logo";

export default async function Navbar() {
  const supabase = createClient();

  const {
    data: { user },
  } = await (await supabase).auth.getUser();

  // Check if we're in waitlist mode
  const isWaitlistMode = process.env.NEXT_PUBLIC_WAITLIST_MODE === 'true';

  return (
    <nav className="w-full border-b border-gray-200 bg-white py-3">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <Link href="/" prefetch className="flex items-center group">
          <Logo className="mr-3 transition-transform duration-200 group-hover:scale-105" />
          <span className="text-2xl font-extrabold bg-gradient-to-r from-black to-gray-800 bg-clip-text text-transparent">
            StudyWithAI
          </span>
        </Link>

        {/* Centered Navigation */}
        <div className="hidden md:flex items-center justify-center flex-1">
          <div className="flex space-x-8">
            <a 
              href="#features" 
              className="text-gray-600 hover:text-black transition-colors duration-200 font-medium"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="text-gray-600 hover:text-black transition-colors duration-200 font-medium"
            >
              How It Works
            </a>
            {!isWaitlistMode && (
              <a 
                href="#pricing" 
                className="text-gray-600 hover:text-black transition-colors duration-200 font-medium"
              >
                Pricing
              </a>
            )}
          </div>
        </div>

        <div className="flex gap-4 items-center">
          {user ? (
            // Show user profile and dashboard for authenticated users
            <>
              <Link
                href="/dashboard"
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                <Button>Dashboard</Button>
              </Link>
              <UserProfile />
            </>
          ) : (
            // Conditionally show auth links based on waitlist mode
            !isWaitlistMode && (
              <>
                <Link
                  href="/sign-in"
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Sign In
                </Link>
                <Link
                  href="/sign-up"
                  className="px-4 py-2 text-sm font-medium text-white bg-black rounded-md hover:bg-gray-800"
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
