"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, FileText, Database, Calendar } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { useLanguage } from "@/components/language-provider";

interface ExportOptions {
  flashcards: boolean;
  study_progress: boolean;
  user_profile: boolean;
  activity_logs: boolean;
  settings: boolean;
}

export default function ExportDataPage() {
  const router = useRouter();
  const { t } = useLanguage();
  
  const [loading, setLoading] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    flashcards: true,
    study_progress: true,
    user_profile: true,
    activity_logs: false,
    settings: false,
  });

  const handleExport = async (format: 'json' | 'csv') => {
    setLoading(true);
    try {
      const response = await fetch('/api/export/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          options: exportOptions,
          format,
        }),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `studywith-ai-export-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export Complete",
        description: `Your data has been exported as ${format.toUpperCase()}.`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export your data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateOption = (key: keyof ExportOptions, value: boolean) => {
    setExportOptions(prev => ({ ...prev, [key]: value }));
  };

  const exportItems = [
    {
      key: 'flashcards' as keyof ExportOptions,
      title: 'Flashcards',
      description: 'All your created flashcards and their content',
      icon: <FileText className="h-5 w-5" />,
    },
    {
      key: 'study_progress' as keyof ExportOptions,
      title: 'Study Progress',
      description: 'Your learning progress, scores, and statistics',
      icon: <Database className="h-5 w-5" />,
    },
    {
      key: 'user_profile' as keyof ExportOptions,
      title: 'User Profile',
      description: 'Your profile information and preferences',
      icon: <Database className="h-5 w-5" />,
    },
    {
      key: 'activity_logs' as keyof ExportOptions,
      title: 'Activity Logs',
      description: 'Your account activity and usage history',
      icon: <Calendar className="h-5 w-5" />,
    },
    {
      key: 'settings' as keyof ExportOptions,
      title: 'Settings',
      description: 'Your app settings and configurations',
      icon: <Database className="h-5 w-5" />,
    },
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
            <h1 className="text-3xl font-bold text-gray-900">Export Data</h1>
            <p className="text-gray-600">Download your data in various formats</p>
          </div>
        </div>

        {/* Export Options */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Select Data to Export
            </CardTitle>
            <CardDescription>
              Choose which data you want to include in your export
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {exportItems.map((item) => (
              <div key={item.key} className="flex items-center space-x-3">
                <Checkbox
                  id={item.key}
                  checked={exportOptions[item.key]}
                  onCheckedChange={(checked) => updateOption(item.key, checked as boolean)}
                />
                <div className="flex items-center gap-3 flex-1">
                  <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                    {item.icon}
                  </div>
                  <div>
                    <Label htmlFor={item.key} className="text-sm font-medium cursor-pointer">
                      {item.title}
                    </Label>
                    <p className="text-xs text-gray-500">
                      {item.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Export Formats */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Export Formats</CardTitle>
            <CardDescription>
              Choose your preferred export format
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">JSON Format</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Machine-readable format, perfect for developers and data analysis
                </p>
                <Button
                  onClick={() => handleExport('json')}
                  disabled={loading || !Object.values(exportOptions).some(Boolean)}
                  className="w-full"
                  variant="outline"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export as JSON
                </Button>
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">CSV Format</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Spreadsheet-friendly format, easy to open in Excel or Google Sheets
                </p>
                <Button
                  onClick={() => handleExport('csv')}
                  disabled={loading || !Object.values(exportOptions).some(Boolean)}
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export as CSV
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Information */}
        <Card>
          <CardHeader>
            <CardTitle>Important Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-600">
            <p>
              • Your data export will be generated and downloaded immediately
            </p>
            <p>
              • Large datasets may take a few moments to process
            </p>
            <p>
              • Exported data includes all information up to the current date
            </p>
            <p>
              • For privacy reasons, sensitive information like passwords are not included
            </p>
            <p>
              • If you need help with your export, please contact our support team
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 