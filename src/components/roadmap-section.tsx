import { Calendar, Smartphone, Users, Brain, Cloud } from "lucide-react";

export default function RoadmapSection() {
  const roadmapItems = [
    {
      phase: "Beta Launch",
      timeline: "Q1 2024",
      status: "current",
      icon: <Calendar className="w-6 h-6" />,
      features: [
        "Core AI flashcard generation",
        "PDF upload & processing", 
        "Basic study modes",
        "Web platform access"
      ]
    },
    {
      phase: "Public Launch", 
      timeline: "Q2 2024",
      status: "upcoming",
      icon: <Users className="w-6 h-6" />,
      features: [
        "Advanced quiz generation",
        "Progress analytics",
        "Study streaks & gamification",
        "Multiple file format support"
      ]
    },
    {
      phase: "Mobile App",
      timeline: "Q3 2024", 
      status: "planned",
      icon: <Smartphone className="w-6 h-6" />,
      features: [
        "iOS & Android apps",
        "Offline study mode",
        "Push notifications for reviews",
        "Camera scanning of notes"
      ]
    },
    {
      phase: "AI Tutoring",
      timeline: "Q4 2024",
      status: "planned", 
      icon: <Brain className="w-6 h-6" />,
      features: [
        "Personalized AI tutor",
        "Real-time help & explanations",
        "Adaptive learning paths",
        "Voice interaction mode"
      ]
    },
    {
      phase: "Collaboration",
      timeline: "2025",
      status: "future",
      icon: <Cloud className="w-6 h-6" />,
      features: [
        "Study group features",
        "Google Drive/Notion integration", 
        "Shared flashcard decks",
        "Class collaboration tools"
      ]
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'current': return 'bg-green-500 border-green-300';
      case 'upcoming': return 'bg-black border-gray-300';
      case 'planned': return 'bg-gray-400 border-gray-300';
      case 'future': return 'bg-gray-300 border-gray-200';
      default: return 'bg-gray-300';
    }
  };

  const getTextColor = (status: string) => {
    switch (status) {
      case 'current': return 'text-green-700';
      case 'upcoming': return 'text-black';
      case 'planned': return 'text-gray-600';
      case 'future': return 'text-gray-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <section className="py-24 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">
            What's Coming Next
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            We're just getting started. Here's our roadmap for building the ultimate AI study companion.
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="relative">
            {/* Timeline line */}
            <div className="hidden lg:block absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-gray-300"></div>
            
            <div className="space-y-12">
              {roadmapItems.map((item, index) => (
                <div key={index} className={`relative lg:grid lg:grid-cols-2 lg:gap-8 items-center ${index % 2 === 0 ? '' : 'lg:grid-flow-col-dense'}`}>
                  {/* Timeline dot */}
                  <div className="hidden lg:block absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2 top-1/2">
                    <div className={`w-4 h-4 rounded-full border-4 ${getStatusColor(item.status)}`}></div>
                  </div>

                  {/* Content card */}
                  <div className={`bg-white rounded-xl p-6 shadow-sm border border-gray-200 ${index % 2 === 0 ? 'lg:text-right lg:pr-12' : 'lg:pl-12 lg:col-start-2'}`}>
                    <div className={`flex items-center gap-3 mb-4 ${index % 2 === 0 ? 'lg:justify-end' : ''}`}>
                      <div className={`p-2 rounded-lg bg-gray-100 ${getTextColor(item.status)}`}>
                        {item.icon}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-gray-900">{item.phase}</h3>
                        <p className="text-sm text-gray-500">{item.timeline}</p>
                      </div>
                    </div>
                    
                    <ul className={`space-y-2 text-sm text-gray-600 ${index % 2 === 0 ? 'lg:text-right' : ''}`}>
                      {item.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-center gap-2">
                          {index % 2 === 0 ? (
                            <>
                              <span className="lg:order-2">{feature}</span>
                              <span className="lg:order-1">•</span>
                            </>
                          ) : (
                            <>
                              <span>•</span>
                              <span>{feature}</span>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>

                    {item.status === 'current' && (
                      <div className={`mt-4 ${index % 2 === 0 ? 'lg:text-right' : ''}`}>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          🚀 Currently in development
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="text-center mt-16">
          <div className="inline-flex items-center bg-black text-white px-6 py-3 rounded-full">
            <Calendar className="w-5 h-5 mr-2" />
            <span className="font-medium">Join early to influence our roadmap</span>
          </div>
        </div>
      </div>
    </section>
  );
} 