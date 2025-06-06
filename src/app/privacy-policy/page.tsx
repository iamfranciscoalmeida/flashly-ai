import NavbarClient from "@/components/navbar-client";
import Footer from "@/components/footer";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white">
      <NavbarClient />
      
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Privacy Policy
          </h1>
          <p className="text-gray-600">
            Last updated: June 2025
          </p>
        </div>

        <div className="prose prose-lg max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              1. Information We Collect
            </h2>
            <div className="text-gray-700 space-y-4">
              <p>
                We collect information you provide directly to us, such as when you create an account, 
                upload documents, or contact us for support.
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Account Information:</strong> Email address, name, and password</li>
                <li><strong>Educational Content:</strong> PDFs, documents, and study materials you upload</li>
                <li><strong>Generated Content:</strong> AI-generated flashcards, videos, and study materials</li>
                <li><strong>Usage Data:</strong> How you interact with our platform and features</li>
                <li><strong>Communication Data:</strong> Messages you send through our contact forms</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              2. How We Use Your Information
            </h2>
            <div className="text-gray-700 space-y-4">
              <p>We use your information to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Provide and improve our AI tutoring and learning services</li>
                <li>Generate personalized study materials and video content</li>
                <li>Process your uploaded documents to create learning materials</li>
                <li>Communicate with you about your account and our services</li>
                <li>Analyze usage patterns to enhance our AI algorithms</li>
                <li>Provide customer support and respond to your inquiries</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              3. Information Sharing and Disclosure
            </h2>
            <div className="text-gray-700 space-y-4">
              <p>
                We do not sell, trade, or otherwise transfer your personal information to third parties, 
                except in the following circumstances:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>With your explicit consent</li>
                <li>To comply with legal obligations or court orders</li>
                <li>To protect our rights, property, or safety, or that of our users</li>
                <li>With trusted service providers who assist in operating our platform (under strict confidentiality agreements)</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              4. Data Security
            </h2>
            <div className="text-gray-700 space-y-4">
              <p>
                We implement appropriate technical and organizational measures to protect your personal information, including:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Encryption of data in transit and at rest</li>
                <li>Regular security assessments and monitoring</li>
                <li>Access controls and authentication measures</li>
                <li>Secure cloud infrastructure with industry-standard protections</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              5. Your Rights and Choices
            </h2>
            <div className="text-gray-700 space-y-4">
              <p>You have the right to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Access and review your personal information</li>
                <li>Correct inaccurate or incomplete information</li>
                <li>Delete your account and associated data</li>
                <li>Export your data in a portable format</li>
                <li>Opt out of non-essential communications</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              6. Data Retention
            </h2>
            <div className="text-gray-700 space-y-4">
              <p>
                We retain your information for as long as your account is active or as needed to provide services. 
                We will delete your personal information when you close your account, unless we need to retain 
                it for legitimate business purposes or legal requirements.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              7. Children's Privacy
            </h2>
            <div className="text-gray-700 space-y-4">
              <p>
                Our service is intended for users aged 13 and older. We do not knowingly collect personal 
                information from children under 13. If we become aware that we have collected such information, 
                we will take steps to delete it promptly.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              8. Changes to This Policy
            </h2>
            <div className="text-gray-700 space-y-4">
              <p>
                We may update this Privacy Policy from time to time. We will notify you of any material 
                changes by posting the new policy on this page and updating the "Last updated" date.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              9. Contact Us
            </h2>
            <div className="text-gray-700 space-y-4">
              <p>
                If you have any questions about this Privacy Policy or our practices, please contact us at:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p><strong>Email:</strong> privacy@flashly.ai</p>
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