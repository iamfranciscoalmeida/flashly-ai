"use client";

import { useState } from "react";
import NavbarClient from "@/components/navbar-client";
import Footer from "@/components/footer";
import { ChevronDown, ChevronUp } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

export default function FAQ() {
  const [openItems, setOpenItems] = useState<number[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const faqs: FAQItem[] = [
    // General Questions
    {
      question: "What is Flashly AI and how does it work?",
      answer: "Flashly AI is an AI-powered learning platform that transforms your study materials into interactive learning experiences. Upload your PDFs and our AI converts them into engaging video lessons, creates intelligent flashcards, and provides voice-based tutoring to enhance your learning.",
      category: "general"
    },
    {
      question: "Who can use Flashly AI?",
      answer: "Flashly AI is designed for students of all levels, educators, and lifelong learners. Whether you're in high school, college, graduate school, or pursuing professional development, our platform adapts to your learning needs.",
      category: "general"
    },
    {
      question: "How is Flashly AI different from other study platforms?",
      answer: "Unlike traditional study platforms, Flashly AI offers unique features like PDF-to-video conversion, voice AI tutoring, and intelligent content analysis. Our AI doesn't just create generic study materials—it understands your content and creates personalized learning experiences.",
      category: "general"
    },

    // PDF to Video Features
    {
      question: "How does the PDF to video conversion work?",
      answer: "Our AI analyzes your uploaded PDF, extracts key concepts, and creates engaging video lessons with AI narration. The videos include visual aids, explanations, and structured content that makes complex topics easier to understand.",
      category: "features"
    },
    {
      question: "What types of PDFs work best for video conversion?",
      answer: "Educational materials like textbook chapters, lecture notes, research papers, and study guides work best. PDFs with clear text, diagrams, and structured content produce the highest quality video outputs.",
      category: "features"
    },
    {
      question: "Can I customize the generated videos?",
      answer: "Yes! You can adjust narration speed, select different AI voices, and customize visual elements. We're also working on features to add your own annotations and highlights to the generated videos.",
      category: "features"
    },

    // Voice AI Tutoring
    {
      question: "How does the voice AI tutoring work?",
      answer: "Our voice AI tutor uses natural language processing to have real conversations with you about your study materials. You can ask questions, request explanations, and get clarification on difficult concepts through voice interaction.",
      category: "features"
    },
    {
      question: "What subjects can the AI tutor help with?",
      answer: "Our AI tutor can assist with a wide range of subjects including mathematics, science, history, literature, languages, and more. The AI adapts its explanations based on the content you've uploaded and your learning level.",
      category: "features"
    },
    {
      question: "Is the voice AI tutor available 24/7?",
      answer: "Yes! Once you're on our platform, you can access your AI tutor anytime, anywhere. It's like having a personal tutor available whenever you need help with your studies.",
      category: "features"
    },

    // Student & Teacher Tools
    {
      question: "What tools are available for teachers?",
      answer: "Teachers can create course materials, generate quizzes and assessments, track student progress, and use our AI to develop interactive lesson content. We're building collaboration features to help manage classrooms and share resources.",
      category: "teachers"
    },
    {
      question: "Can teachers monitor student progress?",
      answer: "Yes, our platform includes analytics tools that help teachers track student engagement, quiz performance, and learning progress. This helps identify areas where students may need additional support.",
      category: "teachers"
    },
    {
      question: "Is there a way for students to collaborate?",
      answer: "We're developing collaborative features that will allow students to share study materials, work on group projects, and learn together. These features will be available in upcoming releases.",
      category: "teachers"
    },

    // Technical Questions
    {
      question: "What file formats do you support?",
      answer: "Currently, we support PDF files for document upload. We're working on adding support for Word documents, PowerPoint presentations, and other common educational file formats.",
      category: "technical"
    },
    {
      question: "Is there a mobile app?",
      answer: "We're currently developing mobile apps for iOS and Android, planned for release in Q1 2026. For now, our web platform is fully responsive and works great on mobile browsers.",
      category: "technical"
    },
    {
      question: "How secure is my data?",
      answer: "We take data security seriously. All uploaded content is encrypted, and we follow industry-standard security practices. Your study materials and personal information are protected and never shared without your permission.",
      category: "technical"
    },
    {
      question: "What happens if I exceed my usage limits?",
      answer: "If you reach your plan's limits, you'll be notified and can either wait for the next billing cycle or upgrade to a higher plan. We provide clear usage tracking so you always know where you stand.",
      category: "technical"
    },

    // Pricing & Plans
    {
      question: "Is there a free trial?",
      answer: "Yes! We offer a free trial that lets you experience our core features including PDF uploads, basic video generation, and limited AI tutoring sessions. No credit card required to start.",
      category: "pricing"
    },
    {
      question: "What's included in the paid plans?",
      answer: "Paid plans include unlimited PDF uploads, advanced video generation, unlimited voice AI tutoring, priority support, and access to teacher collaboration tools. Higher tiers offer additional features and increased usage limits.",
      category: "pricing"
    },
    {
      question: "Can I cancel my subscription anytime?",
      answer: "Yes, you can cancel your subscription at any time through your account settings. You'll continue to have access to paid features until the end of your current billing period.",
      category: "pricing"
    },

    // Troubleshooting
    {
      question: "Why is my PDF not converting properly?",
      answer: "PDF conversion issues usually occur with scanned documents, complex layouts, or corrupted files. Try uploading a text-based PDF with clear formatting. If problems persist, contact our support team.",
      category: "troubleshooting"
    },
    {
      question: "The AI tutor isn't understanding my questions. What should I do?",
      answer: "Try asking more specific questions related to your uploaded content. The AI works best when you reference specific topics or concepts from your study materials. You can also try rephrasing your question.",
      category: "troubleshooting"
    },
    {
      question: "How can I improve the quality of generated content?",
      answer: "Upload high-quality, well-structured PDFs with clear headings and formatting. Ensure your documents are text-based rather than scanned images. The better the source material, the better the AI-generated output.",
      category: "troubleshooting"
    }
  ];

  const categories = [
    { key: "all", label: "All Questions" },
    { key: "general", label: "General" },
    { key: "features", label: "Features" },
    { key: "teachers", label: "For Teachers" },
    { key: "technical", label: "Technical" },
    { key: "pricing", label: "Pricing" },
    { key: "troubleshooting", label: "Troubleshooting" }
  ];

  const filteredFAQs = activeCategory === "all" 
    ? faqs 
    : faqs.filter(faq => faq.category === activeCategory);

  const toggleItem = (index: number) => {
    setOpenItems(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <NavbarClient />
      
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-gray-600">
            Find answers to common questions about Flashly AI's features and services
          </p>
        </div>

        {/* Category Filter */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2 justify-center">
            {categories.map((category) => (
              <button
                key={category.key}
                onClick={() => setActiveCategory(category.key)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === category.key
                    ? "bg-black text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {filteredFAQs.map((faq, index) => (
            <div
              key={index}
              className="border border-gray-200 rounded-lg overflow-hidden"
            >
              <button
                onClick={() => toggleItem(index)}
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <h3 className="text-lg font-semibold text-gray-900 pr-4">
                  {faq.question}
                </h3>
                {openItems.includes(index) ? (
                  <ChevronUp className="w-5 h-5 text-gray-500 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
                )}
              </button>
              
              {openItems.includes(index) && (
                <div className="px-6 pb-4">
                  <p className="text-gray-700 leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Contact Section */}
        <div className="mt-16 text-center">
          <div className="bg-gray-50 p-8 rounded-xl">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Still have questions?
            </h2>
            <p className="text-gray-600 mb-6">
              Can't find what you're looking for? Our support team is here to help.
            </p>
            <a
              href="/contact"
              className="inline-flex items-center px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              Contact Support
            </a>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
} 