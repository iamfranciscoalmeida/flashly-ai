import { Check, BookOpen, Brain, FileText, Video, Mic } from "lucide-react";
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

              {/* Feature showcase for smaller screens */}
              <div className="lg:hidden mb-8">
                <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-8 relative">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-black flex items-center justify-center">
                        <FileText className="w-8 h-8 text-white" />
                      </div>
                      <p className="text-sm font-medium text-gray-700">Upload PDFs</p>
                    </div>
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-black flex items-center justify-center">
                        <Video className="w-8 h-8 text-white" />
                      </div>
                      <p className="text-sm font-medium text-gray-700">Generate Videos</p>
                    </div>
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-black flex items-center justify-center">
                        <Mic className="w-8 h-8 text-white" />
                      </div>
                      <p className="text-sm font-medium text-gray-700">Voice Tutoring</p>
                    </div>
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-black flex items-center justify-center">
                        <Brain className="w-8 h-8 text-white" />
                      </div>
                      <p className="text-sm font-medium text-gray-700">AI Learning</p>
                    </div>
                  </div>
                  <div className="absolute -top-2 -right-2 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                    Coming Soon
                  </div>
                </div>
              </div>
            </div>

            {/* Right side - Waitlist Form */}
            <div className="flex justify-center lg:justify-end">
              <WaitlistSignup />
            </div>
          </div>

          {/* Feature showcase for larger screens */}
          <div className="hidden lg:block mt-16">
            <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-12 relative max-w-4xl mx-auto">
              <div className="grid grid-cols-4 gap-8">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-black flex items-center justify-center hover:scale-110 transition-transform">
                    <FileText className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="font-semibold mb-2">Upload Documents</h3>
                  <p className="text-sm text-gray-600">PDFs, notes, and study materials</p>
                </div>
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-black flex items-center justify-center hover:scale-110 transition-transform">
                    <Video className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="font-semibold mb-2">AI Video Generation</h3>
                  <p className="text-sm text-gray-600">Transform PDFs into engaging videos</p>
                </div>
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-black flex items-center justify-center hover:scale-110 transition-transform">
                    <Mic className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="font-semibold mb-2">Voice AI Tutor</h3>
                  <p className="text-sm text-gray-600">Interactive voice conversations</p>
                </div>
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-black flex items-center justify-center hover:scale-110 transition-transform">
                    <Brain className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="font-semibold mb-2">Smart Learning</h3>
                  <p className="text-sm text-gray-600">Personalized study experience</p>
                </div>
              </div>
              <div className="absolute -top-3 -right-3 bg-green-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                Coming Soon
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 