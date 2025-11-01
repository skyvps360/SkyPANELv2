import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, Loader2, MapPin, Send } from "lucide-react";
import { toast } from "sonner";

import PublicLayout from "@/components/PublicLayout";
import { PageIntro } from "@/components/marketing/PageIntro";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import type {
  ContactConfig,
  EmailConfig,
  TicketConfig,
  PhoneConfig,
  OfficeConfig,
} from "@/types/contact";
import { BRAND_NAME } from "@/lib/brand";

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

const DEFAULT_EMERGENCY_TEXT =
  "Available 24/7 for customers with enterprise SLAs. Call the hotline in your runbook for immediate response.";

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

    void fetchContactConfig();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) {
        let errorMessage = data.error || "Failed to send message.";
        if (Array.isArray(data.errors) && data.errors.length > 0) {
          errorMessage = data.errors
            .map((err: { msg?: string }) => err?.msg || "Validation error")
            .join(", ");
        }
        throw new Error(errorMessage);
      }
      toast.success("Message sent successfully! We'll get back to you soon.");
      setFormData({ name: "", email: "", subject: "", category: "", message: "" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to send message.");
    }
    setIsSubmitting(false);
  };

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormData((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const categories =
    contactConfig?.categories
      .filter((category) => category.is_active)
      .sort((a, b) => a.display_order - b.display_order) || DEFAULT_CATEGORIES;

  const emailMethod =
    contactConfig?.methods.email?.is_active ? contactConfig.methods.email : null;
  const ticketMethod =
    contactConfig?.methods.ticket?.is_active ? contactConfig.methods.ticket : null;
  const phoneMethod =
    contactConfig?.methods.phone?.is_active ? contactConfig.methods.phone : null;
  const officeMethod =
    contactConfig?.methods.office?.is_active ? contactConfig.methods.office : null;

  const availability =
    contactConfig?.availability.sort((a, b) => a.display_order - b.display_order) ||
    DEFAULT_AVAILABILITY;
  const emergencyText =
    contactConfig?.emergency_support_text || DEFAULT_EMERGENCY_TEXT;

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="flex min-h-[60vh] items-center justify-center px-4 py-24">
          <div className="text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
            <p className="mt-4 text-sm text-muted-foreground">
              Loading contact preferences...
            </p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <PageIntro
          eyebrow="How can we help?"
          title={`Talk with the ${BRAND_NAME} team`}
          description="Whether you’re evaluating the platform, planning a migration, or managing an incident, we respond quickly—and with real engineers."
          align="center"
          actions={
            <Button variant="outline" asChild>
              <Link to="/support">Visit the help center</Link>
            </Button>
          }
        />

        <div className="mt-12 grid gap-8 lg:grid-cols-3">
          <div className="space-y-6">
            {emailMethod ? (
              <Card className="border border-border/80 bg-card/80 shadow-sm">
                <CardHeader>
                  <CardTitle>{emailMethod.title}</CardTitle>
                  {emailMethod.description ? (
                    <CardDescription>{emailMethod.description}</CardDescription>
                  ) : null}
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <a
                    href={`mailto:${(emailMethod.config as EmailConfig).email_address}`}
                    className="font-medium text-primary"
                  >
                    {(emailMethod.config as EmailConfig).email_address}
                  </a>
                  <p className="text-xs text-muted-foreground">
                    {(emailMethod.config as EmailConfig).response_time}
                  </p>
                </CardContent>
              </Card>
            ) : null}

            {ticketMethod ? (
              <Card className="border border-border/80 bg-card/80 shadow-sm">
                <CardHeader>
                  <CardTitle>{ticketMethod.title}</CardTitle>
                  {ticketMethod.description ? (
                    <CardDescription>{ticketMethod.description}</CardDescription>
                  ) : null}
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  {(ticketMethod.config as TicketConfig).priority_queues.length > 0 ? (
                    <div className="space-y-2">
                      <Separator />
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Priority queues
                      </p>
                      <ul className="space-y-2 text-xs">
                        {(ticketMethod.config as TicketConfig).priority_queues.map((queue, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <Badge variant="outline" className="mt-0.5">
                              {queue.level}
                            </Badge>
                            <div>
                              <p className="font-medium text-foreground">
                                {queue.description}
                              </p>
                              <p className="text-muted-foreground">
                                Response in {queue.response_time}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full" asChild>
                    <Link to="/support">View tickets</Link>
                  </Button>
                </CardFooter>
              </Card>
            ) : null}

            {phoneMethod ? (
              <Card className="border border-border/80 bg-card/80 shadow-sm">
                <CardHeader>
                  <CardTitle>{phoneMethod.title}</CardTitle>
                  {phoneMethod.description ? (
                    <CardDescription>{phoneMethod.description}</CardDescription>
                  ) : null}
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p className="text-base font-semibold text-foreground">
                    {(phoneMethod.config as PhoneConfig).phone_number}
                  </p>
                  <p>{(phoneMethod.config as PhoneConfig).availability}</p>
                  <p>{(phoneMethod.config as PhoneConfig).notes}</p>
                </CardContent>
              </Card>
            ) : null}

            {officeMethod ? (
              <Card className="border border-border/80 bg-card/80 shadow-sm">
                <CardHeader>
                  <CardTitle>{officeMethod.title}</CardTitle>
                  {officeMethod.description ? (
                    <CardDescription>{officeMethod.description}</CardDescription>
                  ) : null}
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-1 h-4 w-4 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">
                        {(officeMethod.config as OfficeConfig).address}
                      </p>
                      <p>{(officeMethod.config as OfficeConfig).hours}</p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-muted/30 px-4 py-3 text-xs">
                    {(officeMethod.config as OfficeConfig).notes}
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>

          <Card className="lg:col-span-2 border border-border/80 bg-card/80 shadow-sm">
            <CardHeader>
              <CardTitle>Send us a message</CardTitle>
              <CardDescription>
                Share a few details and we’ll route your request to the right specialist.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-6" onSubmit={handleSubmit}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Your full name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="you@company.com"
                      required
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      placeholder="Let us know what you need"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Topic</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, category: value }))
                      }
                    >
                      <SelectTrigger id="category">
                        <SelectValue placeholder="Choose a topic" />
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
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">How can we help?</Label>
                  <Textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Share as much context as you can."
                    rows={6}
                    required
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                  <p>
                    We reply within 1 hour during SLA windows. Outside of hours we’ll respond as soon as we’re back online.
                  </p>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Sending
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        Send message <Send className="h-4 w-4" />
                      </span>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <section className="mt-12 grid gap-8 lg:grid-cols-[2fr,1fr]">
          <Card className="border border-border/80 bg-card/80 shadow-sm">
            <CardHeader>
              <CardTitle>Availability</CardTitle>
              <CardDescription>
                Our customer success team monitors multiple channels to keep response times low.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {availability.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-4 py-3"
                >
                  <span className="text-sm font-medium text-foreground">
                    {entry.day_of_week}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {entry.is_open ? entry.hours_text : "Closed"}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border border-border/80 bg-card/80 shadow-sm">
            <CardHeader>
              <CardTitle>Emergency support</CardTitle>
              <CardDescription>
                For customers with premium SLAs.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-primary" />
                <span>Available 24/7</span>
              </div>
              <p>{emergencyText}</p>
              <p>
                Need to escalate? Call the number in your runbook or open a P1 ticket and our team will call you back immediately.
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    </PublicLayout>
  );
}
