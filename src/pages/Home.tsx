import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Boxes,
  CircleCheck,
  Cpu,
  GaugeCircle,
  Layers3,
  Rocket,
  ServerCog,
  ShieldCheck,
  TimerReset,
  Wallet,
  Workflow,
} from "lucide-react";

import PublicLayout from "@/components/PublicLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BRAND_NAME } from "@/lib/brand";

const heroStats = [
  { label: "Deployments orchestrated", value: "42k" },
  { label: "Regions supported", value: "18" },
  { label: "Average provision time", value: "47s" },
];

const platformPillars = [
  {
    title: "Provision without friction",
    description:
      "Blueprint fleets, inject environment secrets, and enforce guardrails before workloads ever touch production.",
    icon: Rocket,
  },
  {
    title: "Operate with clarity",
    description:
      "Unified observability brings compute, storage, and container metrics into a single activity timeline.",
    icon: Activity,
  },
  {
    title: "Bill with confidence",
    description:
      "Wallet-based billing, hourly ledgers, and automated alerts keep finance teams ahead of spend.",
    icon: Wallet,
  },
];

const paasCapabilities = [
  {
    title: "Cluster automation",
    description: "Define high-availability clusters, set node pools, and track swarms with built-in health monitors.",
    icon: ServerCog,
    highlights: ["Multi-region support", "Node pool scaling", "Automated repair"],
  },
  {
    title: "Template marketplace",
    description: "Curate application templates, toggle availability per region, and expose secure defaults to customers.",
    icon: Boxes,
    highlights: ["Role-based visibility", "Versioned releases", "Runtime health checks"],
  },
  {
    title: "Ingress orchestration",
    description: "Manage Traefik routes, domains, certificates, and reserved ports from a single configuration pane.",
    icon: Workflow,
    highlights: ["Wildcard certificates", "S3-backed storage", "Zero-downtime rollouts"],
  },
];

const pricingTiers = [
  {
    name: "Launch",
    description: "For teams validating new services and prototypes.",
    price: "$0.012 / hour",
    features: ["2 vCPU equivalent", "4 GB memory", "120 GB block storage", "1 TB egress"],
  },
  {
    name: "Scale",
    description: "Production-ready capacity with reserved network throughput.",
    price: "$0.038 / hour",
    features: ["6 vCPU equivalent", "12 GB memory", "400 GB block storage", "4 TB egress"],
  },
  {
    name: "Enterprise",
    description: "Custom capacity pools with guaranteed support response times.",
    price: "Talk to us",
    features: ["Dedicated account team", "Bring-your-own-cloud", "SOC reporting", "24/7 live escalation"],
  },
];

const trustSignals = [
  { label: "99.99% uptime SLA", icon: ShieldCheck },
  { label: "Granular RBAC", icon: CircleCheck },
  { label: "Global audit trail", icon: GaugeCircle },
];

