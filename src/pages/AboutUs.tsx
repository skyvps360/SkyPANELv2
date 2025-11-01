import { useQuery } from "@tanstack/react-query";
import {
  Award,
  Building2,
  Cpu,
  Globe,
  Handshake,
  Layers,
  Shield,
  Sparkles,
  Target,
  Users,
  Zap,
} from "lucide-react";

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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import api from "@/lib/api";
import { BRAND_NAME } from "@/lib/brand";

const values = [
  {
    title: "Reliability first",
    description:
      "Redundant networking, resilient storage, and observability are table stakes for every region we operate.",
    icon: Shield,
  },
  {
    title: "Developer delight",
    description:
      "Predictable APIs, CLI tooling, and dashboards tuned for busy operators keep teams in flow.",
    icon: Zap,
  },
  {
    title: "Transparent pricing",
    description:
      "Metered billing down to the hour with usage alerts and downloadable reports keeps finance teams confident.",
    icon: Award,
  },
  {
    title: "Global reach",
    description:
      "Latency-sensitive workloads run close to customers thanks to a growing set of strategic regions.",
    icon: Globe,
  },
  {
    title: "Human support",
    description:
      "Real engineers on-call 24/7 to help troubleshoot incidents, migrations, and architecture decisions.",
    icon: Users,
  },
  {
    title: "Security by design",
    description:
      "Hardening, compliance, and audit trails are woven into every layer—from SSH access to API tokens.",
    icon: Target,
  },
];

interface PlatformStats {
  users: { total: number; admins: number; regular: number };
  organizations: { total: number };
  vps: { total: number; active: number };
  containers: { total: number };
  support: { totalTickets: number; openTickets: number };
  plans: { vpsPlans: number; containerPlans: number };
  regions: { total: number };
  cacheExpiry: string;
}

const differentiators = [
  {
    title: "Opinionated automation",
    description:
      "Reusable stack scripts, GitOps-ready APIs, and granular access controls help teams scale without sprawl.",
    icon: Layers,
  },
  {
    title: "Finance-friendly tooling",
    description:
      "Shared wallets, granular usage exports, and proactive alerts keep engineering and finance aligned.",
    icon: Handshake,
  },
  {
    title: "Managed ecosystem",
    description:
      "Carefully vetted integrations with registries, observability platforms, and payment providers extend the platform without extra maintenance.",
    icon: Building2,
  },
];

const milestones = [
  {
    year: "2023",
    title: "Simplifying infrastructure",
    description:
      `We launched ${BRAND_NAME} with a vision to bring managed containers and compute into a single control plane.`,
  },
  {
    year: "2024",
    title: "Global expansion",
    description:
      "Rolled out multi-region networking, API keys, and SOC-aligned activity logging for enterprise customers.",
  },
  {
    year: "2025",
    title: "Automation first",
    description:
      "Introduced programmable themes, advanced billing insights, and a refined admin experience for large teams.",
  },
];

