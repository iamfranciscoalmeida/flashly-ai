"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { languages, LanguageCode } from './language-selector';

type LanguageContextType = {
  currentLanguage: LanguageCode;
  changeLanguage: (language: LanguageCode) => void;
  t: (key: string) => string;
  isLoading: boolean;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translation keys - you can expand this or load from external files
const translations = {
  en: {
    // Navigation
    'nav.features': 'Features',
    'nav.how-it-works': 'How It Works',
    'nav.pricing': 'Pricing',
    'nav.dashboard': 'Dashboard',
    'nav.home': 'Home',
    'nav.sign-in': 'Sign In',
    'nav.sign-up': 'Sign Up Free',
    
    // Profile
    'profile.dashboard': 'Dashboard',
    'profile.settings': 'Profile Settings',
    'profile.billing': 'Billing & Subscription',
    'profile.theme': 'Theme',
    'profile.notifications': 'Notifications',
    'profile.language': 'Language',
    'profile.export': 'Export Data',
    'profile.activity': 'Activity Log',
    'profile.api-keys': 'API Keys',
    'profile.privacy': 'Privacy & Security',
    'profile.keyboard-shortcuts': 'Keyboard Shortcuts',
    'profile.help': 'Help & Support',
    'profile.sign-out': 'Sign Out',
    
    // Common
    'common.loading': 'Loading...',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.close': 'Close',
    'common.pro-plan': 'Pro Plan',
    'common.free-plan': 'Free Plan',
    
    // Toast messages
    'toast.language-changed': 'Language Changed',
    'toast.language-switched': 'Language switched to',
    'toast.notifications-enabled': 'Notifications enabled',
    'toast.notifications-disabled': 'Notifications disabled',
    'toast.signed-out': 'Signed out successfully',
  },
  es: {
    // Navigation
    'nav.features': 'Características',
    'nav.how-it-works': 'Cómo Funciona',
    'nav.pricing': 'Precios',
    'nav.dashboard': 'Panel',
    'nav.home': 'Inicio',
    'nav.sign-in': 'Iniciar Sesión',
    'nav.sign-up': 'Registrarse Gratis',
    
    // Profile
    'profile.dashboard': 'Panel',
    'profile.settings': 'Configuración del Perfil',
    'profile.billing': 'Facturación y Suscripción',
    'profile.theme': 'Tema',
    'profile.notifications': 'Notificaciones',
    'profile.language': 'Idioma',
    'profile.export': 'Exportar Datos',
    'profile.activity': 'Registro de Actividad',
    'profile.api-keys': 'Claves API',
    'profile.privacy': 'Privacidad y Seguridad',
    'profile.keyboard-shortcuts': 'Atajos de Teclado',
    'profile.help': 'Ayuda y Soporte',
    'profile.sign-out': 'Cerrar Sesión',
    
    // Common
    'common.loading': 'Cargando...',
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.close': 'Cerrar',
    'common.pro-plan': 'Plan Pro',
    'common.free-plan': 'Plan Gratuito',
    
    // Toast messages
    'toast.language-changed': 'Idioma Cambiado',
    'toast.language-switched': 'Idioma cambiado a',
    'toast.notifications-enabled': 'Notificaciones activadas',
    'toast.notifications-disabled': 'Notificaciones desactivadas',
    'toast.signed-out': 'Sesión cerrada exitosamente',
  },
  pt: {
    // Navigation
    'nav.features': 'Recursos',
    'nav.how-it-works': 'Como Funciona',
    'nav.pricing': 'Preços',
    'nav.dashboard': 'Painel',
    'nav.home': 'Início',
    'nav.sign-in': 'Entrar',
    'nav.sign-up': 'Cadastrar Grátis',
    
    // Profile
    'profile.dashboard': 'Painel',
    'profile.settings': 'Configurações do Perfil',
    'profile.billing': 'Faturamento e Assinatura',
    'profile.theme': 'Tema',
    'profile.notifications': 'Notificações',
    'profile.language': 'Idioma',
    'profile.export': 'Exportar Dados',
    'profile.activity': 'Log de Atividades',
    'profile.api-keys': 'Chaves API',
    'profile.privacy': 'Privacidade e Segurança',
    'profile.keyboard-shortcuts': 'Atalhos de Teclado',
    'profile.help': 'Ajuda e Suporte',
    'profile.sign-out': 'Sair',
    
    // Common
    'common.loading': 'Carregando...',
    'common.save': 'Salvar',
    'common.cancel': 'Cancelar',
    'common.close': 'Fechar',
    'common.pro-plan': 'Plano Pro',
    'common.free-plan': 'Plano Gratuito',
    
    // Toast messages
    'toast.language-changed': 'Idioma Alterado',
    'toast.language-switched': 'Idioma alterado para',
    'toast.notifications-enabled': 'Notificações ativadas',
    'toast.notifications-disabled': 'Notificações desativadas',
    'toast.signed-out': 'Desconectado com sucesso',
  },
  it: {
    // Navigation
    'nav.features': 'Caratteristiche',
    'nav.how-it-works': 'Come Funziona',
    'nav.pricing': 'Prezzi',
    'nav.dashboard': 'Pannello',
    'nav.home': 'Home',
    'nav.sign-in': 'Accedi',
    'nav.sign-up': 'Registrati Gratis',
    
    // Profile
    'profile.dashboard': 'Pannello',
    'profile.settings': 'Impostazioni Profilo',
    'profile.billing': 'Fatturazione e Abbonamento',
    'profile.theme': 'Tema',
    'profile.notifications': 'Notifiche',
    'profile.language': 'Lingua',
    'profile.export': 'Esporta Dati',
    'profile.activity': 'Log Attività',
    'profile.api-keys': 'Chiavi API',
    'profile.privacy': 'Privacy e Sicurezza',
    'profile.keyboard-shortcuts': 'Scorciatoie da Tastiera',
    'profile.help': 'Aiuto e Supporto',
    'profile.sign-out': 'Esci',
    
    // Common
    'common.loading': 'Caricamento...',
    'common.save': 'Salva',
    'common.cancel': 'Annulla',
    'common.close': 'Chiudi',
    'common.pro-plan': 'Piano Pro',
    'common.free-plan': 'Piano Gratuito',
    
    // Toast messages
    'toast.language-changed': 'Lingua Cambiata',
    'toast.language-switched': 'Lingua cambiata in',
    'toast.notifications-enabled': 'Notifiche abilitate',
    'toast.notifications-disabled': 'Notifiche disabilitate',
    'toast.signed-out': 'Disconnesso con successo',
  },
  de: {
    // Navigation
    'nav.features': 'Funktionen',
    'nav.how-it-works': 'Wie es Funktioniert',
    'nav.pricing': 'Preise',
    'nav.dashboard': 'Dashboard',
    'nav.home': 'Startseite',
    'nav.sign-in': 'Anmelden',
    'nav.sign-up': 'Kostenlos Registrieren',
    
    // Profile
    'profile.dashboard': 'Dashboard',
    'profile.settings': 'Profileinstellungen',
    'profile.billing': 'Abrechnung & Abonnement',
    'profile.theme': 'Theme',
    'profile.notifications': 'Benachrichtigungen',
    'profile.language': 'Sprache',
    'profile.export': 'Daten Exportieren',
    'profile.activity': 'Aktivitätsprotokoll',
    'profile.api-keys': 'API-Schlüssel',
    'profile.privacy': 'Datenschutz & Sicherheit',
    'profile.keyboard-shortcuts': 'Tastenkürzel',
    'profile.help': 'Hilfe & Support',
    'profile.sign-out': 'Abmelden',
    
    // Common
    'common.loading': 'Wird geladen...',
    'common.save': 'Speichern',
    'common.cancel': 'Abbrechen',
    'common.close': 'Schließen',
    'common.pro-plan': 'Pro Plan',
    'common.free-plan': 'Kostenloser Plan',
    
    // Toast messages
    'toast.language-changed': 'Sprache Geändert',
    'toast.language-switched': 'Sprache gewechselt zu',
    'toast.notifications-enabled': 'Benachrichtigungen aktiviert',
    'toast.notifications-disabled': 'Benachrichtigungen deaktiviert',
    'toast.signed-out': 'Erfolgreich abgemeldet',
  },
};

type LanguageProviderProps = {
  children: React.ReactNode;
  defaultLanguage?: LanguageCode;
};

export function LanguageProvider({
  children,
  defaultLanguage = 'en',
}: LanguageProviderProps) {
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>(defaultLanguage);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize language from localStorage or browser preference
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('studywith-ai-language') as LanguageCode;
      if (savedLanguage && languages[savedLanguage]) {
        setCurrentLanguage(savedLanguage);
      } else {
        // Try to detect browser language
        const browserLang = navigator.language.split('-')[0] as LanguageCode;
        if (languages[browserLang]) {
          setCurrentLanguage(browserLang);
        }
      }
    }
    setIsLoading(false);
  }, []);

  const changeLanguage = (language: LanguageCode) => {
    setCurrentLanguage(language);
    if (typeof window !== 'undefined') {
      localStorage.setItem('studywith-ai-language', language);
    }
  };

  const t = (key: string): string => {
    const languageTranslations = translations[currentLanguage];
    return languageTranslations?.[key as keyof typeof languageTranslations] || key;
  };

  const value: LanguageContextType = {
    currentLanguage,
    changeLanguage,
    t,
    isLoading,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}; 