import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// Navigation provided by AppLayout

export default function ContainerDetail() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Container Details</h1>
            <p className="text-sm text-gray-500">ID: {id}</p>
          </div>
          <Link to="/containers" className="text-blue-600">Back to Containers</Link>
        </div>

        <div className="bg-white shadow sm:rounded-lg p-6">
          <p className="text-gray-600">This page will show container configuration, logs, metrics, and actions.</p>
          <p className="mt-2 text-sm text-gray-500">Wire API calls to load details based on the container ID.</p>
        </div>
      </div>
    </div>
  );
}