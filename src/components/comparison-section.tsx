import { Check, X } from "lucide-react";

export default function ComparisonSection() {
  const features = [
    {
      feature: "Upload documents",
      studyWithAI: true,
      anki: false,
      chatGPT: false
    },
    {
      feature: "Auto flashcard generation",
      studyWithAI: true,
      anki: false,
      chatGPT: false
    },
    {
      feature: "Built-in study mode",
      studyWithAI: true,
      anki: true,
      chatGPT: false
    },
    {
      feature: "Quiz generation from notes",
      studyWithAI: true,
      anki: false,
      chatGPT: false
    },
    {
      feature: "Built for students",
      studyWithAI: true,
      anki: true,
      chatGPT: false
    },
    {
      feature: "Spaced repetition",
      studyWithAI: true,
      anki: true,
      chatGPT: false
    },
    {
      feature: "Progress tracking",
      studyWithAI: true,
      anki: true,
      chatGPT: false
    }
  ];

  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">
            Why StudyWithAI is Different
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            See how we compare to other study tools. We're built specifically for modern students 
            who want AI-powered efficiency.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gray-50 p-6 border-b border-gray-200">
              <div className="grid grid-cols-4 gap-4 text-center">
                <div className="font-semibold text-gray-700">Feature</div>
                <div className="font-bold text-black">StudyWithAI</div>
                <div className="font-semibold text-gray-600">Anki</div>
                <div className="font-semibold text-gray-600">ChatGPT</div>
              </div>
            </div>

            {/* Feature Rows */}
            <div className="divide-y divide-gray-200">
              {features.map((row, index) => (
                <div key={index} className={`p-6 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <div className="grid grid-cols-4 gap-4 items-center text-center">
                    <div className="text-left font-medium text-gray-900">
                      {row.feature}
                    </div>
                    <div className="flex justify-center">
                      {row.studyWithAI ? (
                        <div className="bg-green-100 p-2 rounded-full">
                          <Check className="w-5 h-5 text-green-600" />
                        </div>
                      ) : (
                        <div className="bg-red-100 p-2 rounded-full">
                          <X className="w-5 h-5 text-red-600" />
                        </div>
                      )}
                    </div>
                    <div className="flex justify-center">
                      {row.anki ? (
                        <Check className="w-5 h-5 text-gray-600" />
                      ) : (
                        <X className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <div className="flex justify-center">
                      {row.chatGPT ? (
                        <Check className="w-5 h-5 text-gray-600" />
                      ) : (
                        <X className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="bg-black text-white p-6 text-center">
              <p className="font-semibold">
                🚀 The only platform that combines AI automation with student-focused features
              </p>
            </div>
          </div>
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-500 text-sm">
            *Comparison based on current features available as of 2024
          </p>
        </div>
      </div>
    </section>
  );
} 