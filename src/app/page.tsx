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
              Study Smarter, Not Harder
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Our AI-powered platform transforms your study materials into
              effective learning tools, helping you master any subject with
              ease.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: <FileText className="w-6 h-6" />,
                title: "Easy Document Upload",
                description:
                  "Upload PDFs and notes with a simple drag & drop interface",
              },
              {
                icon: <Sparkles className="w-6 h-6" />,
                title: "AI-Generated Flashcards",
                description:
                  "Turn any document into interactive study materials",
              },
              {
                icon: <Brain className="w-6 h-6" />,
                title: "Smart Quizzes",
                description: "Test your knowledge with personalized quizzes",
              },
              {
                icon: <BookOpen className="w-6 h-6" />,
                title: "Spaced Repetition",
                description:
                  "Optimize your learning with proven memory techniques",
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

      {/* Stats Section */}
      <section className="py-20 bg-black text-white">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">10,000+</div>
              <div className="text-gray-300">Students Helped</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">50,000+</div>
              <div className="text-gray-300">Flashcards Generated</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">95%</div>
              <div className="text-gray-300">Improved Test Scores</div>
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
              Transform your study materials into effective learning tools in
              just a few steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-black text-xl font-bold">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">
                Upload Your Materials
              </h3>
              <p className="text-gray-600">
                Simply upload your PDF notes, textbooks, or study guides
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-black text-xl font-bold">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">AI Processing</h3>
              <p className="text-gray-600">
                Our AI analyzes your content and extracts key concepts
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-black text-xl font-bold">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Study & Learn</h3>
              <p className="text-gray-600">
                Practice with flashcards and quizzes tailored to your materials
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Section - Show for all modes */}
      <ComparisonSection />

      {/* Waitlist Benefits Section - Only show in waitlist mode */}
      {isWaitlistMode && <WaitlistBenefitsSection />}

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
