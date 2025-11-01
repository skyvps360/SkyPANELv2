import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Mail } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (!response.ok) {
        throw new Error('Failed to process password reset request');
      }

      await response.json();
      toast.success('Reset code has been sent to your email');
      setSubmitted(true);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-4 text-sm">
          <Link to="/" className="text-muted-foreground hover:text-primary/80">
            ← Back to home
          </Link>
        </div>
        <Card className="shadow-lg">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Mail className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl font-semibold">Reset your password</CardTitle>
              <CardDescription>
                {submitted
                  ? 'Check your email for the reset code and instructions'
                  : `Enter your email address and we'll send you a reset code and link to choose a new password.`}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            {!submitted ? (
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="email">Email address</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      placeholder="Enter your email"
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                      Sending reset link…
                    </span>
                  ) : (
                    'Send reset link'
                  )}
                </Button>
              </form>
            ) : (
              <div className="space-y-6 text-center">
                <p className="text-sm text-muted-foreground">
                  We've sent an 8-digit reset code to <strong>{email}</strong>. Please check your email
                  (including spam folder). The code expires in one hour.
                </p>
                <Link to="/reset-password">
                  <Button className="w-full">
                    Go to reset password page
                  </Button>
                </Link>
                <Button
                  onClick={() => {
                    setSubmitted(false);
                    setEmail('');
                  }}
                  variant="outline"
                  className="w-full"
                >
                  Try another email
                </Button>
              </div>
            )}

            <div className="mt-6 text-center text-sm text-muted-foreground">
              Remember your password?{' '}
              <Link to="/login" className="font-medium text-primary hover:text-primary/80">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
