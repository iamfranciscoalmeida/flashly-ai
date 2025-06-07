"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bell, Mail, Smartphone, Save } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { useLanguage } from "@/components/language-provider";
import { createClient } from "@/supabase/client";

interface NotificationSettings {
  email_notifications: boolean;
  push_notifications: boolean;
  study_reminders: boolean;
  progress_updates: boolean;
  marketing_emails: boolean;
  security_alerts: boolean;
  weekly_summary: boolean;
  achievement_notifications: boolean;
}

export default function NotificationsSettingsPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const supabase = createClient();
  
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>({
    email_notifications: true,
    push_notifications: true,
    study_reminders: true,
    progress_updates: true,
    marketing_emails: false,
    security_alerts: true,
    weekly_summary: true,
    achievement_notifications: true,
  });

  useEffect(() => {
    loadNotificationSettings();
  }, []);

  const loadNotificationSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userSettings } = await supabase
        .from('user_settings')
        .select('notification_preferences')
        .eq('user_id', user.id)
        .single();

      if (userSettings?.notification_preferences) {
        setSettings({ ...settings, ...userSettings.notification_preferences });
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          notification_preferences: settings,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: t('toast.notifications-enabled'),
        description: "Your notification preferences have been updated.",
      });
    } catch (error) {
      console.error('Error saving notification settings:', error);
      toast({
        title: "Error",
        description: "Failed to save notification settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = (key: keyof NotificationSettings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const notificationGroups = [
    {
      title: "Email Notifications",
      description: "Receive notifications via email",
      icon: <Mail className="h-5 w-5" />,
      settings: [
        {
          key: 'email_notifications' as keyof NotificationSettings,
          label: 'Enable Email Notifications',
          description: 'Receive important updates and notifications via email'
        },
        {
          key: 'study_reminders' as keyof NotificationSettings,
          label: 'Study Reminders',
          description: 'Get reminded when it\'s time to study'
        },
        {
          key: 'progress_updates' as keyof NotificationSettings,
          label: 'Progress Updates',
          description: 'Receive updates about your learning progress'
        },
        {
          key: 'weekly_summary' as keyof NotificationSettings,
          label: 'Weekly Summary',
          description: 'Get a weekly summary of your study activity'
        },
        {
          key: 'marketing_emails' as keyof NotificationSettings,
          label: 'Marketing Emails',
          description: 'Receive promotional emails and product updates'
        }
      ]
    },
    {
      title: "Push Notifications",
      description: "Receive notifications on your device",
      icon: <Smartphone className="h-5 w-5" />,
      settings: [
        {
          key: 'push_notifications' as keyof NotificationSettings,
          label: 'Enable Push Notifications',
          description: 'Receive push notifications on your device'
        },
        {
          key: 'achievement_notifications' as keyof NotificationSettings,
          label: 'Achievement Notifications',
          description: 'Get notified when you unlock achievements'
        }
      ]
    },
    {
      title: "Security & Important",
      description: "Critical notifications for account security",
      icon: <Bell className="h-5 w-5" />,
      settings: [
        {
          key: 'security_alerts' as keyof NotificationSettings,
          label: 'Security Alerts',
          description: 'Important security notifications (cannot be disabled)'
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
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
            <h1 className="text-3xl font-bold text-gray-900">Notification Settings</h1>
            <p className="text-gray-600">Manage how and when you receive notifications</p>
          </div>
        </div>

        {/* Notification Groups */}
        <div className="space-y-6">
          {notificationGroups.map((group, groupIndex) => (
            <Card key={groupIndex}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {group.icon}
                  {group.title}
                </CardTitle>
                <CardDescription>{group.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {group.settings.map((setting) => (
                  <div key={setting.key} className="flex items-center justify-between space-x-4">
                    <div className="flex-1">
                      <Label htmlFor={setting.key} className="text-sm font-medium">
                        {setting.label}
                      </Label>
                      <p className="text-xs text-gray-500 mt-1">
                        {setting.description}
                      </p>
                    </div>
                    <Switch
                      id={setting.key}
                      checked={settings[setting.key]}
                      onCheckedChange={(checked) => updateSetting(setting.key, checked)}
                      disabled={setting.key === 'security_alerts'}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Quickly enable or disable all notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setSettings(prev => ({
                    ...prev,
                    email_notifications: true,
                    push_notifications: true,
                    study_reminders: true,
                    progress_updates: true,
                    weekly_summary: true,
                    achievement_notifications: true,
                  }));
                }}
              >
                Enable All
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSettings(prev => ({
                    ...prev,
                    email_notifications: false,
                    push_notifications: false,
                    study_reminders: false,
                    progress_updates: false,
                    marketing_emails: false,
                    weekly_summary: false,
                    achievement_notifications: false,
                    // Keep security alerts enabled
                    security_alerts: true,
                  }));
                }}
              >
                Disable All (except Security)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end mt-6">
          <Button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {loading ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      </div>
    </div>
  );
} 