import Link from "next/link";
import { ArrowUpRight, Check, BookOpen, Brain } from "lucide-react";

export default function Hero() {
  return (
    <div className="relative overflow-hidden bg-white">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-100 opacity-70" />

      <div className="relative pt-24 pb-32 sm:pt-32 sm:pb-40">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-4xl mx-auto">
            <div className="flex justify-center mb-6">
              <div className="bg-gray-100 text-black px-4 py-1.5 rounded-full text-sm font-medium flex items-center">
                <BookOpen className="w-4 h-4 mr-2" />
                AI-Powered Study Platform
              </div>
            </div>

            <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-8 tracking-tight">
              Study{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-black to-gray-600">
                Smarter
              </span>{" "}
              with AI-Generated Materials
            </h1>

            <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed">
              Transform your notes and textbooks into interactive flashcards and
              quizzes. Our AI analyzes your study materials to help you learn
              more effectively.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/sign-up"
                className="inline-flex items-center px-8 py-4 text-white bg-black rounded-lg hover:bg-gray-800 transition-colors text-lg font-medium"
              >
                Get Started Free
                <ArrowUpRight className="ml-2 w-5 h-5" />
              </Link>

              <Link
                href="#pricing"
                className="inline-flex items-center px-8 py-4 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-lg font-medium"
              >
                View Plans
              </Link>
            </div>

            <div className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-8 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-500" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-500" />
                <span>Unlimited document uploads</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-500" />
                <span>Basic flashcard generation</span>
              </div>
            </div>

            {/* Hero Image */}
            <div className="mt-16 relative">
              <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-gray-200">
                <img
                  src="https://images.unsplash.com/photo-1532619675605-1ede6c2ed2b0?w=1200&q=80"
                  alt="Student using flashcard app"
                  className="w-full h-auto"
                />
              </div>
              <div className="absolute -bottom-6 -right-6 bg-black text-white p-4 rounded-lg shadow-lg hidden md:flex items-center">
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
