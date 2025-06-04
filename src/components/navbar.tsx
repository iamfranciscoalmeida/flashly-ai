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

  return (
    <nav className="w-full border-b border-gray-200 bg-white py-3">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <Link href="/" prefetch className="flex items-center">
          <Logo className="mr-2" />
          <span className="text-xl font-bold">StudyWithAI</span>
        </Link>

        <div className="hidden md:flex space-x-6">
          <Link href="/#features" className="text-gray-600 hover:text-gray-900">
            Features
          </Link>
          <Link
            href="/#how-it-works"
            className="text-gray-600 hover:text-gray-900"
          >
            How It Works
          </Link>
          <Link href="/pricing" className="text-gray-600 hover:text-gray-900">
            Pricing
          </Link>
        </div>

        <div className="flex gap-4 items-center">
          {user ? (
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
          )}
        </div>
      </div>
    </nav>
  );
}
