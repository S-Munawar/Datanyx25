'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldX, ArrowLeft, Home, LogIn } from 'lucide-react';
import { Button } from '@/components/ui';

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="mx-auto w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <ShieldX className="h-12 w-12 text-red-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-2">
            You don&apos;t have permission to access this page.
          </p>
          <p className="text-gray-500 text-sm">
            This page requires elevated privileges. If you believe this is an error, please contact your administrator.
          </p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => router.back()}
            variant="outline"
            className="w-full"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
          
          <Link href="/dashboard" className="block">
            <Button variant="outline" className="w-full">
              <Home className="h-4 w-4 mr-2" />
              Go to Dashboard
            </Button>
          </Link>
          
          <Link href="/login" className="block">
            <Button className="w-full">
              <LogIn className="h-4 w-4 mr-2" />
              Sign in with Different Account
            </Button>
          </Link>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Need help?{' '}
            <a href="mailto:support@immunodetect.com" className="text-blue-600 hover:underline">
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