export default function Home() {
  return (
    <PublicLayout>
      <div className="bg-background">
        <section className="relative border-b" id="platform">
          <div className="mx-auto flex max-w-7xl flex-col gap-12 px-4 py-16 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:py-24 lg:px-8">
            <div className="space-y-6 text-left lg:w-1/2">
              <Badge variant="outline" className="w-fit items-center gap-2 text-xs uppercase tracking-wide">
                <TimerReset className="h-3 w-3" />
                Built for operators
              </Badge>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                {BRAND_NAME} gives you a single control plane for compute and platform automation
              </h1>
              <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
                Launch virtual machines, manage container swarms, and expose production-ready services without stitching together disconnected dashboards. Every action is logged, permissioned, and ready for audit.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <Button asChild size="lg">
                  <Link to="/register">
                    Open the console
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link to="/contact">Book a strategy session</Link>
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-6 pt-6 sm:grid-cols-3">
                {heroStats.map((stat) => (
                  <div key={stat.label} className="rounded-lg border border-border bg-muted/40 p-4">
                    <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
            <Card className="h-full w-full border border-border/80 bg-card/80 shadow-sm lg:w-1/2">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Operations snapshot</CardTitle>
                <CardDescription>Live telemetry from your infrastructure estate.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-border/80 bg-muted/30 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Deployments today</p>
                    <p className="text-xs text-muted-foreground">Across compute and container workloads</p>
                  </div>
                  <span className="text-2xl font-semibold">118</span>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border border-border/80 bg-muted/30 px-4 py-3">
                    <p className="text-sm font-medium">Healthy clusters</p>
                    <p className="mt-2 text-3xl font-semibold text-emerald-600">12</p>
                    <p className="text-xs text-muted-foreground">2 in maintenance window</p>
                  </div>
                  <div className="rounded-lg border border-border/80 bg-muted/30 px-4 py-3">
                    <p className="text-sm font-medium">Pending approvals</p>
                    <p className="mt-2 text-3xl font-semibold text-amber-600">5</p>
                    <p className="text-xs text-muted-foreground">Scaling requests awaiting review</p>
                  </div>
                </div>
                <Separator />
                <div className="space-y-3">
                  <p className="text-sm font-semibold">Recent activity</p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center justify-between">
                      <span className="flex items-center gap-2"><Layers3 className="h-4 w-4 text-primary" /> Template “Node API" published</span>
                      <span>2m ago</span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span className="flex items-center gap-2"><Cpu className="h-4 w-4 text-primary" /> Cluster compute expansion applied</span>
                      <span>12m ago</span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> Billing report synced</span>
                      <span>26m ago</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="border-b bg-muted/30" id="capabilities">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="space-y-4 text-center">
              <Badge variant="outline" className="mx-auto w-fit uppercase tracking-wide">
                End-to-end governance
              </Badge>
              <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
                Everything you need to run modern infrastructure
              </h2>
              <p className="mx-auto max-w-2xl text-sm text-muted-foreground sm:text-base">
                Provision compute, manage container platforms, and expose secure ingress with policy-driven automation.
              </p>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {platformPillars.map((pillar) => {
                const Icon = pillar.icon;
                return (
                  <Card key={pillar.title} className="h-full border border-border/80 bg-card/80 shadow-sm">
                    <CardHeader className="space-y-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted text-primary">
                        <Icon className="h-5 w-5" />
                      </span>
                      <CardTitle className="text-lg font-semibold text-foreground">{pillar.title}</CardTitle>
                      <CardDescription className="text-sm text-muted-foreground">
                        {pillar.description}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-b" id="paas">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[1fr,1.5fr] lg:items-start">
              <div className="space-y-4">
                <Badge variant="outline" className="w-fit uppercase tracking-wide">
                  Platform-as-a-Service
                </Badge>
                <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
                  Offer container platforms alongside compute
                </h2>
                <p className="text-sm text-muted-foreground sm:text-base">
                  Administrators define clusters, registries, plans, and templates in the admin console. Customers deploy from curated templates with hourly billing and automated ingress management.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {trustSignals.map(({ label, icon: Icon }) => (
                    <div key={label} className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
                      <Icon className="h-5 w-5 text-primary" />
                      <span className="text-sm font-medium text-foreground">{label}</span>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Button asChild>
                    <Link to="/paas">Explore the PaaS catalog</Link>
                  </Button>
                  <Button variant="ghost" asChild>
                    <Link to="/admin#paas">Configure in admin</Link>
                  </Button>
                </div>
              </div>
              <div className="grid gap-6">
                {paasCapabilities.map((capability) => {
                  const Icon = capability.icon;
                  return (
                    <Card key={capability.title} className="border border-border/80 bg-card/80 shadow-sm">
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted text-primary">
                            <Icon className="h-5 w-5" />
                          </span>
                          <div>
                            <CardTitle className="text-lg font-semibold text-foreground">
                              {capability.title}
                            </CardTitle>
                            <CardDescription className="text-sm text-muted-foreground">
                              {capability.description}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                          {capability.highlights.map((highlight) => (
                            <li key={highlight} className="flex items-center gap-2">
                              <CircleCheck className="h-4 w-4 text-primary" /> {highlight}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="border-b bg-muted/30" id="pricing">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="space-y-4 text-center">
              <Badge variant="outline" className="mx-auto w-fit uppercase tracking-wide">
                Transparent pricing
              </Badge>
              <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
                Predictable billing that scales with you
              </h2>
              <p className="mx-auto max-w-2xl text-sm text-muted-foreground sm:text-base">
                Mix and match compute and platform plans. Hourly billing keeps your ledger in sync with reality.
              </p>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {pricingTiers.map((tier) => (
                <Card key={tier.name} className="border border-border/80 bg-card/80 shadow-sm">
                  <CardHeader className="space-y-2">
                    <Badge variant="outline" className="w-fit uppercase tracking-wide">
                      {tier.name}
                    </Badge>
                    <CardTitle className="text-lg font-semibold text-foreground">{tier.price}</CardTitle>
                    <CardDescription>{tier.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      {tier.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2">
                          <CircleCheck className="h-4 w-4 text-primary" /> {feature}
                        </li>
                      ))}
                    </ul>
                    <Button className="mt-6 w-full" variant={tier.name === "Scale" ? "default" : "outline"}>
                      Talk to sales
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-background">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[1.1fr,0.9fr] lg:items-center">
              <div className="space-y-4">
                <Badge variant="outline" className="w-fit uppercase tracking-wide">
                  Built for teams
                </Badge>
                <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
                  Focus on shipping. We handle the orchestration.
                </h2>
                <p className="text-sm text-muted-foreground sm:text-base">
                  With {BRAND_NAME}, operations teams get the guardrails they demand, and developers stay in the fast lane. Role-based controls, activity feeds, and real-time notifications keep everyone on the same page.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                    <p className="text-sm font-semibold text-foreground">Audit-ready</p>
                    <p className="text-sm text-muted-foreground">Every action is captured with immutable timelines.</p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                    <p className="text-sm font-semibold text-foreground">Policy driven</p>
                    <p className="text-sm text-muted-foreground">Define approval flows and spend limits without writing scripts.</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button asChild>
                    <Link to="/support">Meet customer success</Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/faq">Read the FAQ</Link>
                  </Button>
                </div>
              </div>
              <Card className="border border-border/80 bg-card/80 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Command Center</CardTitle>
                  <CardDescription>Everything your team needs, available from one console.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      Incident response playbooks
                    </div>
                    <span className="text-xs text-muted-foreground">Live</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
                    <div className="flex items-center gap-3">
                      <ServerCog className="h-4 w-4 text-primary" />
                      Autoscaling guardrails
                    </div>
                    <span className="text-xs text-muted-foreground">Enabled</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
                    <div className="flex items-center gap-3">
                      <Workflow className="h-4 w-4 text-primary" />
                      Change approval workflows
                    </div>
                    <span className="text-xs text-muted-foreground">Policy 2.1</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
