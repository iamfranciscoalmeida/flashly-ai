import { X, Check, RotateCcw, Zap, Clock, ArrowRight } from "lucide-react";

export default function ProblemSolutionSection() {
  const problemSolutions = [
    {
      problem: "Reading long notes over and over",
      solution: "Get instant flashcards from any file",
      problemIcon: <RotateCcw className="w-5 h-5" />,
      solutionIcon: <Zap className="w-5 h-5" />
    },
    {
      problem: "Rewriting questions by hand",
      solution: "AI-generated quizzes in one click", 
      problemIcon: <Clock className="w-5 h-5" />,
      solutionIcon: <Zap className="w-5 h-5" />
    },
    {
      problem: "Not remembering content over time",
      solution: "Smart spaced repetition built-in",
      problemIcon: <X className="w-5 h-5" />,
      solutionIcon: <Check className="w-5 h-5" />
    }
  ];

  return (
    <section className="py-24 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">
            Stop Studying the Hard Way
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Traditional study methods are time-consuming and ineffective. 
            StudyWithAI transforms how you learn with intelligent automation.
          </p>
        </div>

        <div className="max-w-5xl mx-auto space-y-6">
          {problemSolutions.map((item, index) => (
            <div 
              key={index}
              className="bg-white rounded-2xl p-6 md:p-8 shadow-sm hover:shadow-md transition-all duration-300 border border-gray-200"
            >
              <div className="flex flex-col lg:flex-row items-center gap-6 lg:gap-8">
                {/* Problem Side */}
                <div className="flex-1 text-center lg:text-left">
                  <div className="flex items-center justify-center lg:justify-start gap-3 mb-4">
                    <div className="bg-red-50 text-red-500 p-3 rounded-full flex-shrink-0">
                      {item.problemIcon}
                    </div>
                    <X className="w-5 h-5 text-red-500 flex-shrink-0" />
                  </div>
                  <p className="text-lg text-gray-700 font-medium">
                    {item.problem}
                  </p>
                </div>

                {/* Arrow/Divider */}
                <div className="flex-shrink-0">
                  <div className="hidden lg:flex items-center justify-center w-12 h-12 bg-black rounded-full">
                    <ArrowRight className="w-6 h-6 text-white" />
                  </div>
                  <div className="lg:hidden flex items-center justify-center w-full">
                    <div className="w-12 h-px bg-gray-300"></div>
                    <ArrowRight className="w-6 h-6 text-gray-400 mx-2 rotate-90" />
                    <div className="w-12 h-px bg-gray-300"></div>
                  </div>
                </div>

                {/* Solution Side */}
                <div className="flex-1 text-center lg:text-left">
                  <div className="flex items-center justify-center lg:justify-start gap-3 mb-4">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <div className="bg-green-50 text-green-500 p-3 rounded-full flex-shrink-0 hover:scale-110 transition-transform duration-200">
                      {item.solutionIcon}
                    </div>
                  </div>
                  <p className="text-lg text-black font-semibold">
                    {item.solution}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <div className="inline-flex items-center bg-black text-white px-8 py-4 rounded-full shadow-lg">
            <Zap className="w-5 h-5 mr-3" />
            <span className="font-semibold">Study 3x faster with AI automation</span>
          </div>
        </div>
      </div>
    </section>
  );
} 