import { Check, BookOpen, Brain } from "lucide-react";
import WaitlistSignup from "./waitlist-signup";

export default function HeroWaitlist() {
  return (
    <div className="relative overflow-hidden bg-white">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-100 opacity-70" />

      <div className="relative pt-24 pb-32 sm:pt-32 sm:pb-40">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            {/* Left side - Content */}
            <div className="text-center lg:text-left">
              <div className="flex justify-center lg:justify-start mb-6">
                <div className="bg-gray-100 text-black px-4 py-1.5 rounded-full text-sm font-medium flex items-center">
                  <BookOpen className="w-4 h-4 mr-2" />
                  AI-Powered Study Platform
                </div>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-8 tracking-tight">
                Your AI Study Companion is{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-black to-gray-600">
                  Almost Ready
                </span>
              </h1>

              <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Join the waitlist for revolutionary AI-powered learning. Transform PDFs into videos, 
                chat with your personal AI tutor, and get intelligent assistance for both 
                students and teachers.
              </p>

              <div className="flex flex-col sm:flex-row gap-8 items-center justify-center lg:justify-start mb-12">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Check className="w-5 h-5 text-green-500" />
                  <span>PDF to Video conversion</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Check className="w-5 h-5 text-green-500" />
                  <span>Voice AI tutoring</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Check className="w-5 h-5 text-green-500" />
                  <span>Student & teacher tools</span>
                </div>
              </div>

              {/* Hero Image for smaller screens */}
              <div className="lg:hidden mb-8">
                <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-gray-200 relative">
                  <img
                    src="https://images.unsplash.com/photo-1532619675605-1ede6c2ed2b0?w=800&q=80"
                    alt="Student using flashcard app"
                    className="w-full h-auto"
                  />
                  <div className="absolute -bottom-4 -right-4 bg-black text-white p-3 rounded-lg shadow-lg flex items-center">
                    <Brain className="w-4 h-4 mr-2" />
                    <span className="font-medium text-sm">AI-powered</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right side - Waitlist Form */}
            <div className="flex justify-center lg:justify-end">
              <WaitlistSignup />
            </div>
          </div>

          {/* Hero Image for larger screens */}
          <div className="hidden lg:block mt-16">
            <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-gray-200 relative max-w-4xl mx-auto">
              <img
                src="https://images.unsplash.com/photo-1532619675605-1ede6c2ed2b0?w=1200&q=80"
                alt="Student using flashcard app"
                className="w-full h-auto"
              />
              <div className="absolute -bottom-6 -right-6 bg-black text-white p-4 rounded-lg shadow-lg flex items-center">
                <Brain className="w-5 h-5 mr-2" />
                <span className="font-medium">AI-powered learning</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 