'use client';

import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { Suspense } from 'react';

// Component that uses useSearchParams - must be wrapped in Suspense
function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('message') || 'An authentication error occurred';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
          <AlertCircle className="w-6 h-6 text-red-600" />
        </div>
        
        <div className="mt-4 text-center">
          <h1 className="text-xl font-semibold text-gray-900">Authentication Error</h1>
          <p className="mt-2 text-sm text-gray-600">{error}</p>
        </div>

        <div className="mt-6">
          <Link href="/">
            <Button className="w-full">
              Return to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

// Loading fallback component
function AuthErrorFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
          <AlertCircle className="w-6 h-6 text-red-600" />
        </div>
        
        <div className="mt-4 text-center">
          <h1 className="text-xl font-semibold text-gray-900">Authentication Error</h1>
          <p className="mt-2 text-sm text-gray-600">Loading error details...</p>
        </div>

        <div className="mt-6">
          <Link href="/">
            <Button className="w-full">
              Return to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AuthError() {
  return (
    <Suspense fallback={<AuthErrorFallback />}>
      <AuthErrorContent />
    </Suspense>
  );
}
