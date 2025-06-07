"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Palette, Sun, Moon, Monitor, Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";

export default function ThemeSettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const themes = [
    {
      value: 'light',
      label: 'Light',
      description: 'Clean and bright interface',
      icon: <Sun className="h-5 w-5" />,
    },
    {
      value: 'dark',
      label: 'Dark',
      description: 'Easy on the eyes in low light',
      icon: <Moon className="h-5 w-5" />,
    },
    {
      value: 'system',
      label: 'System',
      description: 'Follows your device settings',
      icon: <Monitor className="h-5 w-5" />,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Theme Settings</h1>
            <p className="text-gray-600 dark:text-gray-400">Customize your app appearance</p>
          </div>
        </div>

        {/* Current Theme */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Current Theme
            </CardTitle>
            <CardDescription>
              Your currently selected theme
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              {themes.find(t => t.value === theme)?.icon}
              <div>
                <h3 className="font-semibold">{themes.find(t => t.value === theme)?.label}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {themes.find(t => t.value === theme)?.description}
                </p>
              </div>
              <div className="ml-auto">
                <Check className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Theme Options */}
        <Card>
          <CardHeader>
            <CardTitle>Available Themes</CardTitle>
            <CardDescription>
              Choose your preferred theme
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {themes.map((themeOption) => (
              <div
                key={themeOption.value}
                className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors ${
                  theme === themeOption.value
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
                onClick={() => setTheme(themeOption.value as any)}
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    {themeOption.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold">{themeOption.label}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {themeOption.description}
                    </p>
                  </div>
                </div>
                {theme === themeOption.value && (
                  <Check className="h-5 w-5 text-blue-600" />
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Theme Preview */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Theme Preview</CardTitle>
            <CardDescription>
              See how your selected theme looks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Light Theme Preview */}
              <div className="border rounded-lg p-4 bg-white">
                <h4 className="font-semibold mb-2 text-gray-900">Light Theme</h4>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                  <div className="flex gap-2">
                    <div className="h-6 bg-blue-500 rounded px-3 text-white text-xs flex items-center">Button</div>
                    <div className="h-6 bg-gray-200 rounded px-3 text-gray-700 text-xs flex items-center">Secondary</div>
                  </div>
                </div>
              </div>

              {/* Dark Theme Preview */}
              <div className="border border-gray-600 rounded-lg p-4 bg-gray-800">
                <h4 className="font-semibold mb-2 text-gray-100">Dark Theme</h4>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-600 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                  <div className="flex gap-2">
                    <div className="h-6 bg-blue-600 rounded px-3 text-white text-xs flex items-center">Button</div>
                    <div className="h-6 bg-gray-600 rounded px-3 text-gray-200 text-xs flex items-center">Secondary</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Theme Information */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Theme Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
            <p>
              • Theme changes are applied immediately across the entire application
            </p>
            <p>
              • Your theme preference is saved and will persist across sessions
            </p>
            <p>
              • System theme automatically switches between light and dark based on your device settings
            </p>
            <p>
              • Dark theme can help reduce eye strain in low-light environments
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 