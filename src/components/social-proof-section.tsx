"use client";

import { useEffect, useState } from "react";
import { Users, TrendingUp, GraduationCap } from "lucide-react";

export default function SocialProofSection() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const coreFeatures = [
    {
      icon: <Users className="w-6 h-6" />,
      title: "For Everyone",
      description: "Students, teachers, and lifelong learners"
    },
    {
      icon: <GraduationCap className="w-6 h-6" />,
      title: "All Subjects",
      description: "From science to humanities and beyond"
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: "Proven Methods",
      description: "Built on research-backed learning techniques"
    }
  ];

  return (
    <section className="py-20 bg-gray-900 text-white">
      <div className="container mx-auto px-4">
        {/* Core Features */}
        <div className="text-center mb-16">
          <h2 className="text-2xl font-bold mb-8">
            Designed for Modern Learning
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-12">
            {coreFeatures.map((feature, index) => (
              <div key={index} className="text-center">
                <div className="bg-gray-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <div className="text-white">
                    {feature.icon}
                  </div>
                </div>
                <div className={`text-2xl font-bold mb-2 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                  {feature.title}
                </div>
                <div className="text-gray-300 text-sm">
                  {feature.description}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Key Benefits */}
        <div className="text-center mb-12">
          <p className="text-gray-400 mb-8">
            Experience the future of personalized education:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-gray-800 px-6 py-4 rounded-lg text-center hover:bg-gray-700 transition-colors">
              <p className="text-sm font-medium text-gray-300">
                📄➡️🎥 Transform PDFs into engaging videos
              </p>
            </div>
            <div className="bg-gray-800 px-6 py-4 rounded-lg text-center hover:bg-gray-700 transition-colors">
              <p className="text-sm font-medium text-gray-300">
                🎙️ Natural voice conversations with AI
              </p>
            </div>
            <div className="bg-gray-800 px-6 py-4 rounded-lg text-center hover:bg-gray-700 transition-colors">
              <p className="text-sm font-medium text-gray-300">
                👥 Support for students and educators
              </p>
            </div>
          </div>
        </div>

        {/* Join Waitlist CTA */}
        <div className="text-center">
          <div className="inline-flex items-center bg-green-900 border border-green-600 px-6 py-3 rounded-full">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-3"></div>
            <span className="text-green-100 text-sm">
              <span className="font-bold text-green-400">Be the first</span> to experience AI-powered learning
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