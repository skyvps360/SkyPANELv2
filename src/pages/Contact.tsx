import { useState } from "react";
import { Link } from "react-router-dom";
import { Clock, MapPin, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { BRAND_NAME } from "../lib/brand";
import PublicLayout from "@/components/PublicLayout";

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    category: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    toast.success("Message sent successfully! We'll get back to you soon.");
    setFormData({
      name: "",
      email: "",
      subject: "",
      category: "",
      message: "",
    });
    setIsSubmitting(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <PublicLayout>
      <div className="container mx-auto max-w-6xl px-4 py-12">
      <div className="space-y-4 text-center">
        <Badge variant="outline" className="uppercase tracking-wide">How can we help?</Badge>
        <h1 className="text-3xl font-semibold md:text-4xl">Talk with the {BRAND_NAME} team</h1>
        <p className="mx-auto max-w-3xl text-base text-muted-foreground">
          Whether you&apos;re evaluating our platform, planning a migration, or need help with an existing deployment, we respond fast—and with real engineers.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs uppercase tracking-wide text-muted-foreground/80">
          <span className="inline-flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> 1 hr avg. response for priority tickets</span>
          <span className="inline-flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Dedicated success engineers</span>
        </div>
      </div>

      <div className="mt-12 grid gap-8 md:grid-cols-3">
        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Email our team</CardTitle>
              <CardDescription>For general questions and account help</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <a href={`mailto:support@${BRAND_NAME.toLowerCase()}.com`} className="text-sm font-medium text-primary">
                support@{BRAND_NAME.toLowerCase()}.com
              </a>
              <p className="text-xs text-muted-foreground">We reply within one business day.</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Submit a ticket</CardTitle>
              <CardDescription>Technical issues, platform feedback, or outages</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Create a ticket from your dashboard for prioritized routing to the right on-call engineer.</p>
              <Separator />
              <p className="text-xs uppercase tracking-wide">Priority queues</p>
              <ul className="space-y-2 text-xs">
                <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" /> P1: Production outage (15 min response)</li>
                <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" /> P2: Degraded performance (1 hr response)</li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button variant="ghost" asChild className="px-0 text-primary">
                <Link to="/support">Open dashboard →</Link>
              </Button>
            </CardFooter>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Call us</CardTitle>
              <CardDescription>Weekdays 9:00 AM – 6:00 PM EST</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <a href="tel:+1234567890" className="text-sm font-medium text-primary">
                +1 (234) 567-890
              </a>
              <p className="text-xs text-muted-foreground">Emergency support available 24/7 for enterprise plans.</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Visit our office</CardTitle>
              <CardDescription>By appointment only</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-primary" />
                <div>
                  123 Cloud Street<br />
                  Tech District, San Francisco, CA 94105<br />
                  United States
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary/5">
            <CardHeader>
              <CardTitle>Self-serve resources</CardTitle>
              <CardDescription>Instant answers for common requests</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Button variant="ghost" asChild className="h-auto w-full justify-start px-0 py-2 text-left">
                <Link to="/faq" className="font-medium text-primary">Browse FAQs →</Link>
              </Button>
              <Button variant="ghost" asChild className="h-auto w-full justify-start px-0 py-2 text-left">
                <Link to="/status" className="font-medium text-primary">Check platform status →</Link>
              </Button>
              <Button variant="ghost" asChild className="h-auto w-full justify-start px-0 py-2 text-left">
                <Link to="/api-docs" className="font-medium text-primary">Review API documentation →</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Send us a message</CardTitle>
              <CardDescription>Tell us what you need and we&apos;ll route it to the right specialist.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="John Doe"
                      autoComplete="name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="john@example.com"
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General inquiry</SelectItem>
                        <SelectItem value="sales">Pricing &amp; sales</SelectItem>
                        <SelectItem value="support">Technical support</SelectItem>
                        <SelectItem value="billing">Billing</SelectItem>
                        <SelectItem value="partnership">Partnership</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject *</Label>
                    <Input
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      placeholder="Brief summary of your request"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message *</Label>
                  <Textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Include relevant context—services affected, urgency, or links to dashboards."
                    rows={6}
                    required
                  />
                </div>

                <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>Sending…</>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send message
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Availability</CardTitle>
              <CardDescription>Standard response windows for each channel</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Weekdays</span>
                <span className="font-medium">9:00 AM – 6:00 PM EST</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Saturday</span>
                <span className="font-medium">10:00 AM – 4:00 PM EST</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Sunday</span>
                <span className="font-medium">Closed</span>
              </div>
              <Separator className="my-4" />
              <p className="text-xs text-muted-foreground">
                <strong>Emergency support:</strong> Available 24/7 for customers with enterprise SLAs. Call the hotline in your runbook for immediate response.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
    </PublicLayout>
  );
}