export default function AboutUs() {
  const { data: platformStats, isLoading, isError } = useQuery<PlatformStats>({
    queryKey: ["platform-stats"],
    queryFn: async () => {
      const response = await api.get<any>("/health/platform-stats");
      const { success, timestamp, ...stats } = response;
      void success;
      void timestamp;
      return stats as PlatformStats;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return (
    <PublicLayout>
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <PageIntro
          eyebrow="Who we are"
          title="The infrastructure platform teams actually enjoy using"
          description={`${BRAND_NAME} gives engineering, platform, and security teams a unified way to deploy containers, manage compute fleets, and understand spend—without losing the human support that growing companies need.`}
          align="center"
          actions={
            <>
              <Button asChild>
                <a href="#mission">Discover our mission</a>
              </Button>
              <Button variant="outline" asChild>
                <a href="#values">Read our values</a>
              </Button>
            </>
          }
        />

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Build faster
          </span>
          <span className="inline-flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" /> Stay secure
          </span>
          <span className="inline-flex items-center gap-2">
            <Cpu className="h-4 w-4 text-primary" /> Scale confidently
          </span>
        </div>

        <section id="mission" className="mt-16 grid gap-8 lg:grid-cols-[2fr,1fr]">
          <Card className="border border-border/80 bg-card/80 shadow-sm">
            <CardHeader>
              <CardTitle>Our mission</CardTitle>
              <CardDescription>
                Empower builders with reliable infrastructure that doesn’t require a dedicated operations team to unlock.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-6 text-muted-foreground">
              <p>
                We founded {BRAND_NAME} to bridge the gap between developer velocity and operational excellence. Traditional cloud platforms offer power at the cost of complexity. We believe you shouldn’t need a week of training—or professional services—to ship your next release.
              </p>
              <p>
                By pairing opinionated defaults with transparent controls, we help teams move from manual provisioning to scripted automation without losing visibility or governance.
              </p>
            </CardContent>
            <CardFooter className="flex flex-col gap-3 border-t border-border/80 bg-muted/40 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                "Our customers expect clarity. We ship features with documentation, metrics, and support ready on day one."
              </p>
              <div className="text-sm font-medium text-foreground">— The {BRAND_NAME} Team</div>
            </CardFooter>
          </Card>

          <Card className="border border-border/80 bg-card/80 shadow-sm">
            <CardHeader>
              <CardTitle>At a glance</CardTitle>
              <CardDescription>Numbers that show how customers rely on the platform today.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {isLoading ? (
                <>
                  {[1, 2, 3, 4, 5].map((index) => (
                    <div key={index} className="rounded-lg border border-border/80 bg-muted/30 p-4">
                      <Skeleton className="mb-2 h-7 w-20" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  ))}
                </>
              ) : isError || !platformStats ? (
                <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                  Unable to load platform statistics. Please try again later.
                </div>
              ) : (
                <>
                  <div className="rounded-lg border border-border/80 bg-muted/30 p-4">
                    <p className="text-2xl font-semibold text-foreground">{platformStats.users.total.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Total users</p>
                  </div>
                  <div className="rounded-lg border border-border/80 bg-muted/30 p-4">
                    <p className="text-2xl font-semibold text-foreground">{platformStats.organizations.total.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Organizations onboarded</p>
                  </div>
                  <div className="rounded-lg border border-border/80 bg-muted/30 p-4">
                    <p className="text-2xl font-semibold text-foreground">{platformStats.vps.active.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Active compute workloads</p>
                  </div>
                  <div className="rounded-lg border border-border/80 bg-muted/30 p-4">
                    <p className="text-2xl font-semibold text-foreground">{platformStats.containers.total.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Managed containers</p>
                  </div>
                  <div className="rounded-lg border border-border/80 bg-muted/30 p-4">
                    <p className="text-2xl font-semibold text-foreground">{platformStats.support.openTickets.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Active support conversations</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </section>

        <section id="values" className="mt-16 space-y-10">
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">Values that guide every release</h2>
            <p className="text-sm text-muted-foreground sm:text-base">
              These principles help us balance innovation with the trust our customers place in us.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {values.map((value) => {
              const Icon = value.icon;
              return (
                <Card key={value.title} className="border border-border/80 bg-card/80 shadow-sm">
                  <CardHeader className="flex flex-row items-start gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="space-y-1">
                      <CardTitle className="text-lg font-semibold text-foreground">{value.title}</CardTitle>
                      <CardDescription className="text-sm text-muted-foreground">
                        {value.description}
                      </CardDescription>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="mt-16 grid gap-8 lg:grid-cols-2">
          {differentiators.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title} className="border border-border/80 bg-card/80 shadow-sm">
                <CardHeader className="flex flex-row items-start gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-semibold text-foreground">{item.title}</CardTitle>
                    <CardDescription className="text-sm text-muted-foreground">
                      {item.description}
                    </CardDescription>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
          <Card className="border border-border/80 bg-card/80 shadow-sm">
            <CardHeader>
              <CardTitle>Join the team</CardTitle>
              <CardDescription>
                We’re building a remote-first company for people obsessed with reliability, DX, and customer trust.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>
                Our teams span product, engineering, customer success, and operations. We look for folks who love solving hard infrastructure problems with empathy for the humans behind every ticket.
              </p>
              <p>
                If that sounds like you, we’d love to talk.
              </p>
            </CardContent>
            <CardFooter>
              <Button asChild>
                <a href="#">View open roles</a>
              </Button>
            </CardFooter>
          </Card>
        </section>

        <section className="mt-16" id="timeline">
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">The journey so far</h2>
            <p className="text-sm text-muted-foreground sm:text-base">
              We’re just getting started. Here are a few moments that shaped the platform.
            </p>
          </div>
          <div className="mt-8 space-y-6">
            {milestones.map((milestone, index) => (
              <div
                key={milestone.year}
                className="rounded-2xl border border-border/80 bg-card/80 p-6 shadow-sm"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <Badge variant="outline" className="mb-2 w-fit uppercase tracking-wide">
                      {milestone.year}
                    </Badge>
                    <h3 className="text-lg font-semibold text-foreground">{milestone.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{milestone.description}</p>
                  </div>
                  {index < milestones.length - 1 ? (
                    <Separator orientation="vertical" className="hidden h-16 sm:block" />
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
