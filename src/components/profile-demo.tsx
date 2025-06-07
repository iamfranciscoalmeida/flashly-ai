"use client";

// Demo file showing how to use both profile components
// You can delete this file after implementation

import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import UserProfile from "./user-profile"; // Your original component
import EnhancedUserProfile from "./enhanced-user-profile"; // New enhanced component
import { ThemeProvider } from "./theme-provider";

export default function ProfileDemo() {
  const [useEnhanced, setUseEnhanced] = useState(false);

  return (
    <ThemeProvider defaultTheme="system" storageKey="demo-theme">
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4">Profile Dropdown Comparison</h1>
            <p className="text-gray-600 mb-6">
              Compare your current profile dropdown with the enhanced version
            </p>
            
            <div className="flex items-center justify-center gap-4 mb-8">
              <Button
                variant={!useEnhanced ? "default" : "outline"}
                onClick={() => setUseEnhanced(false)}
              >
                Original Component
              </Button>
              <Button
                variant={useEnhanced ? "default" : "outline"}
                onClick={() => setUseEnhanced(true)}
              >
                Enhanced Component ✨
              </Button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Current Component Demo */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Original UserProfile
                  {!useEnhanced && <Badge variant="secondary">Active</Badge>}
                </CardTitle>
                <CardDescription>
                  Your current profile dropdown implementation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <span>Profile Dropdown:</span>
                    {!useEnhanced && <UserProfile />}
                    {useEnhanced && (
                      <span className="text-gray-400 text-sm">Not active</span>
                    )}
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <h4 className="font-medium">Features:</h4>
                    <ul className="space-y-1 text-gray-600">
                      <li>✅ Basic user info (email, plan)</li>
                      <li>✅ Dashboard link</li>
                      <li>✅ Billing management (Pro)</li>
                      <li>✅ Sign out functionality</li>
                      <li>❌ Avatar support</li>
                      <li>❌ Theme switching</li>
                      <li>❌ Keyboard shortcuts</li>
                      <li>❌ Animations</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Enhanced Component Demo */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Enhanced UserProfile
                  {useEnhanced && <Badge variant="default">Active</Badge>}
                </CardTitle>
                <CardDescription>
                  Professional-grade profile dropdown with all modern features
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <span>Profile Dropdown:</span>
                    {useEnhanced && <EnhancedUserProfile />}
                    {!useEnhanced && (
                      <span className="text-gray-400 text-sm">Not active</span>
                    )}
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <h4 className="font-medium">Features:</h4>
                    <ul className="space-y-1 text-gray-600">
                      <li>✅ Beautiful avatar with gradient fallback</li>
                      <li>✅ Complete user information display</li>
                      <li>✅ Theme switching (Light/Dark/System)</li>
                      <li>✅ Notification preferences</li>
                      <li>✅ Keyboard shortcuts (⌘P, ⌘D, etc.)</li>
                      <li>✅ Smooth animations</li>
                      <li>✅ Professional features (Export, API keys)</li>
                      <li>✅ Full accessibility support</li>
                      <li>✅ Help & support integration</li>
                      <li>✅ Activity log access</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Implementation Guide */}
          <Card>
            <CardHeader>
              <CardTitle>🚀 How to Implement</CardTitle>
              <CardDescription>
                Simple steps to upgrade to the enhanced profile dropdown
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Step 1: Install Dependencies</h4>
                  <code className="text-sm bg-white p-2 rounded border block">
                    npm install framer-motion
                  </code>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Step 2: Add Theme Provider</h4>
                  <code className="text-sm bg-white p-2 rounded border block whitespace-pre">
{`// In your layout.tsx or root component
import { ThemeProvider } from "@/components/theme-provider";

<ThemeProvider defaultTheme="system">
  {children}
</ThemeProvider>`}
                  </code>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Step 3: Replace Component</h4>
                  <code className="text-sm bg-white p-2 rounded border block whitespace-pre">
{`// Replace in your navbar components
import EnhancedUserProfile from "@/components/enhanced-user-profile";

// Replace <UserProfile /> with:
<EnhancedUserProfile />`}
                  </code>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-blue-800 text-sm">
                    <strong>💡 Pro Tip:</strong> The enhanced component works with your existing 
                    Supabase setup without any changes. It automatically fetches user data and 
                    handles all the advanced features seamlessly.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Feature Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>📊 Feature Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Feature</th>
                      <th className="text-center py-2">Original</th>
                      <th className="text-center py-2">Enhanced</th>
                    </tr>
                  </thead>
                  <tbody className="space-y-2">
                    <tr className="border-b">
                      <td className="py-2">User Avatar</td>
                      <td className="text-center">❌</td>
                      <td className="text-center">✅</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2">Theme Switching</td>
                      <td className="text-center">❌</td>
                      <td className="text-center">✅</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2">Keyboard Shortcuts</td>
                      <td className="text-center">❌</td>
                      <td className="text-center">✅</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2">Animations</td>
                      <td className="text-center">❌</td>
                      <td className="text-center">✅</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2">Notification Preferences</td>
                      <td className="text-center">❌</td>
                      <td className="text-center">✅</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2">Professional Features</td>
                      <td className="text-center">❌</td>
                      <td className="text-center">✅</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2">Accessibility</td>
                      <td className="text-center">Basic</td>
                      <td className="text-center">Complete</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2">Modern Design</td>
                      <td className="text-center">❌</td>
                      <td className="text-center">✅</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ThemeProvider>
  );
} 