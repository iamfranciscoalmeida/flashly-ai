"use client";

import { useEffect, useState } from "react";
import { Users, TrendingUp, GraduationCap } from "lucide-react";

export default function SocialProofSection() {
  const [waitlistCount, setWaitlistCount] = useState(8847);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    // Simulate live counter with small increments
    const interval = setInterval(() => {
      setWaitlistCount(prev => prev + Math.floor(Math.random() * 3));
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const universities = [
    "Harvard University",
    "Stanford University", 
    "MIT",
    "UC Berkeley",
    "Oxford University",
    "University of Toronto"
  ];

  const socialStats = [
    {
      icon: <Users className="w-6 h-6" />,
      number: waitlistCount.toLocaleString(),
      label: "Students on waitlist",
      trend: "+127 today"
    },
    {
      icon: <GraduationCap className="w-6 h-6" />,
      number: "250+",
      label: "Universities represented",
      trend: "Growing daily"
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      number: "4.9★",
      label: "Average rating (beta)",
      trend: "Based on 156 reviews"
    }
  ];

  return (
    <section className="py-20 bg-gray-900 text-white">
      <div className="container mx-auto px-4">
        {/* Live Stats */}
        <div className="text-center mb-16">
          <h2 className="text-2xl font-bold mb-8">
            Join Students from Top Universities
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-12">
            {socialStats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="bg-gray-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <div className="text-white">
                    {stat.icon}
                  </div>
                </div>
                <div className={`text-3xl font-bold mb-2 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                  {stat.number}
                </div>
                <div className="text-gray-300 font-medium mb-1">
                  {stat.label}
                </div>
                <div className="text-green-400 text-sm">
                  {stat.trend}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Universities Grid */}
        <div className="text-center mb-12">
          <p className="text-gray-400 mb-8">
            Trusted by students from these institutions:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 max-w-4xl mx-auto">
            {universities.map((university, index) => (
              <div 
                key={index}
                className="bg-gray-800 px-4 py-3 rounded-lg text-center hover:bg-gray-700 transition-colors"
              >
                <p className="text-sm font-medium text-gray-300">
                  {university}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Live Waitlist Counter */}
        <div className="text-center">
          <div className="inline-flex items-center bg-green-900 border border-green-600 px-6 py-3 rounded-full">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-3"></div>
            <span className="text-green-100 text-sm">
              <span className="font-bold text-green-400">{waitlistCount.toLocaleString()}</span> students already joined
            </span>
          </div>
        </div>

        {/* Research-backed note */}
        <div className="text-center mt-12">
          <div className="bg-gray-800 p-6 rounded-xl max-w-2xl mx-auto border border-gray-700">
            <h3 className="font-semibold mb-2">🧠 Built on Research-Backed Methods</h3>
            <p className="text-gray-400 text-sm">
              Our AI implements proven techniques like spaced repetition and active recall, 
              methods shown to improve retention by up to 60% in academic studies.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
} 