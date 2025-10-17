import { Link } from 'react-router-dom';
import { Container, Server, Shield, Zap, ArrowRight } from 'lucide-react';
import { BRAND_NAME } from '../lib/brand';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function Home() {
  const features = [
    {
      icon: Container,
      title: 'Container Management',
      description: 'Deploy, scale, and manage Docker containers with ease across multiple cloud providers.'
    },
    {
      icon: Server,
      title: 'VPS Hosting',
      description: 'Reliable virtual private servers with competitive pricing and instant deployment.'
    },
    {
      icon: Shield,
      title: 'Enterprise Security',
      description: 'Advanced security features including SSL certificates, firewalls, and monitoring.'
    },
    {
      icon: Zap,
      title: 'High Performance',
      description: 'Optimized infrastructure for maximum performance and minimal latency.'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Server className="h-8 w-8 text-primary" />
              <span className="ml-2 text-xl font-bold">{BRAND_NAME}</span>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" asChild>
                <Link to="/login">Sign in</Link>
              </Button>
              <Button asChild>
                <Link to="/register">Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-background to-muted">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Modern Cloud &amp; Container
              <span className="text-primary"> Management</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Deploy, scale, and manage your applications with our powerful VPS hosting platform
              and container orchestration. Built for developers, trusted by enterprises.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link to="/register">
                  Sign Up Today
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/login">Sign In</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything you need to scale
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              From container orchestration to VPS hosting, we provide all the tools 
              you need to build and scale your applications.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index}>
                <CardContent className="pt-6 text-center">
                  <div className="mx-auto h-16 w-16 bg-primary/10 rounded-xl flex items-center justify-center mb-6">
                    <feature.icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
              Ready to get started?
            </h2>
            <p className="text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
              {`Join thousands of developers who trust ${BRAND_NAME} for their infrastructure needs.`}
            </p>
            <Button size="lg" variant="secondary" asChild>
              <Link to="/register">
                Sign Up Today
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-muted/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Server className="h-6 w-6 text-primary" />
              <span className="ml-2 text-lg font-bold">{BRAND_NAME}</span>
            </div>
            <p className="text-muted-foreground text-sm">
              {`© 2025 ${BRAND_NAME}. All rights reserved.`}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}