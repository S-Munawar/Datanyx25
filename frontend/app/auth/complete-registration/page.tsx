'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/lib/auth-context';
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent, Select } from '@/components/ui';
import { Dna, User, FileText, Building } from 'lucide-react';

const completeRegistrationSchema = z.object({
  role: z.enum(['patient', 'counselor', 'researcher']),
  licenseNumber: z.string().optional(),
  organization: z.string().optional(),
  specialization: z.string().optional(),
}).refine((data) => {
  if (data.role === 'counselor' || data.role === 'researcher') {
    return !!data.licenseNumber && data.licenseNumber.length > 0;
  }
  return true;
}, {
  message: 'License number is required for counselors and researchers',
  path: ['licenseNumber'],
});

type CompleteRegistrationFormData = z.infer<typeof completeRegistrationSchema>;

interface GoogleProfile {
  googleId: string;
  email: string;
  firstName: string;
  lastName: string;
  profilePicture: string;
}

function CompleteRegistrationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [googleProfile, setGoogleProfile] = useState<GoogleProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<CompleteRegistrationFormData>({
    resolver: zodResolver(completeRegistrationSchema),
    defaultValues: {
      role: 'patient',
    },
  });

  const selectedRole = watch('role');

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      try {
        const decoded = JSON.parse(atob(token));
        setGoogleProfile(decoded);
      } catch (err) {
        setError('Invalid registration token. Please try signing up again.');
      }
    } else {
      setError('No registration token found. Please try signing up again.');
    }
  }, [searchParams]);

  const onSubmit = async (data: CompleteRegistrationFormData) => {
    if (!googleProfile) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/complete-registration`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          googleProfile,
          role: data.role,
          licenseNumber: data.licenseNumber,
          profileData: {
            organization: data.organization,
            specialization: data.specialization,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Registration failed');
      }

      // Store tokens
      if (result.accessToken) {
        localStorage.setItem('accessToken', result.accessToken);
      }

      // Refresh user context to recognize authentication
      await refreshUser();

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (error && !googleProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">❌</span>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Registration Error</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <Link href="/login">
                <Button>Back to Login</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <Dna className="h-7 w-7 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">ImmunoDetect</span>
          </Link>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Complete Your Registration</CardTitle>
            <CardDescription className="text-center">
              Just a few more details to set up your account
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Google Profile Info */}
            {googleProfile && (
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                {googleProfile.profilePicture ? (
                  <img
                    src={googleProfile.profilePicture}
                    alt="Profile"
                    className="w-12 h-12 rounded-full"
                  />
                ) : (
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-blue-600" />
                  </div>
                )}
                <div>
                  <p className="font-medium text-gray-900">
                    {googleProfile.firstName} {googleProfile.lastName}
                  </p>
                  <p className="text-sm text-gray-500">{googleProfile.email}</p>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Select
                label="I am a"
                {...register('role')}
                options={[
                  { value: 'patient', label: 'Patient - Seeking diagnosis and care' },
                  { value: 'counselor', label: 'Genetic Counselor - Healthcare professional' },
                  { value: 'researcher', label: 'Researcher - Academic/clinical researcher' },
                ]}
                error={errors.role?.message}
              />

              {(selectedRole === 'counselor' || selectedRole === 'researcher') && (
                <>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
                    <strong>Note:</strong> {selectedRole === 'counselor' ? 'Genetic counselors' : 'Researchers'} require 
                    a valid license number to register.
                  </div>

                  <div className="relative">
                    <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="License Number"
                      className="pl-10"
                      {...register('licenseNumber')}
                      error={errors.licenseNumber?.message}
                    />
                  </div>

                  <div className="relative">
                    <Building className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Organization (optional)"
                      className="pl-10"
                      {...register('organization')}
                    />
                  </div>

                  <Input
                    placeholder="Specialization (optional)"
                    {...register('specialization')}
                  />
                </>
              )}

              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="terms"
                  className="mt-1 rounded border-gray-300"
                  required
                />
                <label htmlFor="terms" className="text-sm text-gray-600">
                  I agree to the{' '}
                  <Link href="/terms" className="text-blue-600 hover:underline">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="text-blue-600 hover:underline">
                    Privacy Policy
                  </Link>
                </label>
              </div>

              <Button type="submit" className="w-full" isLoading={isLoading}>
                Complete Registration
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-600 mt-4">
          Want to use a different account?{' '}
          <Link href="/login" className="text-blue-600 hover:underline font-medium">
            Start over
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function CompleteRegistrationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <CompleteRegistrationContent />
    </Suspense>
  );
}
