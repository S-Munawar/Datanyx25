import Link from 'next/link';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Privacy Policy</h1>
          <p className="text-gray-600 mb-8">Last updated: November 30, 2025</p>

          <div className="prose prose-blue max-w-none">
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
              <p className="text-gray-600 mb-4">
                ImmunoDetect (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy and the 
                confidentiality of your personal health information. This Privacy Policy explains how we collect, 
                use, disclose, and safeguard your information when you use our Service.
              </p>
              <p className="text-gray-600 mb-4">
                We comply with all applicable healthcare data protection regulations, including the Health Insurance 
                Portability and Accountability Act (HIPAA) and the General Data Protection Regulation (GDPR) where applicable.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Information We Collect</h2>
              
              <h3 className="text-lg font-medium text-gray-900 mb-3">2.1 Personal Information</h3>
              <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
                <li>Name and contact information (email address, phone number)</li>
                <li>Account credentials (encrypted password)</li>
                <li>Professional credentials (for healthcare providers)</li>
                <li>Demographic information</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-900 mb-3">2.2 Health Information</h3>
              <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
                <li>Medical history and symptoms</li>
                <li>Genetic testing data and gene expression files</li>
                <li>Family health history</li>
                <li>Laboratory test results</li>
                <li>AI-generated predictions and risk assessments</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-900 mb-3">2.3 Technical Information</h3>
              <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
                <li>IP address and device information</li>
                <li>Browser type and version</li>
                <li>Usage patterns and preferences</li>
                <li>Cookies and similar tracking technologies</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">3. How We Use Your Information</h2>
              <p className="text-gray-600 mb-4">We use the collected information for:</p>
              <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
                <li>Providing and maintaining the Service</li>
                <li>Processing and analyzing health data for AI predictions</li>
                <li>Facilitating communication between patients and healthcare providers</li>
                <li>Improving our AI models and Service quality</li>
                <li>Ensuring security and preventing fraud</li>
                <li>Complying with legal obligations</li>
                <li>Conducting research with de-identified data (with consent)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Data Security</h2>
              <p className="text-gray-600 mb-4">
                We implement robust security measures to protect your data:
              </p>
              <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
                <li>End-to-end encryption for data in transit (TLS 1.3)</li>
                <li>AES-256 encryption for data at rest</li>
                <li>Multi-factor authentication</li>
                <li>Regular security audits and penetration testing</li>
                <li>Role-based access controls</li>
                <li>Audit logging of all data access</li>
                <li>Secure cloud infrastructure (SOC 2 Type II certified)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Data Sharing and Disclosure</h2>
              <p className="text-gray-600 mb-4">
                We may share your information with:
              </p>
              <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
                <li><strong>Healthcare Providers:</strong> Genetic counselors and researchers you authorize</li>
                <li><strong>Service Providers:</strong> Third parties who assist in operating our Service</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect rights</li>
                <li><strong>Research Partners:</strong> With de-identified data for research purposes (with consent)</li>
              </ul>
              <p className="text-gray-600 mb-4">
                We do NOT sell your personal or health information to third parties.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Your Rights</h2>
              <p className="text-gray-600 mb-4">You have the right to:</p>
              <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
                <li>Access your personal and health data</li>
                <li>Request correction of inaccurate data</li>
                <li>Request deletion of your data (with certain exceptions)</li>
                <li>Restrict processing of your data</li>
                <li>Data portability (receive your data in a standard format)</li>
                <li>Withdraw consent for optional processing</li>
                <li>Lodge a complaint with a supervisory authority</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Data Retention</h2>
              <p className="text-gray-600 mb-4">
                We retain your data for as long as necessary to provide the Service and comply with legal obligations:
              </p>
              <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
                <li>Active account data: Duration of account plus 7 years</li>
                <li>Health records: As required by applicable healthcare regulations</li>
                <li>Audit logs: 7 years</li>
                <li>Marketing data: Until consent is withdrawn</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Cookies and Tracking</h2>
              <p className="text-gray-600 mb-4">
                We use cookies and similar technologies to enhance your experience:
              </p>
              <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
                <li><strong>Essential Cookies:</strong> Required for basic functionality</li>
                <li><strong>Analytics Cookies:</strong> Help us understand how you use the Service</li>
                <li><strong>Preference Cookies:</strong> Remember your settings</li>
              </ul>
              <p className="text-gray-600 mb-4">
                You can control cookies through your browser settings.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Children&apos;s Privacy</h2>
              <p className="text-gray-600 mb-4">
                Our Service is not intended for children under 13. For minors between 13 and 18, parental or 
                guardian consent is required. We take additional precautions to protect the privacy of minors.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">10. International Data Transfers</h2>
              <p className="text-gray-600 mb-4">
                Your data may be transferred to and processed in countries other than your own. We ensure 
                appropriate safeguards are in place, including Standard Contractual Clauses approved by 
                relevant authorities.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">11. Changes to This Policy</h2>
              <p className="text-gray-600 mb-4">
                We may update this Privacy Policy from time to time. We will notify you of any material 
                changes by posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">12. Contact Us</h2>
              <p className="text-gray-600 mb-4">
                For privacy-related inquiries or to exercise your rights, contact our Data Protection Officer:
              </p>
              <p className="text-gray-600">
                Email: privacy@immunodetect.com<br />
                Phone: 1-800-IMMUNO-1<br />
                Address: 123 Healthcare Drive, Medical City, MC 12345
              </p>
            </section>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <Link href="/" className="text-blue-600 hover:underline">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
