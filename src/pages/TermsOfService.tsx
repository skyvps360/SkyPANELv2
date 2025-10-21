import { BRAND_NAME } from "../lib/brand";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TermsOfService() {
  const lastUpdated = "October 20, 2025";

  return (
    <div className="container mx-auto max-w-4xl py-12 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-4">Terms of Service</h1>
        <p className="text-muted-foreground">
          Last updated: {lastUpdated}
        </p>
      </div>

      <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>1. Acceptance of Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              By accessing and using {BRAND_NAME} ("Service"), you accept and agree to be bound by the terms 
              and provision of this agreement. If you do not agree to abide by the above, please do not use 
              this service.
            </p>
            <p>
              These Terms of Service ("Terms") constitute a legally binding agreement between you and {BRAND_NAME} 
              regarding your use of our cloud infrastructure platform and services.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Description of Service</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              {BRAND_NAME} provides cloud infrastructure services including but not limited to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Virtual Private Server (VPS) hosting</li>
              <li>Container deployment and management</li>
              <li>Network infrastructure and IP address management</li>
              <li>Automated backups and snapshots</li>
              <li>Monitoring and analytics tools</li>
              <li>API access for programmatic resource management</li>
            </ul>
            <p>
              We reserve the right to modify, suspend, or discontinue any aspect of the Service at any time, 
              with or without notice.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>3. Account Registration and Security</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              <strong>3.1 Account Creation:</strong> You must provide accurate, complete, and current information 
              during the registration process. You are responsible for maintaining the confidentiality of your 
              account credentials.
            </p>
            <p>
              <strong>3.2 Account Security:</strong> You are responsible for all activities that occur under your 
              account. You must notify us immediately of any unauthorized use of your account.
            </p>
            <p>
              <strong>3.3 Eligibility:</strong> You must be at least 18 years old to use this Service. By using 
              the Service, you represent and warrant that you meet this requirement.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>4. Billing and Payments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              <strong>4.1 Pricing:</strong> All fees are stated in US Dollars (USD) unless otherwise specified. 
              Resources are billed on an hourly basis.
            </p>
            <p>
              <strong>4.2 Prepaid Wallet:</strong> You must maintain a positive balance in your prepaid wallet. 
              Services may be suspended if your wallet balance reaches zero.
            </p>
            <p>
              <strong>4.3 Payment Methods:</strong> We accept payment via PayPal. Payment processing fees may apply.
            </p>
            <p>
              <strong>4.4 Refunds:</strong> Refunds are provided on a prorated basis for unused services at our 
              discretion. No refunds are provided for partial billing periods or for services already rendered.
            </p>
            <p>
              <strong>4.5 Price Changes:</strong> We reserve the right to change our pricing at any time with 
              30 days notice. Continued use of the Service after price changes constitutes acceptance of new pricing.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>5. Acceptable Use Policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>You agree not to use the Service to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Violate any laws, regulations, or third-party rights</li>
              <li>Distribute malware, viruses, or harmful code</li>
              <li>Engage in illegal, fraudulent, or deceptive activities</li>
              <li>Launch DDoS attacks or other malicious network activities</li>
              <li>Mine cryptocurrency without explicit written permission</li>
              <li>Send spam or unsolicited bulk email</li>
              <li>Host or distribute pirated content</li>
              <li>Attempt to gain unauthorized access to other systems or networks</li>
              <li>Interfere with or disrupt our services or servers</li>
            </ul>
            <p>
              Violation of this Acceptable Use Policy may result in immediate suspension or termination of your 
              account without refund.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>6. Service Level Agreement (SLA)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              <strong>6.1 Uptime Guarantee:</strong> We strive to maintain 99.9% uptime for our services. This 
              excludes scheduled maintenance windows.
            </p>
            <p>
              <strong>6.2 Scheduled Maintenance:</strong> We will provide at least 48 hours notice for scheduled 
              maintenance that may affect service availability.
            </p>
            <p>
              <strong>6.3 SLA Credits:</strong> In the event of service unavailability below our uptime guarantee, 
              you may be eligible for service credits as outlined in our SLA policy.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>7. Data and Privacy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              <strong>7.1 Your Data:</strong> You retain all rights to data you store on our Service. We do not 
              claim ownership of your content.
            </p>
            <p>
              <strong>7.2 Data Security:</strong> We implement industry-standard security measures to protect 
              your data. However, no method of transmission over the Internet is 100% secure.
            </p>
            <p>
              <strong>7.3 Data Backups:</strong> While we provide backup services, you are responsible for 
              maintaining your own backups. We are not liable for data loss.
            </p>
            <p>
              <strong>7.4 Privacy Policy:</strong> Our collection and use of personal information is governed 
              by our Privacy Policy, which is incorporated into these Terms by reference.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>8. Intellectual Property</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              The Service and its original content, features, and functionality are owned by {BRAND_NAME} and 
              are protected by international copyright, trademark, patent, trade secret, and other intellectual 
              property laws.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>9. Limitation of Liability</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, {BRAND_NAME.toUpperCase()} SHALL NOT BE LIABLE FOR ANY 
              INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR 
              REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER 
              INTANGIBLE LOSSES.
            </p>
            <p>
              Our total liability to you for any claims arising from or related to the Service shall not exceed 
              the amount you paid us in the 12 months preceding the claim.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>10. Termination</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              <strong>10.1 By You:</strong> You may terminate your account at any time by contacting support. 
              Upon termination, you will receive a prorated refund for any unused prepaid services.
            </p>
            <p>
              <strong>10.2 By Us:</strong> We may suspend or terminate your account immediately if you violate 
              these Terms, engage in fraudulent activity, or for any other reason at our sole discretion.
            </p>
            <p>
              <strong>10.3 Effect of Termination:</strong> Upon termination, your right to use the Service will 
              immediately cease. All data associated with your account will be deleted within 30 days unless 
              otherwise required by law.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>11. Changes to Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              We reserve the right to modify these Terms at any time. We will provide notice of significant 
              changes via email or through the Service. Your continued use of the Service after such modifications 
              constitutes acceptance of the updated Terms.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>12. Governing Law</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the State of California, 
              United States, without regard to its conflict of law provisions.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>13. Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              If you have any questions about these Terms, please contact us at:
            </p>
            <p>
              Email: legal@{BRAND_NAME.toLowerCase()}.com<br />
              Address: 123 Cloud Street, Tech District, San Francisco, CA 94105
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
