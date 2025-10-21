import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
// Navigation provided by AppLayout

export default function ContainerDetail() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Container Details</h1>
          <p className="text-sm text-muted-foreground">ID: {id}</p>
        </div>
        <Button variant="ghost" asChild>
          <Link to="/containers">Back to Containers</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">This page will show container configuration, logs, metrics, and actions.</p>
          <p className="mt-2 text-sm text-muted-foreground">Wire API calls to load details based on the container ID.</p>
        </CardContent>
      </Card>
    </div>
  );
}