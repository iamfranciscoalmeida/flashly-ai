import NavbarClient from "@/components/navbar-client";
import Footer from "@/components/footer";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-white">
      <NavbarClient />
      
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Terms of Service
          </h1>
          <p className="text-gray-600">
            Last updated: June 2025
          </p>
        </div>

        <div className="prose prose-lg max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              1. Acceptance of Terms
            </h2>
            <div className="text-gray-700 space-y-4">
              <p>
                By accessing or using Flashly AI's services, you agree to be bound by these Terms of Service. 
                If you do not agree to these terms, please do not use our service.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              2. Description of Service
            </h2>
            <div className="text-gray-700 space-y-4">
              <p>
                Flashly AI provides an AI-powered learning platform that offers:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>PDF to video conversion using artificial intelligence</li>
                <li>Voice-based AI tutoring and interactive learning</li>
                <li>Intelligent flashcard generation and study tools</li>
                <li>Educational assistance for students and teachers</li>
                <li>Content analysis and personalized learning recommendations</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              3. User Accounts and Responsibilities
            </h2>
            <div className="text-gray-700 space-y-4">
              <p>
                To use our service, you must create an account and provide accurate information. You are responsible for:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Maintaining the confidentiality of your account credentials</li>
                <li>All activities that occur under your account</li>
                <li>Ensuring your content complies with our acceptable use policy</li>
                <li>Notifying us immediately of any unauthorized use of your account</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              4. Acceptable Use Policy
            </h2>
            <div className="text-gray-700 space-y-4">
              <p>You agree not to use our service to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Upload copyrighted materials without proper authorization</li>
                <li>Share inappropriate, offensive, or illegal content</li>
                <li>Attempt to reverse engineer or compromise our AI systems</li>
                <li>Use the service for commercial purposes without permission</li>
                <li>Violate any applicable laws or regulations</li>
                <li>Harass, abuse, or harm other users</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              5. Intellectual Property Rights
            </h2>
            <div className="text-gray-700 space-y-4">
              <h3 className="text-lg font-semibold">Your Content</h3>
              <p>
                You retain ownership of the original content you upload. By using our service, 
                you grant us a license to process, analyze, and transform your content to provide our services.
              </p>
              
              <h3 className="text-lg font-semibold">Generated Content</h3>
              <p>
                AI-generated materials (videos, flashcards, etc.) created from your content belong to you, 
                but you acknowledge that similar outputs may be generated for other users from similar inputs.
              </p>
              
              <h3 className="text-lg font-semibold">Our Platform</h3>
              <p>
                Our AI technology, platform, and proprietary algorithms remain our intellectual property.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              6. Privacy and Data Protection
            </h2>
            <div className="text-gray-700 space-y-4">
              <p>
                Your privacy is important to us. Our collection and use of your information is governed by our 
                Privacy Policy, which is incorporated by reference into these Terms.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              7. Payment and Subscription Terms
            </h2>
            <div className="text-gray-700 space-y-4">
              <p>
                If you subscribe to our paid services:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Fees are charged in advance and are non-refundable except as required by law</li>
                <li>Subscriptions automatically renew unless cancelled</li>
                <li>We may change pricing with advance notice to existing subscribers</li>
                <li>You can cancel your subscription at any time through your account settings</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              8. Service Availability and Modifications
            </h2>
            <div className="text-gray-700 space-y-4">
              <p>
                We strive to provide reliable service, but:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>We do not guarantee uninterrupted or error-free service</li>
                <li>We may modify, suspend, or discontinue features with notice</li>
                <li>Scheduled maintenance may temporarily affect service availability</li>
                <li>We reserve the right to impose usage limits on our AI services</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              9. Limitation of Liability
            </h2>
            <div className="text-gray-700 space-y-4">
              <p>
                To the fullest extent permitted by law, Flashly AI shall not be liable for any indirect, 
                incidental, special, or consequential damages arising from your use of our service. 
                Our total liability shall not exceed the amount you paid us in the 12 months preceding the claim.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              10. AI-Generated Content Disclaimer
            </h2>
            <div className="text-gray-700 space-y-4">
              <p>
                Our AI-generated content is provided for educational purposes. While we strive for accuracy:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>AI-generated content may contain errors or inaccuracies</li>
                <li>You should verify important information from authoritative sources</li>
                <li>We do not guarantee the correctness of AI-generated study materials</li>
                <li>Use our content as a study aid, not as a substitute for professional education</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              11. Termination
            </h2>
            <div className="text-gray-700 space-y-4">
              <p>
                Either party may terminate this agreement at any time. We may suspend or terminate your 
                account if you violate these terms. Upon termination, you will lose access to our service 
                and your data may be deleted after a reasonable period.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              12. Changes to Terms
            </h2>
            <div className="text-gray-700 space-y-4">
              <p>
                We may update these Terms of Service from time to time. We will notify you of material 
                changes by email or through our platform. Continued use of our service after changes 
                constitutes acceptance of the new terms.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              13. Governing Law and Disputes
            </h2>
            <div className="text-gray-700 space-y-4">
              <p>
                These terms are governed by the laws of [Your Jurisdiction]. Any disputes will be resolved 
                through binding arbitration, except for claims of intellectual property infringement.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              14. Contact Information
            </h2>
            <div className="text-gray-700 space-y-4">
              <p>
                If you have questions about these Terms of Service, please contact us:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p><strong>Email:</strong> legal@flashly.ai</p>
                <p><strong>Address:</strong> [Your Company Address]</p>
              </div>
            </div>
          </section>
        </div>
      </div>

      <Footer />
    </div>
  );
} 