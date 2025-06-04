import { GraduationCap, BookOpen, Target, Brain } from "lucide-react";

export default function UseCasesSection() {
  const useCases = [
    {
      icon: <GraduationCap className="w-8 h-8" />,
      audience: "High School Students",
      headline: "Ace IB, A-Levels, or AP exams with smarter prep",
      scenario: "Upload your biology notes → get 50 flashcards in seconds",
      bgColor: "bg-gray-50",
      iconColor: "text-black"
    },
    {
      icon: <BookOpen className="w-8 h-8" />,
      audience: "University Students", 
      headline: "Turn dense textbooks into daily flashcards",
      scenario: "Upload economics chapter → instant quiz questions ready",
      bgColor: "bg-gray-100",
      iconColor: "text-black"
    },
    {
      icon: <Brain className="w-8 h-8" />,
      audience: "Self-learners",
      headline: "Master new skills or concepts with AI-generated study tools",
      scenario: "Upload coding tutorial → practice questions generated",
      bgColor: "bg-gray-50", 
      iconColor: "text-black"
    },
    {
      icon: <Target className="w-8 h-8" />,
      audience: "Test Prep (SAT, MCAT, LSAT)",
      headline: "Focus on exactly what matters — based on your own materials",
      scenario: "Upload prep book sections → targeted flashcard deck created",
      bgColor: "bg-gray-100",
      iconColor: "text-black"
    }
  ];

  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">
            Perfect for Every Type of Student
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Whether you're cramming for finals or building long-term knowledge, 
            StudyWithAI adapts to your learning style and goals.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {useCases.map((useCase, index) => (
            <div
              key={index}
              className="group p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-all duration-300 hover:border-gray-300 cursor-pointer"
            >
              <div className={`w-16 h-16 ${useCase.bgColor} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200`}>
                <div className={useCase.iconColor}>
                  {useCase.icon}
                </div>
              </div>
              
              <h3 className="font-semibold text-gray-900 mb-2">
                {useCase.audience}
              </h3>
              
              <p className="text-gray-700 font-medium mb-3 leading-snug">
                {useCase.headline}
              </p>
              
              <div className="bg-gray-50 p-3 rounded-lg border-l-4 border-black">
                <p className="text-sm text-gray-600 italic">
                  {useCase.scenario}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-500 text-sm">
            Join thousands of students already transforming how they study
          </p>
        </div>
      </div>
    </section>
  );
} 