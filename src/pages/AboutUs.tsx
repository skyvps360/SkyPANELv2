import { Link } from "react-router-dom";
import { Server, Users, Shield, Zap, Globe, Award } from "lucide-react";
import { BRAND_NAME } from "../lib/brand";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AboutUs() {
  return (
    <div className="container mx-auto max-w-6xl py-12 px-4">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
          About {BRAND_NAME}
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          We're on a mission to make cloud infrastructure accessible, affordable, and easy to use for everyone.
        </p>
      </div>

      {/* Mission Statement */}
      <Card className="mb-12">
        <CardContent className="pt-6">
          <h2 className="text-2xl font-semibold text-foreground mb-4">Our Mission</h2>
          <p className="text-muted-foreground leading-relaxed">
            {BRAND_NAME} was founded with a simple vision: to democratize access to enterprise-grade cloud infrastructure. We believe that every developer, startup, and business should have access to powerful, reliable, and affordable cloud services without the complexity and high costs typically associated with cloud platforms.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-4">
            By partnering with leading infrastructure providers and focusing on simplicity and transparency, we've created a platform that makes deploying and managing cloud resources as easy as it should be.
          </p>
        </CardContent>
      </Card>

      {/* Core Values */}
      <div className="mb-16">
        <h2 className="text-3xl font-semibold text-foreground text-center mb-8">Our Core Values</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <Shield className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Reliability</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                We partner with top-tier infrastructure providers to ensure 99.9% uptime and maximum reliability for your mission-critical applications.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Zap className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Simplicity</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Complex cloud platforms shouldn't be hard to use. We've designed our interface to be intuitive and straightforward, so you can focus on building, not configuring.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Award className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Transparency</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                No hidden fees, no surprise charges. Our pricing is simple and transparent with hourly billing that shows exactly what you're paying for.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Globe className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Global Reach</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Deploy your applications closer to your users with data centers across North America, Europe, and Asia.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Server className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Powered by enterprise-grade hardware and optimized infrastructure to deliver the performance your applications demand.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Users className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Support</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Our dedicated support team is available 24/7 to help you succeed with quick response times and expert assistance.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* What We Offer */}
      <div className="mb-16">
        <h2 className="text-3xl font-semibold text-foreground text-center mb-8">What We Offer</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>VPS Hosting</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Full-featured virtual private servers with dedicated resources, root access, and your choice of Linux distributions. Perfect for websites, applications, and development environments.
              </p>
              <Button variant="link" asChild className="px-0">
                <Link to="/dedicated-servers">Learn more about VPS →</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Container Hosting</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Deploy Docker containers with ease. Ideal for microservices, modern applications, and cloud-native development with instant scaling and deployment.
              </p>
              <Button variant="link" asChild className="px-0">
                <Link to="/containers-page">Learn more about Containers →</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Managed Services</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Automated backups, monitoring, security updates, and more. Focus on your business while we handle the infrastructure management.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Developer Tools</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Full API access, CLI tools, and integrations. Automate your infrastructure and integrate with your existing workflows seamlessly.
              </p>
              <Button variant="link" asChild className="px-0">
                <Link to="/api-docs-public">View API Documentation →</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Statistics */}
      <div className="bg-primary/5 rounded-lg p-8 mb-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-4xl font-bold text-primary mb-2">99.9%</div>
            <div className="text-muted-foreground">Uptime SLA</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-primary mb-2">24/7</div>
            <div className="text-muted-foreground">Support Available</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-primary mb-2">15+</div>
            <div className="text-muted-foreground">Data Centers</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-primary mb-2">1000s</div>
            <div className="text-muted-foreground">Happy Customers</div>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
        <CardContent className="text-center py-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">Ready to Get Started?</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of developers and businesses who trust {BRAND_NAME} for their cloud infrastructure needs.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button size="lg" asChild>
              <Link to="/register">Create Free Account</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/contact">Contact Sales</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
