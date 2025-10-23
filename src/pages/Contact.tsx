import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Clock, MapPin, Send, Sparkles, Loader2 } from "lucide-react";
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
import type { ContactConfig, EmailConfig, TicketConfig, PhoneConfig, OfficeConfig } from "@/types/contact";

// Default fallback data
const DEFAULT_CATEGORIES = [
  { id: "1", label: "General inquiry", value: "general", display_order: 0, is_active: true, created_at: "", updated_at: "" },
  { id: "2", label: "Pricing & sales", value: "sales", display_order: 1, is_active: true, created_at: "", updated_at: "" },
  { id: "3", label: "Technical support", value: "support", display_order: 2, is_active: true, created_at: "", updated_at: "" },
  { id: "4", label: "Billing", value: "billing", display_order: 3, is_active: true, created_at: "", updated_at: "" },
  { id: "5", label: "Partnership", value: "partnership", display_order: 4, is_active: true, created_at: "", updated_at: "" },
  { id: "6", label: "Other", value: "other", display_order: 5, is_active: true, created_at: "", updated_at: "" },
];

const DEFAULT_AVAILABILITY = [
  { id: "1", day_of_week: "Weekdays", is_open: true, hours_text: "9:00 AM – 6:00 PM EST", display_order: 0, created_at: "", updated_at: "" },
  { id: "2", day_of_week: "Saturday", is_open: true, hours_text: "10:00 AM – 4:00 PM EST", display_order: 1, created_at: "", updated_at: "" },
  { id: "3", day_of_week: "Sunday", is_open: false, hours_text: "Closed", display_order: 2, created_at: "", updated_at: "" },
];

const DEFAULT_EMERGENCY_TEXT = "Available 24/7 for customers with enterprise SLAs. Call the hotline in your runbook for immediate response.";

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    category: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contactConfig, setContactConfig] = useState<ContactConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch contact configuration on mount
  useEffect(() => {
    const fetchContactConfig = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/contact/config");
        
        if (!response.ok) {
          throw new Error("Failed to load contact configuration");
        }
        
        const data: ContactConfig = await response.json();
        setContactConfig(data);
      } catch (err) {
        console.error("Error fetching contact config:", err);
        // Use default fallback data
        setContactConfig({
          categories: DEFAULT_CATEGORIES,
          methods: {},
          availability: DEFAULT_AVAILABILITY,
          emergency_support_text: DEFAULT_EMERGENCY_TEXT,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchContactConfig();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          message: formData.message,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send message.");
      }
      toast.success("Message sent successfully! We'll get back to you soon.");
      setFormData({
        name: "",
        email: "",
        subject: "",
        category: "",
        message: "",
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to send message.");
    }
    setIsSubmitting(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  // Get active categories sorted by display_order
  const categories = contactConfig?.categories
    .filter(cat => cat.is_active)
    .sort((a, b) => a.display_order - b.display_order) || DEFAULT_CATEGORIES;

  // Get active contact methods
  const emailMethod = contactConfig?.methods.email?.is_active ? contactConfig.methods.email : null;
  const ticketMethod = contactConfig?.methods.ticket?.is_active ? contactConfig.methods.ticket : null;
  const phoneMethod = contactConfig?.methods.phone?.is_active ? contactConfig.methods.phone : null;
  const officeMethod = contactConfig?.methods.office?.is_active ? contactConfig.methods.office : null;

  // Get availability schedule
  const availability = contactConfig?.availability.sort((a, b) => a.display_order - b.display_order) || DEFAULT_AVAILABILITY;
  const emergencyText = contactConfig?.emergency_support_text || DEFAULT_EMERGENCY_TEXT;

  // Show loading state
  if (isLoading) {
    return (
      <PublicLayout>
        <div className="container mx-auto max-w-6xl px-4 py-12">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground">Loading contact information...</p>
            </div>
          </div>
        </div>
      </PublicLayout>
    );
  }

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
          {/* Email Method */}
          {emailMethod && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>{emailMethod.title}</CardTitle>
                {emailMethod.description && <CardDescription>{emailMethod.description}</CardDescription>}
              </CardHeader>
              <CardContent className="space-y-3">
                <a href={`mailto:${(emailMethod.config as EmailConfig).email_address}`} className="text-sm font-medium text-primary">
                  {(emailMethod.config as EmailConfig).email_address}
                </a>
                <p className="text-xs text-muted-foreground">{(emailMethod.config as EmailConfig).response_time}</p>
              </CardContent>
            </Card>
          )}

          {/* Ticket Method */}
          {ticketMethod && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>{ticketMethod.title}</CardTitle>
                {ticketMethod.description && <CardDescription>{ticketMethod.description}</CardDescription>}
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                {ticketMethod.description && <p>{ticketMethod.description}</p>}
                {(ticketMethod.config as TicketConfig).priority_queues.length > 0 && (
                  <>
                    <Separator />
                    <p className="text-xs uppercase tracking-wide">Priority queues</p>
                    <ul className="space-y-2 text-xs">
                      {(ticketMethod.config as TicketConfig).priority_queues.map((queue, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                          {queue.label} ({queue.response_time})
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </CardContent>
              {(ticketMethod.config as TicketConfig).dashboard_link && (
                <CardFooter>
                  <Button variant="ghost" asChild className="px-0 text-primary">
                    <Link to={(ticketMethod.config as TicketConfig).dashboard_link}>Open dashboard →</Link>
                  </Button>
                </CardFooter>
              )}
            </Card>
          )}

          {/* Phone Method */}
          {phoneMethod && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>{phoneMethod.title}</CardTitle>
                {phoneMethod.description && <CardDescription>{phoneMethod.description}</CardDescription>}
              </CardHeader>
              <CardContent className="space-y-3">
                <a href={`tel:${(phoneMethod.config as PhoneConfig).phone_number}`} className="text-sm font-medium text-primary">
                  {(phoneMethod.config as PhoneConfig).phone_number}
                </a>
                <p className="text-xs text-muted-foreground">{(phoneMethod.config as PhoneConfig).availability_text}</p>
              </CardContent>
            </Card>
          )}

          {/* Office Method */}
          {officeMethod && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>{officeMethod.title}</CardTitle>
                {officeMethod.description && <CardDescription>{officeMethod.description}</CardDescription>}
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-primary" />
                  <div>
                    {(officeMethod.config as OfficeConfig).address_line1}<br />
                    {(officeMethod.config as OfficeConfig).address_line2 && (
                      <>{(officeMethod.config as OfficeConfig).address_line2}<br /></>
                    )}
                    {(officeMethod.config as OfficeConfig).city}, {(officeMethod.config as OfficeConfig).state} {(officeMethod.config as OfficeConfig).postal_code}<br />
                    {(officeMethod.config as OfficeConfig).country}
                  </div>
                </div>
                {(officeMethod.config as OfficeConfig).appointment_required && (
                  <p className="text-xs text-muted-foreground mt-3">{(officeMethod.config as OfficeConfig).appointment_required}</p>
                )}
              </CardContent>
            </Card>
          )}

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
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
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
              {availability.map((schedule) => (
                <div key={schedule.id} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{schedule.day_of_week}</span>
                  <span className="font-medium">
                    {schedule.is_open ? schedule.hours_text : "Closed"}
                  </span>
                </div>
              ))}
              {emergencyText && (
                <>
                  <Separator className="my-4" />
                  <p className="text-xs text-muted-foreground">
                    <strong>Emergency support:</strong> {emergencyText}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
    </PublicLayout>
  );
}
