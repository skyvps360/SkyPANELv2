import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { useState } from "react";
import { BRAND_NAME } from "../lib/brand";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const faqs = [
  {
    category: "Getting Started",
    questions: [
      {
        q: `What is ${BRAND_NAME}?`,
        a: `${BRAND_NAME} is a cloud infrastructure platform that provides VPS hosting, container deployment, and managed services. We offer flexible, scalable solutions for businesses of all sizes.`
      },
      {
        q: "How do I create an account?",
        a: "Click the 'Register' button at the top right of the page. Fill in your email, create a password, and verify your email address. Once verified, you can start deploying services immediately."
      },
      {
        q: "What payment methods do you accept?",
        a: "We accept PayPal for wallet top-ups. You can add funds to your wallet using credit/debit cards through PayPal's secure payment gateway."
      },
      {
        q: "How does billing work?",
        a: "We use an hourly billing model. Resources are billed every hour based on usage. Charges are automatically deducted from your prepaid wallet balance."
      },
    ]
  },
  {
    category: "VPS Hosting",
    questions: [
      {
        q: "What is a VPS?",
        a: "A Virtual Private Server (VPS) is a virtualized server that provides dedicated resources (CPU, RAM, storage) in a shared hosting environment. It gives you full root access and control over your server."
      },
      {
        q: "What operating systems are available?",
        a: "We offer a wide range of Linux distributions including Ubuntu, Debian, CentOS, Fedora, and more. You can also deploy custom images or use marketplace applications."
      },
      {
        q: "Can I upgrade or downgrade my VPS?",
        a: "Yes! You can resize your VPS at any time. Upgrades happen quickly, while downgrades may require some downtime for disk reduction."
      },
      {
        q: "Do you provide backups?",
        a: "Yes, we offer automated daily backups and manual snapshots. You can enable backups for any VPS instance and restore from any backup point."
      },
    ]
  },
  {
    category: "Containers",
    questions: [
      {
        q: "What is container hosting?",
        a: "Container hosting allows you to deploy Docker containers for your applications. It's lightweight, portable, and perfect for microservices architecture."
      },
      {
        q: "Can I deploy my own Docker images?",
        a: "Absolutely! You can deploy any Docker image from Docker Hub or your private registry."
      },
      {
        q: "How do containers differ from VPS?",
        a: "Containers are lightweight and share the host OS kernel, making them faster to start and more resource-efficient than VPS. However, VPS provides complete isolation and full OS control."
      },
    ]
  },
  {
    category: "Billing & Payments",
    questions: [
      {
        q: "How do I add funds to my wallet?",
        a: "Go to the Billing section and click 'Add Funds'. Enter the amount you want to add and complete the payment through PayPal."
      },
      {
        q: "Can I get a refund?",
        a: "We offer prorated refunds for unused services. Contact our support team to request a refund, and we'll process it within 5-7 business days."
      },
      {
        q: "What happens if my wallet runs out of funds?",
        a: "You'll receive email notifications when your balance is low. If your wallet reaches zero, your services will be suspended until you add more funds."
      },
      {
        q: "Can I set up auto-reload?",
        a: "Currently, auto-reload is not available, but it's on our roadmap. You'll need to manually add funds as needed."
      },
    ]
  },
  {
    category: "Support",
    questions: [
      {
        q: "How do I contact support?",
        a: "You can create a support ticket from your dashboard. We typically respond within 24 hours for regular tickets and within 4 hours for urgent issues."
      },
      {
        q: "Do you offer live chat support?",
        a: "Currently, support is provided through our ticketing system. Live chat support is planned for future releases."
      },
      {
        q: "What are your support hours?",
        a: "Our support team is available 24/7 for critical issues. Regular tickets are handled during business hours (9 AM - 6 PM EST)."
      },
    ]
  },
  {
    category: "Technical",
    questions: [
      {
        q: "What data centers do you use?",
        a: "We partner with leading infrastructure providers including Linode/Akamai. Servers are available in multiple regions worldwide including North America, Europe, and Asia."
      },
      {
        q: "Do you provide DDoS protection?",
        a: "Yes, all our services include basic DDoS protection. Advanced DDoS mitigation is available as an add-on."
      },
      {
        q: "Can I use my own domain?",
        a: "Yes! You can point your domain to your VPS or container using A/AAAA records. We also support custom reverse DNS."
      },
      {
        q: "Is there an API available?",
        a: "Yes, we provide a comprehensive RESTful API. You can generate API keys from your account settings and integrate with our platform programmatically."
      },
    ]
  },
];

export default function FAQ() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<string[]>([faqs[0].category]);
  const [expandedQuestions, setExpandedQuestions] = useState<string[]>([]);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const toggleQuestion = (question: string) => {
    setExpandedQuestions(prev =>
      prev.includes(question)
        ? prev.filter(q => q !== question)
        : [...prev, question]
    );
  };

  const filteredFaqs = faqs.map(category => ({
    ...category,
    questions: category.questions.filter(
      qa =>
        qa.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        qa.a.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter(category => category.questions.length > 0);

  return (
    <div className="container mx-auto max-w-5xl py-12 px-4">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-foreground mb-4">Frequently Asked Questions</h1>
        <p className="text-lg text-muted-foreground mb-8">
          Find answers to common questions about {BRAND_NAME}
        </p>
        
        {/* Search */}
        <div className="max-w-xl mx-auto relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
          <Input
            type="text"
            placeholder="Search FAQs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* FAQ Categories */}
      <div className="space-y-4">
        {filteredFaqs.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">
                No FAQs found matching your search. Try different keywords or{" "}
                <Link to="/support" className="text-primary hover:underline">
                  contact support
                </Link>.
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredFaqs.map((category) => (
            <Card key={category.category}>
              <CardHeader 
                className="cursor-pointer hover:bg-secondary/50 transition-colors"
                onClick={() => toggleCategory(category.category)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">{category.category}</CardTitle>
                  {expandedCategories.includes(category.category) ? (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
              
              {expandedCategories.includes(category.category) && (
                <CardContent className="space-y-4">
                  {category.questions.map((qa, idx) => (
                    <div key={idx} className="border-b border-border last:border-0 pb-4 last:pb-0">
                      <button
                        onClick={() => toggleQuestion(qa.q)}
                        className="w-full text-left flex items-start justify-between gap-4 py-2"
                      >
                        <h3 className="font-medium text-foreground">{qa.q}</h3>
                        {expandedQuestions.includes(qa.q) ? (
                          <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                        )}
                      </button>
                      {expandedQuestions.includes(qa.q) && (
                        <p className="text-muted-foreground mt-2 ml-0 text-sm leading-relaxed">
                          {qa.a}
                        </p>
                      )}
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Still have questions? */}
      <Card className="mt-12 bg-primary/5 border-primary/20">
        <CardContent className="text-center py-8">
          <h2 className="text-2xl font-semibold text-foreground mb-4">
            Still have questions?
          </h2>
          <p className="text-muted-foreground mb-6">
            Can't find what you're looking for? Our support team is here to help.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button asChild>
              <Link to="/support">Contact Support</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/help-center">Visit Help Center</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
