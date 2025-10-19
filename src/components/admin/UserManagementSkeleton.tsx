import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export const UserManagementSkeleton: React.FC = () => {
  return (
    <Card className="animate-in fade-in-0 duration-500">
      <CardHeader className="pb-4 animate-in slide-in-from-top-2 duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-6 w-32" />
          </div>
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 animate-in slide-in-from-left-2 duration-300 delay-100">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      </CardHeader>
      <CardContent className="animate-in slide-in-from-bottom-2 duration-300 delay-200">
        <div className="space-y-3">
          {/* Table header */}
          <div className="grid grid-cols-6 gap-4 pb-2 border-b animate-in slide-in-from-left-2 duration-300 delay-300">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-12" />
          </div>
          
          {/* Table rows */}
          {Array.from({ length: 5 }).map((_, index) => (
            <div 
              key={index} 
              className="grid grid-cols-6 gap-4 py-3 animate-in slide-in-from-left-2 duration-300"
              style={{ animationDelay: `${400 + (index * 100)}ms` }}
            >
              <div className="space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export const UserProfileSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4 animate-in slide-in-from-left-2 duration-300">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-px w-full" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div 
              key={index} 
              className="space-y-2 animate-in slide-in-from-left-2 duration-300"
              style={{ animationDelay: `${100 + (index * 50)}ms` }}
            >
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-5 w-24" />
            </div>
          ))}
        </div>
      </div>

      {/* Account Details */}
      <div className="space-y-4 animate-in slide-in-from-left-2 duration-300 delay-300">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-px w-full" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div 
              key={index} 
              className="space-y-2 animate-in slide-in-from-left-2 duration-300"
              style={{ animationDelay: `${400 + (index * 50)}ms` }}
            >
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
      </div>

      {/* Organizations */}
      <div className="space-y-4 animate-in slide-in-from-left-2 duration-300 delay-600">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-px w-full" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, index) => (
            <div 
              key={index} 
              className="flex items-center justify-between rounded-lg border border-border p-3 animate-in slide-in-from-left-2 duration-300"
              style={{ animationDelay: `${700 + (index * 100)}ms` }}
            >
              <div className="space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Activity Summary */}
      <div className="space-y-4 animate-in slide-in-from-left-2 duration-300 delay-900">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-px w-full" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div 
              key={index} 
              className="rounded-lg border border-border p-4 text-center animate-in slide-in-from-bottom-2 duration-300"
              style={{ animationDelay: `${1000 + (index * 100)}ms` }}
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-8 w-8 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};