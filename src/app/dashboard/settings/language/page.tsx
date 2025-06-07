"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Globe, Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/language-provider";
import { languages, LanguageCode } from "@/components/language-selector";

export default function LanguageSettingsPage() {
  const router = useRouter();
  const { currentLanguage, changeLanguage, t } = useLanguage();

  const handleLanguageChange = (languageCode: LanguageCode) => {
    changeLanguage(languageCode);
  };

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
            <h1 className="text-3xl font-bold text-gray-900">Language Settings</h1>
            <p className="text-gray-600">Choose your preferred language for the application</p>
          </div>
        </div>

        {/* Current Language */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Current Language
            </CardTitle>
            <CardDescription>
              Your currently selected language
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <span className="text-2xl">{languages[currentLanguage].flag}</span>
              <div>
                <h3 className="font-semibold">{languages[currentLanguage].name}</h3>
                <p className="text-sm text-gray-600">{languages[currentLanguage].nativeName}</p>
              </div>
              <div className="ml-auto">
                <Check className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Available Languages */}
        <Card>
          <CardHeader>
            <CardTitle>Available Languages</CardTitle>
            <CardDescription>
              Select a language to change your app interface
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.values(languages).map((language) => (
              <div
                key={language.code}
                className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors ${
                  currentLanguage === language.code
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => handleLanguageChange(language.code)}
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{language.flag}</span>
                  <div>
                    <h3 className="font-semibold">{language.name}</h3>
                    <p className="text-sm text-gray-600">{language.nativeName}</p>
                  </div>
                </div>
                {currentLanguage === language.code && (
                  <Check className="h-5 w-5 text-blue-600" />
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Language Information */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Language Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-600">
            <p>
              • Language changes are applied immediately across the entire application
            </p>
            <p>
              • Your language preference is saved and will persist across sessions
            </p>
            <p>
              • Some content may still appear in English while we work on translations
            </p>
            <p>
              • If you notice any translation issues, please let us know through support
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 