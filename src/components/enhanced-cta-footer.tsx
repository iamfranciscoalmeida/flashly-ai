import { ArrowRight, Users, Zap } from "lucide-react";
import WaitlistSignup from "./waitlist-signup";

export default function EnhancedCtaFooter() {
  return (
    <section className="py-24 bg-gradient-to-b from-black to-gray-900 text-white">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Main CTA */}
          <div className="mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
              Be the first to{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                study smarter
              </span>{" "}
              with AI
            </h2>
            
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
              Join <span className="text-white font-semibold">10,000+ students</span> who are 
              already on the waitlist. Don't miss your chance to transform how you learn.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-12">
              <div className="flex items-center text-green-400">
                <Zap className="w-5 h-5 mr-2" />
                <span className="text-sm">Limited early access spots</span>
              </div>
              <div className="flex items-center text-green-400">
                <Users className="w-5 h-5 mr-2" />
                <span className="text-sm">Join the VIP list now</span>
              </div>
            </div>
          </div>

          {/* Waitlist Form */}
          <div className="mb-16">
            <WaitlistSignup />
          </div>

          {/* Urgency and Social Proof */}
          <div className="border-t border-gray-700 pt-12">
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-2xl font-bold mb-2">⚡</div>
                <h3 className="font-semibold mb-2">Launch in Q2 2024</h3>
                <p className="text-gray-400 text-sm">Early access starting soon</p>
              </div>
              <div>
                <div className="text-2xl font-bold mb-2">🎯</div>
                <h3 className="font-semibold mb-2">Limited Beta Spots</h3>
                <p className="text-gray-400 text-sm">Only first 1,000 get priority access</p>
              </div>
              <div>
                <div className="text-2xl font-bold mb-2">💰</div>
                <h3 className="font-semibold mb-2">Lifetime Discount</h3>
                <p className="text-gray-400 text-sm">Lock in special pricing forever</p>
              </div>
            </div>
          </div>

          {/* Final Push */}
          <div className="border-t border-gray-700 pt-12 mt-12">
            <div className="bg-gray-800 rounded-xl p-8 border border-gray-700">
              <h3 className="text-xl font-bold mb-4">
                🚀 Still on the fence?
              </h3>
              <p className="text-gray-300 mb-6">
                Joining the waitlist is <span className="text-white font-semibold">100% free</span> with 
                <span className="text-white font-semibold"> zero commitment</span>. 
                You can unsubscribe anytime, but early supporters get the best perks.
              </p>
              <div className="flex items-center justify-center text-green-400">
                <ArrowRight className="w-4 h-4 mr-2" />
                <span className="text-sm font-medium">No spam, just updates on our progress</span>
              </div>
            </div>
          </div>

          {/* Social Proof Numbers */}
          <div className="mt-12 text-center">
            <p className="text-gray-500 text-sm">
              Join students from Harvard, MIT, Stanford, and 250+ other universities
            </p>
          </div>
        </div>
      </div>
    </section>
  );
} 