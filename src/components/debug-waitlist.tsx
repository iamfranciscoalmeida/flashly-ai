"use client";

import { useState } from "react";

export default function DebugWaitlist() {
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const testAPI = async () => {
    setLoading(true);
    setResult("Testing...");
    
    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "debug@test.com",
          full_name: "Debug User"
        }),
      });

      const data = await response.json();
      
      setResult(JSON.stringify({
        status: response.status,
        data: data
      }, null, 2));
      
    } catch (error) {
      setResult(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gray-100 rounded-lg max-w-md">
      <h3 className="font-bold mb-4">Waitlist API Debug</h3>
      <button 
        onClick={testAPI}
        disabled={loading}
        className="bg-black text-white px-4 py-2 rounded mb-4"
      >
        {loading ? "Testing..." : "Test API"}
      </button>
      <pre className="text-xs bg-white p-4 rounded overflow-auto max-h-40">
        {result}
      </pre>
    </div>
  );
} 