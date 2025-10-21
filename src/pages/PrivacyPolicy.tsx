import { BRAND_NAME } from "../lib/brand";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrivacyPolicy() {
  const lastUpdated = "October 20, 2025";

  return (
    <div className="container mx-auto max-w-4xl py-12 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-4">Privacy Policy</h1>
        <p className="text-muted-foreground">
          Last updated: {lastUpdated}
        </p>
      </div>

      <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>1. Introduction</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              {BRAND_NAME} ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy 
              explains how we collect, use, disclose, and safeguard your information when you use our cloud 
              infrastructure platform and services.
            </p>
            <p>
              Please read this Privacy Policy carefully. By using our Service, you consent to the practices 
              described in this policy. If you do not agree with this policy, please do not use our Service.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Information We Collect</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p><strong>2.1 Personal Information</strong></p>
            <p>When you register for an account, we collect:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Name and email address</li>
              <li>Billing and payment information (processed through PayPal)</li>
              <li>Organization details (if applicable)</li>
              <li>Contact information</li>
            </ul>

            <p className="pt-4"><strong>2.2 Technical Information</strong></p>
            <p>We automatically collect certain information when you use our Service:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>IP address and location data</li>
              <li>Browser type and version</li>
              <li>Operating system</li>
              <li>Device information</li>
              <li>Log data (access times, pages viewed, etc.)</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>

            <p className="pt-4"><strong>2.3 Usage Information</strong></p>
            <p>We collect information about how you use our Service, including:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Resource usage metrics (CPU, memory, bandwidth)</li>
              <li>API calls and requests</li>
              <li>Feature usage and preferences</li>
              <li>Support ticket interactions</li>
            </ul>

            <p className="pt-4"><strong>2.4 Customer Data</strong></p>
            <p>
              You may upload, store, or process data through our Service ("Customer Data"). We do not access, 
              view, or use your Customer Data except as necessary to provide the Service or as required by law.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>3. How We Use Your Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide, maintain, and improve our Service</li>
              <li>Process your transactions and manage your account</li>
              <li>Send you technical notices, updates, and security alerts</li>
              <li>Respond to your comments, questions, and support requests</li>
              <li>Monitor and analyze trends, usage, and activities</li>
              <li>Detect, prevent, and address technical issues and fraud</li>
              <li>Comply with legal obligations and enforce our Terms of Service</li>
              <li>Send you marketing communications (with your consent)</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>4. How We Share Your Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>We may share your information in the following circumstances:</p>
            
            <p className="pt-2"><strong>4.1 Service Providers</strong></p>
            <p>
              We share information with third-party service providers who perform services on our behalf, including:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Infrastructure providers (Linode/Akamai)</li>
              <li>Payment processors (PayPal)</li>
              <li>Email service providers</li>
              <li>Analytics providers</li>
            </ul>

            <p className="pt-4"><strong>4.2 Legal Requirements</strong></p>
            <p>We may disclose your information if required to do so by law or in response to valid requests by public authorities.</p>

            <p className="pt-4"><strong>4.3 Business Transfers</strong></p>
            <p>
              In the event of a merger, acquisition, or sale of assets, your information may be transferred as part 
              of that transaction.
            </p>

            <p className="pt-4"><strong>4.4 With Your Consent</strong></p>
            <p>We may share your information with your explicit consent for any other purpose.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>5. Data Security</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              We implement appropriate technical and organizational measures to protect your information against 
              unauthorized access, alteration, disclosure, or destruction. These measures include:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Encryption of data in transit (HTTPS/TLS)</li>
              <li>Encryption of sensitive data at rest</li>
              <li>Regular security audits and penetration testing</li>
              <li>Access controls and authentication</li>
              <li>Employee training on data protection</li>
            </ul>
            <p className="pt-2">
              However, no method of transmission over the Internet or electronic storage is 100% secure. While 
              we strive to protect your information, we cannot guarantee its absolute security.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>6. Data Retention</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              We retain your personal information for as long as necessary to provide the Service and fulfill the 
              purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted 
              by law.
            </p>
            <p>
              Upon account termination, we will delete your data within 30 days, except where retention is required 
              for legal, tax, or accounting purposes.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>7. Your Rights and Choices</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>You have the following rights regarding your personal information:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Access:</strong> You can request access to your personal information</li>
              <li><strong>Correction:</strong> You can update or correct inaccurate information</li>
              <li><strong>Deletion:</strong> You can request deletion of your account and associated data</li>
              <li><strong>Portability:</strong> You can request a copy of your data in a portable format</li>
              <li><strong>Opt-out:</strong> You can opt out of marketing communications</li>
              <li><strong>Object:</strong> You can object to certain processing of your information</li>
            </ul>
            <p className="pt-2">
              To exercise these rights, please contact us at privacy@{BRAND_NAME.toLowerCase()}.com
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>8. Cookies and Tracking Technologies</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              We use cookies and similar tracking technologies to track activity on our Service and hold certain 
              information. Cookies are files with small amount of data which may include an anonymous unique identifier.
            </p>
            <p>You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, you may not be able to use some portions of our Service.</p>
            <p>Types of cookies we use:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Session Cookies:</strong> Essential for using our Service</li>
              <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
              <li><strong>Analytics Cookies:</strong> Help us understand how you use our Service</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>9. Third-Party Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              Our Service may contain links to third-party websites or services that are not owned or controlled 
              by {BRAND_NAME}. We are not responsible for the privacy practices of these third parties. We encourage 
              you to review their privacy policies.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>10. Children's Privacy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              Our Service is not intended for individuals under the age of 18. We do not knowingly collect personal 
              information from children. If you become aware that a child has provided us with personal information, 
              please contact us immediately.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>11. International Data Transfers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              Your information may be transferred to and maintained on computers located outside of your state, 
              province, country, or other governmental jurisdiction where data protection laws may differ. By using 
              our Service, you consent to this transfer.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>12. Changes to This Privacy Policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting 
              the new Privacy Policy on this page and updating the "Last updated" date. Significant changes will 
              be communicated via email or prominent notice on our Service.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>13. Contact Us</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              If you have any questions about this Privacy Policy or our privacy practices, please contact us at:
            </p>
            <p>
              Email: privacy@{BRAND_NAME.toLowerCase()}.com<br />
              Address: 123 Cloud Street, Tech District, San Francisco, CA 94105<br />
              Privacy Officer: privacy@{BRAND_NAME.toLowerCase()}.com
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>14. GDPR Compliance (For EU Users)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              If you are located in the European Economic Area (EEA), you have certain data protection rights under 
              the General Data Protection Regulation (GDPR). We are committed to facilitating the exercise of these 
              rights in accordance with applicable law.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>15. CCPA Compliance (For California Users)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              If you are a California resident, you have specific rights under the California Consumer Privacy Act 
              (CCPA), including the right to know what personal information we collect, use, and share, and the 
              right to request deletion of your personal information.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
