import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, BookOpen, LifeBuoy, Search } from "lucide-react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { BRAND_NAME } from "../lib/brand";
import PublicLayout from "@/components/PublicLayout";

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
        a: "We partner with leading infrastructure providers including Linode/Akamai, DigitalOcean, and ReliableSite. Servers are available in multiple regions worldwide including North America, Europe, and Asia."
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

const quickLinks = [
  { label: "Open a support ticket", href: "/support", icon: LifeBuoy },
  { label: "View platform status", href: "/status", icon: ArrowUpRight },
  { label: "Browse API docs", href: "/api-docs", icon: BookOpen },
];

const toSlug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export default function FAQ() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFaqs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return faqs;
    }

    return faqs
      .map(category => ({
        ...category,
        questions: category.questions.filter(qa =>
          qa.q.toLowerCase().includes(query) || qa.a.toLowerCase().includes(query)
        ),
      }))
      .filter(category => category.questions.length > 0);
  }, [searchQuery]);

  const totalQuestions = useMemo(
    () => faqs.reduce((count, category) => count + category.questions.length, 0),
    []
  );

  return (
    <PublicLayout>
      <div className="container mx-auto max-w-6xl px-4 py-12">
      <div className="grid gap-10 lg:grid-cols-[2fr,1fr]">
        <div>
          <div className="mb-10 space-y-4">
            <div className="space-y-2">
              <Badge variant="outline" className="uppercase tracking-wide">Support</Badge>
              <h1 className="text-3xl font-semibold md:text-4xl">Frequently Asked Questions</h1>
              <p className="text-muted-foreground text-base">
                Find answers to the most common questions about {BRAND_NAME}. Still stuck? Our support team is a message away.
              </p>
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search by keyword or topic"
                    className="pl-10"
                  />
                </div>
                <CardDescription className="mt-3 text-xs">
                  Showing {filteredFaqs.reduce((count, category) => count + category.questions.length, 0)} of {totalQuestions} answers
                </CardDescription>
              </CardContent>
            </Card>
          </div>

          {filteredFaqs.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <h2 className="text-xl font-medium">No results for “{searchQuery}”</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Try adjusting your search or {""}
                  <Link to="/support" className="font-medium text-primary">
                    contact support
                  </Link>{" "}
                  for personalized help.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Accordion
              key={searchQuery}
              type="multiple"
              defaultValue={filteredFaqs.length ? [toSlug(filteredFaqs[0].category)] : []}
              className="space-y-4"
            >
              {filteredFaqs.map((category) => (
                <AccordionItem value={toSlug(category.category)} key={category.category} className="border-none">
                  <Card className="shadow-sm">
                    <AccordionTrigger className="px-6 py-5">
                      <div className="flex w-full items-start justify-between gap-4 text-left">
                        <div className="space-y-1">
                          <CardTitle className="text-xl font-semibold">{category.category}</CardTitle>
                          <CardDescription className="text-sm">
                            {category.questions.length} {category.questions.length === 1 ? "question" : "questions"}
                          </CardDescription>
                        </div>
                        <Badge variant="secondary">Category</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <Separator />
                      <div className="px-6 py-4">
                        <Accordion type="multiple" className="space-y-2">
                          {category.questions.map((qa, index) => (
                            <AccordionItem value={`${toSlug(category.category)}-${index}`} key={qa.q} className="border rounded-lg">
                              <AccordionTrigger className="px-4 py-3 text-left text-base font-medium">
                                {qa.q}
                              </AccordionTrigger>
                              <AccordionContent className="px-4 pb-4 text-sm leading-relaxed text-muted-foreground">
                                {qa.a}
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </div>
                    </AccordionContent>
                  </Card>
                </AccordionItem>
              ))}
            </Accordion>
          )}

          <Card className="mt-10 border-primary/30 bg-primary/5">
            <CardContent className="flex flex-col items-start justify-between gap-6 px-8 py-8 md:flex-row md:items-center">
              <div>
                <h2 className="text-2xl font-semibold">Still have questions?</h2>
                <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                  We’re here to help with anything from billing to infrastructure architecture. Reach out and we’ll respond within one business day.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link to="/support">Open support ticket</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/contact">Talk to sales</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="hidden space-y-6 lg:block">
          <Card>
            <CardHeader>
              <CardTitle>Need something else?</CardTitle>
              <CardDescription>Direct links to our most-requested support resources.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {quickLinks.map(({ label, href, icon: Icon }) => (
                <Button
                  key={href}
                  variant="ghost"
                  asChild
                  className="h-auto w-full justify-start px-3 py-3 text-left"
                >
                  <Link to={href} className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-primary" />
                    <span className="flex-1 text-sm font-medium">{label}</span>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </Button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Latest updates</CardTitle>
              <CardDescription>Highlights from our release notes and platform announcements.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div>
                <p className="font-medium text-foreground">New API endpoints for theme controls</p>
                <p>Automate theme presets and dynamic branding from your CI/CD pipeline.</p>
              </div>
              <Separator />
              <div>
                <p className="font-medium text-foreground">Status page redesign</p>
                <p>Real-time health metrics with region-level granularity and historical uptime.</p>
              </div>
              <Separator />
              <div>
                <p className="font-medium text-foreground">Improved billing transparency</p>
                <p>Hourly usage charts and wallet alerts keep your finance team in sync.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
    </PublicLayout>
  );
}
