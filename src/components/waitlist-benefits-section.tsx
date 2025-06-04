import { Crown, Users, Vote, Percent, Smartphone, Star } from "lucide-react";

export default function WaitlistBenefitsSection() {
  const benefits = [
    {
      icon: <Crown className="w-6 h-6" />,
      title: "Early access to StudyWithAI",
      description: "Be among the first to experience AI-powered studying"
    },
    {
      icon: <Star className="w-6 h-6" />,
      title: "Priority for beta feature invites", 
      description: "Get first access to new features as we build them"
    },
    {
      icon: <Vote className="w-6 h-6" />,
      title: "Ability to vote on features you want next",
      description: "Help shape the future of StudyWithAI with your input"
    },
    {
      icon: <Percent className="w-6 h-6" />,
      title: "Lifetime discount on premium plans",
      description: "Lock in special pricing for being an early supporter"
    },
    {
      icon: <Smartphone className="w-6 h-6" />,
      title: "First access to mobile app (coming soon)",
      description: "Study on-the-go with our upcoming mobile experience"
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Exclusive community access",
      description: "Join a private group of motivated students and early users"
    }
  ];

  return (
    <section className="py-24 bg-black text-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">
            What You'll Get by Joining the Waitlist
          </h2>
          <p className="text-gray-300 max-w-2xl mx-auto">
            Don't just wait — get exclusive benefits that make joining early incredibly valuable.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {benefits.map((benefit, index) => (
            <div 
              key={index}
              className="group p-6 rounded-xl border border-gray-800 hover:border-gray-600 transition-all duration-300 hover:bg-gray-900"
            >
              <div className="bg-gray-800 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:bg-gray-700 transition-colors">
                <div className="text-white">
                  {benefit.icon}
                </div>
              </div>
              
              <h3 className="text-lg font-semibold mb-2 flex items-center">
                ✅ {benefit.title}
              </h3>
              
              <p className="text-gray-400 text-sm leading-relaxed">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>

        <div className="text-center mt-16">
          <div className="inline-flex items-center bg-gray-800 px-6 py-3 rounded-full border border-gray-700">
            <Crown className="w-5 h-5 mr-2 text-yellow-400" />
            <span className="text-sm">
              <span className="text-yellow-400 font-semibold">VIP treatment</span> for early supporters
            </span>
          </div>
        </div>
      </div>
    </section>
  );
} 