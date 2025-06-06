import Hero from "@/components/hero";
import HeroWaitlist from "@/components/hero-waitlist";
import Navbar from "@/components/navbar";
import PricingCard from "@/components/pricing-card";
import Footer from "@/components/footer";
import UseCasesSection from "@/components/use-cases-section";
import ProblemSolutionSection from "@/components/problem-solution-section";
import WaitlistBenefitsSection from "@/components/waitlist-benefits-section";
import ComparisonSection from "@/components/comparison-section";
import RoadmapSection from "@/components/roadmap-section";
import SocialProofSection from "@/components/social-proof-section";
import EnhancedCtaFooter from "@/components/enhanced-cta-footer";
import WaitlistDebug from "@/components/waitlist-debug";
import { createClient } from "../../supabase/server";
import {
  ArrowUpRight,
  BookOpen,
  Brain,
  FileText,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check if we're in waitlist mode
  const isWaitlistMode = process.env.NEXT_PUBLIC_WAITLIST_MODE === 'true';

  // Redirect authenticated users to dashboard
  if (user) {
    return Response.redirect(
      new URL(
        "/dashboard",
        process.env.NODE_ENV === "development"
          ? "http://localhost:3000"
          : "https://yourdomain.com",
      ),
    );
  }

  // Only fetch plans if not in waitlist mode
  let plans = null;
  if (!isWaitlistMode) {
    const { data: plansData, error } = await supabase.functions.invoke(
      "supabase-functions-get-plans",
    );
    plans = plansData;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <Navbar />
      
      {/* Conditional Hero Section */}
      {isWaitlistMode ? <HeroWaitlist /> : <Hero />}

      {/* Use Cases Section - Show for all modes */}
      <UseCasesSection />

      {/* Features Section */}
      <section id="features" className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">
              Revolutionary AI Learning Platform
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Experience the future of education with AI that converts PDFs to videos, 
              provides voice tutoring, and offers intelligent support for students and teachers alike.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: <FileText className="w-6 h-6" />,
                title: "PDF to Video Learning",
                description:
                  "Transform static PDFs into dynamic video lessons with AI narration",
              },
              {
                icon: <Sparkles className="w-6 h-6" />,
                title: "Voice AI Tutor",
                description:
                  "Interactive voice conversations with your personal AI learning assistant",
              },
              {
                icon: <Brain className="w-6 h-6" />,
                title: "Intelligent Flashcards",
                description: "AI-generated study materials adapted to your learning style",
              },
              {
                icon: <BookOpen className="w-6 h-6" />,
                title: "Teacher & Student Tools",
                description:
                  "Comprehensive platform serving both educators and learners",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="text-black mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Problem-Solution Section */}
      <ProblemSolutionSection />

      {/* Product Focus Section */}
      <section className="py-20 bg-black text-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Powered by Advanced AI Technology</h2>
            <p className="text-gray-300 max-w-2xl mx-auto">
              Transform your learning experience with cutting-edge AI that understands how you learn best
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">📄➡️🎥</div>
              <div className="text-gray-300 font-semibold mb-2">PDF to Video</div>
              <div className="text-gray-400 text-sm">Convert static documents into engaging video lessons</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">🎙️🤖</div>
              <div className="text-gray-300 font-semibold mb-2">Voice AI Tutoring</div>
              <div className="text-gray-400 text-sm">Personal AI tutor that speaks and listens to you</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">👥📚</div>
              <div className="text-gray-300 font-semibold mb-2">Student & Teacher Support</div>
              <div className="text-gray-400 text-sm">Intelligent assistance for both learning and teaching</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Experience next-generation AI learning that adapts to your needs
              and transforms how you study
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-black text-xl font-bold">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">
                Upload & Transform
              </h3>
              <p className="text-gray-600">
                Upload your PDFs and watch them transform into engaging video lessons
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-black text-xl font-bold">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Voice Interaction</h3>
              <p className="text-gray-600">
                Ask questions and get explanations through natural voice conversations
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-black text-xl font-bold">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Master Content</h3>
              <p className="text-gray-600">
                Use AI-powered flashcards and personalized tutoring to master any subject
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Section - Show for all modes */}
      <ComparisonSection />

      {/* Waitlist Benefits Section - Only show in waitlist mode */}
      {isWaitlistMode && <WaitlistBenefitsSection />}

      {/* Debug Component - Only show in waitlist mode */}
      {isWaitlistMode && (
        <section className="py-12 bg-gray-50">
          <div className="container mx-auto px-4">
            <WaitlistDebug />
          </div>
        </section>
      )}

      {/* Conditional Pricing Section - Only show if not in waitlist mode */}
      {!isWaitlistMode && (
        <section id="pricing" className="py-24 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">Choose Your Study Plan</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Select the plan that fits your study needs and goals
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {plans?.map((item: any) => (
                <PricingCard key={item.id} item={item} user={user} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Roadmap Section - Show for all modes */}
      <RoadmapSection />

      {/* Testimonials Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">What Students Say</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Join thousands of students who've improved their study habits
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-black font-semibold">J</span>
                </div>
                <div>
                  <h4 className="font-semibold">Jamie L.</h4>
                  <p className="text-sm text-gray-500">Medical Student</p>
                </div>
              </div>
              <p className="text-gray-600">
                "This platform helped me memorize complex medical terminology in
                half the time. The flashcards are perfectly tailored to my
                textbooks."
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-black font-semibold">M</span>
                </div>
                <div>
                  <h4 className="font-semibold">Michael T.</h4>
                  <p className="text-sm text-gray-500">Law Student</p>
                </div>
              </div>
              <p className="text-gray-600">
                "The quizzes generated from my case studies were incredibly
                helpful for exam prep. I've recommended it to my entire study
                group."
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-black font-semibold">S</span>
                </div>
                <div>
                  <h4 className="font-semibold">Sarah K.</h4>
                  <p className="text-sm text-gray-500">Engineering Major</p>
                </div>
              </div>
              <p className="text-gray-600">
                "Being able to upload my lecture notes and instantly get study
                materials saved me hours of preparation time. My grades have
                improved significantly."
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Section - Show for all modes */}
      <SocialProofSection />

      {/* Enhanced CTA Footer - Only show in waitlist mode */}
      {isWaitlistMode && <EnhancedCtaFooter />}

      {/* Conditional CTA Section - Only show if not in waitlist mode */}
      {!isWaitlistMode && (
        <section className="py-20 bg-gray-50">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4">
              Ready to Transform Your Study Habits?
            </h2>
            <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
              Join thousands of students who are studying smarter, not harder.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/sign-up"
                className="inline-flex items-center px-6 py-3 text-white bg-black rounded-lg hover:bg-gray-800 transition-colors"
              >
                Get Started Free
                <ArrowUpRight className="ml-2 w-4 h-4" />
              </a>
              <a
                href="#pricing"
                className="inline-flex items-center px-6 py-3 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                View Plans
              </a>
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}
