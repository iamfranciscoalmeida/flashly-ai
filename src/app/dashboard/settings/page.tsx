"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  User,
  CreditCard,
  Palette,
  Bell,
  Globe,
  Download,
  Activity,
  Key,
  Shield,
  Keyboard,
  HelpCircle,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/language-provider";

interface SettingItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  category: 'account' | 'preferences' | 'data' | 'security' | 'support';
}

export default function SettingsPage() {
  const router = useRouter();
  const { t } = useLanguage();

  const settingsItems: SettingItem[] = [
    // Account Settings
    {
      id: 'profile',
      title: t('profile.settings'),
      description: 'Manage your profile information, avatar, and personal details',
      icon: <User className="h-5 w-5" />,
      href: '/dashboard/settings/profile',
      category: 'account'
    },
    {
      id: 'billing',
      title: t('profile.billing'),
      description: 'View billing history, manage subscription, and payment methods',
      icon: <CreditCard className="h-5 w-5" />,
      href: '/dashboard/settings/billing',
      category: 'account'
    },

    // Preferences
    {
      id: 'theme',
      title: t('profile.theme'),
      description: 'Customize your app appearance and color preferences',
      icon: <Palette className="h-5 w-5" />,
      href: '/dashboard/settings/theme',
      category: 'preferences'
    },
    {
      id: 'notifications',
      title: t('profile.notifications'),
      description: 'Configure email, push, and in-app notification preferences',
      icon: <Bell className="h-5 w-5" />,
      href: '/dashboard/settings/notifications',
      category: 'preferences'
    },
    {
      id: 'language',
      title: t('profile.language'),
      description: 'Set your preferred language and regional settings',
      icon: <Globe className="h-5 w-5" />,
      href: '/dashboard/settings/language',
      category: 'preferences'
    },

    // Data Management
    {
      id: 'export',
      title: t('profile.export'),
      description: 'Download your data, flashcards, and study progress',
      icon: <Download className="h-5 w-5" />,
      href: '/dashboard/settings/export',
      category: 'data'
    },
    {
      id: 'activity',
      title: t('profile.activity'),
      description: 'View your account activity, login history, and device usage',
      icon: <Activity className="h-5 w-5" />,
      href: '/dashboard/settings/activity',
      category: 'data'
    },

    // Security
    {
      id: 'api-keys',
      title: t('profile.api-keys'),
      description: 'Manage API keys and third-party integrations',
      icon: <Key className="h-5 w-5" />,
      href: '/dashboard/settings/api-keys',
      category: 'security'
    },
    {
      id: 'privacy',
      title: t('profile.privacy'),
      description: 'Privacy settings, data sharing, and security preferences',
      icon: <Shield className="h-5 w-5" />,
      href: '/dashboard/settings/privacy',
      category: 'security'
    },

    // Support
    {
      id: 'shortcuts',
      title: t('profile.keyboard-shortcuts'),
      description: 'View and customize keyboard shortcuts for faster navigation',
      icon: <Keyboard className="h-5 w-5" />,
      href: '/dashboard/settings/shortcuts',
      category: 'support'
    },
    {
      id: 'help',
      title: t('profile.help'),
      description: 'Get help, contact support, and access documentation',
      icon: <HelpCircle className="h-5 w-5" />,
      href: '/dashboard/settings/help',
      category: 'support'
    },
  ];

  const categories = {
    account: 'Account Settings',
    preferences: 'Preferences',
    data: 'Data Management',
    security: 'Security & Privacy',
    support: 'Support'
  };

  const groupedSettings = settingsItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, SettingItem[]>);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-600">
            Manage your account settings, preferences, and app configuration
          </p>
        </div>

        {/* Settings Grid */}
        <div className="space-y-8">
          {Object.entries(groupedSettings).map(([category, items]) => (
            <div key={category}>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                {categories[category as keyof typeof categories]}
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {items.map((item) => (
                  <Card
                    key={item.id}
                    className="cursor-pointer hover:shadow-md transition-shadow duration-200 border-gray-200"
                    onClick={() => router.push(item.href)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                            {item.icon}
                          </div>
                          <CardTitle className="text-lg">{item.title}</CardTitle>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <CardDescription className="text-sm text-gray-600">
                        {item.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <Card className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900">Quick Actions</CardTitle>
            <CardDescription className="text-blue-600">
              Common tasks and shortcuts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/dashboard/settings/export')}
                className="border-blue-200 text-blue-700 hover:bg-blue-50"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/dashboard/settings/billing')}
                className="border-blue-200 text-blue-700 hover:bg-blue-50"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Manage Subscription
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/dashboard/settings/help')}
                className="border-blue-200 text-blue-700 hover:bg-blue-50"
              >
                <HelpCircle className="h-4 w-4 mr-2" />
                Get Help
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 