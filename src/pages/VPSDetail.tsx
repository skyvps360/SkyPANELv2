import React from 'react';
import { useParams, Link } from 'react-router-dom';
// Navigation provided by AppLayout

export default function VPSDetail() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">VPS Instance</h1>
            <p className="text-sm text-gray-500">ID: {id}</p>
          </div>
          <Link to="/vps" className="text-blue-600">Back to VPS</Link>
        </div>

         <div className="bg-white shadow sm:rounded-lg p-6">
           <p className="text-gray-600">This page will show VPS details, metrics, and actions (reboot, resize, etc.).</p>
           <p className="mt-2 text-sm text-gray-500">Wire Linode API calls to load details without exposing provider branding.</p>
         </div>
      </div>
    </div>
  );
}