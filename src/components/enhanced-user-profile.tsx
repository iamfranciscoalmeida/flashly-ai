"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  UserCircle, 
  Settings, 
  LogOut, 
  CreditCard,
  User,
  Bell,
  Palette,
  Moon,
  Sun,
  HelpCircle,
  Download,
  Activity,
  Key,
  Shield,
  Globe,
  Keyboard,
  ChevronRight,
  Check,
  Loader2
} from "lucide-react";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Switch } from "./ui/switch";
import { Separator } from "./ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "./ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { toast } from "./ui/use-toast";
import { createClient } from "../../supabase/client";
import { useRouter } from "next/navigation";

// Types
interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  is_pro: boolean;
  created_at: string;
  user_metadata?: {
    theme?: 'light' | 'dark' | 'system';
    language?: string;
    notifications_enabled?: boolean;
  };
}

interface ProfileAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'destructive';
  badge?: string;
}

import { useTheme } from "./theme-provider";

// Keyboard Shortcuts Modal Component
const KeyboardShortcutsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const shortcuts = [
    { key: "⌘ + K", description: "Open command palette" },
    { key: "⌘ + N", description: "New document" },
    { key: "⌘ + S", description: "Save current work" },
    { key: "⌘ + D", description: "Dashboard" },
    { key: "⌘ + P", description: "Profile settings" },
    { key: "⌘ + ⇧ + S", description: "Sign out" },
    { key: "Esc", description: "Close modal/dropdown" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Use these shortcuts to navigate faster
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {shortcuts.map((shortcut, index) => (
            <div key={index} className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-600">{shortcut.description}</span>
              <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default function EnhancedUserProfile() {
  const supabase = createClient();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  
  // State
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  // Refs for keyboard navigation
  const triggerRef = useRef<HTMLButtonElement>(null);
  
  // Theme toggle function
  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
    setTheme(newTheme);
  }, [theme, setTheme]);
  
  // Load user profile
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        setIsLoading(true);
        const {
          data: { user },
        } = await supabase.auth.getUser();
        
        if (user) {
          const profile: UserProfile = {
            id: user.id,
            email: user.email || "",
            full_name: user.user_metadata?.full_name || user.user_metadata?.name,
            avatar_url: user.user_metadata?.avatar_url,
            is_pro: user.user_metadata?.is_pro === true,
            created_at: user.created_at,
            user_metadata: {
              theme: user.user_metadata?.theme || 'system',
              language: user.user_metadata?.language || 'en',
              notifications_enabled: user.user_metadata?.notifications_enabled !== false,
            }
          };
          
          setUserProfile(profile);
          setNotificationsEnabled(profile.user_metadata?.notifications_enabled !== false);
        }
      } catch (error) {
        console.error("Error loading user profile:", error);
        toast({
          title: "Error",
          description: "Failed to load profile information",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadUserProfile();
  }, [supabase]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey) {
        switch (event.key) {
          case 'p':
            event.preventDefault();
            router.push('/dashboard/settings/profile');
            break;
          case 'd':
            event.preventDefault();
            router.push('/dashboard');
            break;
          case 'k':
            event.preventDefault();
            // Open command palette if available
            break;
        }
      }
      
      if (event.key === 'Escape' && dropdownOpen) {
        setDropdownOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [router, dropdownOpen]);

  // Handlers
  const handleCustomerPortal = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/sign-in");
        return;
      }

      const { data, error } = await supabase.functions.invoke(
        "supabase-functions-create-portal-session",
        {
          body: {
            user_id: user.id,
            return_url: window.location.origin + "/dashboard",
          },
        },
      );

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No portal URL returned");
      }
    } catch (error) {
      console.error("Error creating customer portal session:", error);
      toast({
        title: "Error",
        description: "Failed to open customer portal. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Signed out successfully",
        description: "You have been signed out of your account.",
      });
      window.location.href = "/";
    } catch (error) {
      console.error("Error signing out:", error);
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleExportData = async () => {
    // Redirect to export settings page
    router.push('/dashboard/settings/export');
  };

  const toggleNotifications = async () => {
    setNotificationsEnabled(!notificationsEnabled);
    toast({
      title: notificationsEnabled ? "Notifications disabled" : "Notifications enabled",
      description: "Your notification preferences have been updated.",
    });
    // Implement notification toggle logic
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name
        .split(' ')
        .map(part => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return 'U';
  };

  const getMemberSince = (createdAt: string) => {
    const date = new Date(createdAt);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'light': return <Sun className="h-4 w-4" />;
      case 'dark': return <Moon className="h-4 w-4" />;
      default: return <Palette className="h-4 w-4" />;
    }
  };

  const getThemeLabel = () => {
    switch (theme) {
      case 'light': return 'Light';
      case 'dark': return 'Dark';
      default: return 'System';
    }
  };

  if (isLoading || !userProfile) {
    return (
      <Button variant="ghost" size="icon" disabled>
        <Loader2 className="h-6 w-6 animate-spin" />
      </Button>
    );
  }

  return (
    <TooltipProvider>
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button 
                ref={triggerRef}
                variant="ghost" 
                className="relative h-10 w-10 rounded-full focus:ring-2 focus:ring-offset-2"
                aria-label="Open user menu"
              >
                <Avatar className="h-10 w-10">
                  {userProfile.avatar_url && (
                    <AvatarImage 
                      src={userProfile.avatar_url} 
                      alt={userProfile.full_name || userProfile.email}
                    />
                  )}
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                    {getInitials(userProfile.full_name, userProfile.email)}
                  </AvatarFallback>
                </Avatar>
                {userProfile.is_pro && (
                  <div className="absolute -top-1 -right-1 h-4 w-4 bg-yellow-400 rounded-full border-2 border-white">
                    <span className="sr-only">Pro user</span>
                  </div>
                )}
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Profile menu (⌘P)</p>
          </TooltipContent>
        </Tooltip>

        <DropdownMenuContent 
          className="w-80 p-0" 
          align="end" 
          sideOffset={8}
          role="menu"
          aria-label="User profile menu"
        >
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.1 }}
            >
              {/* Profile Header */}
              <div className="px-4 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-12 w-12 border-2 border-white">
                    {userProfile.avatar_url && (
                      <AvatarImage 
                        src={userProfile.avatar_url} 
                        alt={userProfile.full_name || userProfile.email}
                      />
                    )}
                    <AvatarFallback className="bg-white bg-opacity-20 text-white font-semibold text-lg">
                      {getInitials(userProfile.full_name, userProfile.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold text-lg truncate">
                        {userProfile.full_name || "User"}
                      </h3>
                      {userProfile.is_pro && (
                        <Badge className="bg-yellow-400 text-yellow-900 text-xs">
                          Pro
                        </Badge>
                      )}
                    </div>
                    <p className="text-blue-100 text-sm truncate">
                      {userProfile.email}
                    </p>
                    <p className="text-blue-200 text-xs">
                      Member since {getMemberSince(userProfile.created_at)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-2">
                {/* Navigation Section */}
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="px-2 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Navigation
                  </DropdownMenuLabel>
                  
                  <DropdownMenuItem 
                    onClick={() => router.push("/dashboard")}
                    className="flex items-center space-x-3 px-3 py-2 cursor-pointer focus:bg-gray-100"
                  >
                    <Settings className="h-4 w-4" />
                    <span>Dashboard</span>
                    <kbd className="ml-auto text-xs text-gray-400">⌘D</kbd>
                  </DropdownMenuItem>

                  <DropdownMenuItem 
                    onClick={() => router.push("/dashboard/settings/profile")}
                    className="flex items-center space-x-3 px-3 py-2 cursor-pointer focus:bg-gray-100"
                  >
                    <User className="h-4 w-4" />
                    <span>Profile Settings</span>
                    <kbd className="ml-auto text-xs text-gray-400">⌘P</kbd>
                  </DropdownMenuItem>

                  {userProfile.is_pro && (
                    <DropdownMenuItem 
                      onClick={handleCustomerPortal}
                      className="flex items-center space-x-3 px-3 py-2 cursor-pointer focus:bg-gray-100"
                    >
                      <CreditCard className="h-4 w-4" />
                      <span>Billing & Subscription</span>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuGroup>

                <DropdownMenuSeparator className="my-2" />

                {/* Preferences Section */}
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="px-2 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Preferences
                  </DropdownMenuLabel>

                  {/* Theme Toggle */}
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="flex items-center space-x-3 px-3 py-2">
                      {getThemeIcon()}
                      <span>Theme</span>
                      <span className="ml-auto text-xs text-gray-400">{getThemeLabel()}</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem onClick={() => toggleTheme()}>
                        <Sun className="h-4 w-4 mr-2" />
                        Light
                        {theme === 'light' && <Check className="h-4 w-4 ml-auto" />}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleTheme()}>
                        <Moon className="h-4 w-4 mr-2" />
                        Dark
                        {theme === 'dark' && <Check className="h-4 w-4 ml-auto" />}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleTheme()}>
                        <Palette className="h-4 w-4 mr-2" />
                        System
                        {theme === 'system' && <Check className="h-4 w-4 ml-auto" />}
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>

                  {/* Notifications Toggle */}
                  <div className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 rounded-sm">
                    <div className="flex items-center space-x-3">
                      <Bell className="h-4 w-4" />
                      <span>Notifications</span>
                    </div>
                    <Switch
                      checked={notificationsEnabled}
                      onCheckedChange={toggleNotifications}
                      aria-label="Toggle notifications"
                    />
                  </div>

                  <DropdownMenuItem 
                    onClick={() => router.push("/dashboard/settings/language")}
                    className="flex items-center space-x-3 px-3 py-2 cursor-pointer focus:bg-gray-100"
                  >
                    <Globe className="h-4 w-4" />
                    <span>Language</span>
                    <span className="ml-auto text-xs text-gray-400">English</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>

                <DropdownMenuSeparator className="my-2" />

                {/* Professional Section */}
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="px-2 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Professional
                  </DropdownMenuLabel>

                  <DropdownMenuItem 
                    onClick={handleExportData}
                    className="flex items-center space-x-3 px-3 py-2 cursor-pointer focus:bg-gray-100"
                  >
                    <Download className="h-4 w-4" />
                    <span>Export Data</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem 
                    onClick={() => router.push("/dashboard/settings/activity")}
                    className="flex items-center space-x-3 px-3 py-2 cursor-pointer focus:bg-gray-100"
                  >
                    <Activity className="h-4 w-4" />
                    <span>Activity Log</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem 
                    onClick={() => router.push("/dashboard/settings/api-keys")}
                    className="flex items-center space-x-3 px-3 py-2 cursor-pointer focus:bg-gray-100"
                  >
                    <Key className="h-4 w-4" />
                    <span>API Keys</span>
                    <Badge variant="secondary" className="ml-auto">Pro</Badge>
                  </DropdownMenuItem>

                  <DropdownMenuItem 
                    onClick={() => router.push("/dashboard/settings/privacy")}
                    className="flex items-center space-x-3 px-3 py-2 cursor-pointer focus:bg-gray-100"
                  >
                    <Shield className="h-4 w-4" />
                    <span>Privacy & Security</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>

                <DropdownMenuSeparator className="my-2" />

                {/* Help Section */}
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="px-2 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Help & Support
                  </DropdownMenuLabel>

                  <DropdownMenuItem 
                    onClick={() => setShowKeyboardShortcuts(true)}
                    className="flex items-center space-x-3 px-3 py-2 cursor-pointer focus:bg-gray-100"
                  >
                    <Keyboard className="h-4 w-4" />
                    <span>Keyboard Shortcuts</span>
                    <kbd className="ml-auto text-xs text-gray-400">?</kbd>
                  </DropdownMenuItem>

                  <DropdownMenuItem 
                    onClick={() => router.push("/dashboard/settings/help")}
                    className="flex items-center space-x-3 px-3 py-2 cursor-pointer focus:bg-gray-100"
                  >
                    <HelpCircle className="h-4 w-4" />
                    <span>Help & Support</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>

                <DropdownMenuSeparator className="my-2" />

                {/* Sign Out */}
                <DropdownMenuItem 
                  onClick={handleSignOut}
                  className="flex items-center space-x-3 px-3 py-2 cursor-pointer focus:bg-red-50 text-red-600 hover:text-red-700"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                  <kbd className="ml-auto text-xs text-gray-400">⌘⇧S</kbd>
                </DropdownMenuItem>
              </div>
            </motion.div>
          </AnimatePresence>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal 
        isOpen={showKeyboardShortcuts}
        onClose={() => setShowKeyboardShortcuts(false)}
      />
    </TooltipProvider>
  );
} 