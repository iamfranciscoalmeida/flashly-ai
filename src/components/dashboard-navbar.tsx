"use client";

import Link from "next/link";
import { createClient } from "../../supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import {
  Home,
  LayoutDashboard,
  MessageSquare,
  Mic,
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import EnhancedUserProfile from "./enhanced-user-profile";
import LanguageSelector from "./language-selector";
import { ThemeToggle } from "./theme-toggle";
import Logo from "./logo";

export default function DashboardNavbar() {
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  return (
    <nav className="w-full border-b border-border bg-background py-4">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/" prefetch className="flex items-center group">
            <Logo className="mr-3 transition-transform duration-200 group-hover:scale-105" />
            <span className="text-2xl font-extrabold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              StudyWithAI
            </span>
          </Link>

          <div className="hidden md:flex items-center space-x-1">
            <Link href="/dashboard">
              <Button
                variant={
                  isActive("/dashboard") &&
                  !isActive("/dashboard/chat")
                    ? "default"
                    : "ghost"
                }
                size="sm"
                className="flex items-center gap-1"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span>Dashboard</span>
              </Button>
            </Link>
            <Link href="/dashboard/chat">
              <Button
                variant={isActive("/dashboard/chat") && !isActive("/dashboard/voice-tutor") ? "default" : "ghost"}
                size="sm"
                className="flex items-center gap-1"
              >
                <MessageSquare className="h-4 w-4" />
                <span>AI Chat</span>
              </Button>
            </Link>
            <Link href="/dashboard/voice-tutor">
              <Button
                variant={isActive("/dashboard/voice-tutor") ? "default" : "ghost"}
                size="sm"
                className="flex items-center gap-1"
              >
                <Mic className="h-4 w-4" />
                <span>Voice Tutor</span>
              </Button>
            </Link>

          </div>
        </div>
        <div className="flex gap-2 items-center">
          <LanguageSelector />
          <ThemeToggle />
          <Link href="/" className="hidden md:flex">
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-1"
            >
              <Home className="h-4 w-4" />
              <span>Home</span>
            </Button>
          </Link>
          <EnhancedUserProfile />
        </div>
      </div>
    </nav>
  );
}
