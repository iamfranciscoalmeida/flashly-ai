"use client";

import React, { useState, useEffect } from "react";
import { Globe, Check } from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { toast } from "./ui/use-toast";

// Language definitions
export const languages = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
  },
  es: {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    flag: '🇪🇸',
  },
  pt: {
    code: 'pt',
    name: 'Portuguese',
    nativeName: 'Português',
    flag: '🇵🇹',
  },
  it: {
    code: 'it',
    name: 'Italian',
    nativeName: 'Italiano',
    flag: '🇮🇹',
  },
  de: {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    flag: '🇩🇪',
  },
} as const;

export type LanguageCode = keyof typeof languages;

import { useLanguage } from './language-provider';

// Language selector component
export default function LanguageSelector() {
  const { currentLanguage, changeLanguage, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const currentLang = languages[currentLanguage];

  const handleLanguageChange = (languageCode: LanguageCode) => {
    changeLanguage(languageCode);
    setIsOpen(false);
    
    toast({
      title: t('toast.language-changed'),
      description: `${t('toast.language-switched')} ${languages[languageCode].name}`,
    });
  };

  return (
    <TooltipProvider>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-2 h-9 px-3 hover:bg-gray-100 focus:ring-2 focus:ring-offset-2"
                aria-label={`Current language: ${currentLang.name}`}
              >
                <Globe className="h-4 w-4 text-gray-600" />
                <span className="text-lg leading-none">{currentLang.flag}</span>
                <span className="hidden sm:inline text-sm font-medium text-gray-700">
                  {currentLang.code.toUpperCase()}
                </span>
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Language: {currentLang.name}</p>
          </TooltipContent>
        </Tooltip>

        <DropdownMenuContent
          align="end"
          className="w-48"
          role="menu"
          aria-label="Language selection menu"
        >
          {Object.values(languages).map((language) => (
            <DropdownMenuItem
              key={language.code}
              onClick={() => handleLanguageChange(language.code)}
              className={`flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-50 ${
                currentLanguage === language.code 
                  ? 'bg-blue-50 text-blue-700' 
                  : 'text-gray-700'
              }`}
              role="menuitem"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{language.flag}</span>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{language.name}</span>
                  <span className="text-xs text-gray-500">{language.nativeName}</span>
                </div>
              </div>
              {currentLanguage === language.code && (
                <Check className="h-4 w-4 text-blue-600" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  );
} 