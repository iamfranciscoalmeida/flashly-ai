"use client";

import { useState } from "react";
import { Button } from "./ui/button";

export default function WaitlistDebug() {
  // Only show in development environment
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const testAPI = async () => {
    setIsLoading(true);
    setDebugInfo(null);

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "debug@test.com",
          full_name: "Debug Test",
        }),
      });

      const data = await response.json();

      setDebugInfo({
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data: data,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      setDebugInfo({
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const checkEnvironment = () => {
    const envInfo = {
      nodeEnv: process.env.NODE_ENV,
      nextPublicSite: process.env.NEXT_PUBLIC_SITE_URL,
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Server',
      timestamp: new Date().toISOString(),
    };
    
    setDebugInfo(envInfo);
  };

  return (
    <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 max-w-2xl mx-auto">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Waitlist Debug Tools
      </h3>
      
      <div className="space-y-4">
        <div className="flex gap-4">
          <Button
            onClick={testAPI}
            disabled={isLoading}
            variant="outline"
          >
            {isLoading ? "Testing..." : "Test API"}
          </Button>
          
          <Button
            onClick={checkEnvironment}
            variant="outline"
          >
            Check Environment
          </Button>
        </div>

        {debugInfo && (
          <div className="bg-white p-4 rounded border">
            <h4 className="font-medium text-gray-900 mb-2">Debug Information:</h4>
            <pre className="text-xs text-gray-700 overflow-auto bg-gray-50 p-2 rounded">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
} 