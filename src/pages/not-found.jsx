import React from 'react';
import { Link } from 'wouter';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-destructive rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="text-white w-8 h-8" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Page Not Found</h1>
        <p className="text-gray-600 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        
        <Link href="/">
          <Button className="bg-primary hover:bg-primary-dark text-white">
            Go Home
          </Button>
        </Link>
      </div>
    </div>
  );
}