'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, withAuth } from '@/lib/auth-context';
import { counselorApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@/components/ui';
import { cn, getRiskLevelColor, formatDate } from '@/lib/utils';
import {
  ArrowLeft,
  User,
  Calendar,
  Brain,
  Microscope,
  Dna,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Save,
} from 'lucide-react';
import Link from 'next/link';
import type { HealthRecord } from '@/lib/types';

// Extended record type for this page
interface ExtendedHealthRecord extends HealthRecord {
  patient?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

function ReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  useAuth();
  
  const [record, setRecord] = useState<ExtendedHealthRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Review form state
  const [reviewStatus, setReviewStatus] = useState<'approved' | 'rejected' | 'needs_more_info'>('approved');
  const [notes, setNotes] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [overrideDiagnosis, setOverrideDiagnosis] = useState('');

  useEffect(() => {
    fetchRecord();
  }, [id]);

  const fetchRecord = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await counselorApi.getRecordById(id);
      
      if (response.success && response.record) {
        setRecord(response.record as ExtendedHealthRecord);
      } else {
        setError('Record not found');
      }
    } catch (err: unknown) {
      console.error('Failed to fetch record:', err);
      setError('Failed to load health record');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!record) return;
    
    try {
      setSubmitting(true);
      setError(null);

      const reviewData = {
        status: reviewStatus,
        notes,
        recommendations: recommendations.split('\n').filter(r => r.trim()),
        overrideDiagnosis: overrideDiagnosis || undefined,
        agreesWithAI: reviewStatus === 'approved' && !overrideDiagnosis,
      };

      await counselorApi.submitReview(record._id, reviewData);
      router.push('/dashboard/counselor/reviews?success=true');
    } catch (err: unknown) {
      console.error('Failed to submit review:', err);
      setError('Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="space-y-6">
        <Link
          href="/dashboard/counselor/reviews"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Reviews
        </Link>
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-400" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Record Not Found</h2>
            <p className="text-gray-600">{error || 'The requested health record could not be found.'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const patient = record.patient;
  const createdAtStr = record.createdAt ? new Date(record.createdAt).toISOString() : new Date().toISOString();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/counselor/reviews"
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Review Record #{record.recordNumber || record._id?.slice(-6)}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Submitted on {formatDate(createdAtStr)}
            </p>
          </div>
        </div>
        {record.prediction?.riskLevel && (
          <Badge className={cn('text-lg px-4 py-2', getRiskLevelColor(record.prediction.riskLevel))}>
            {record.prediction.riskLevel.toUpperCase()} RISK
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Record Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Patient Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Patient Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Patient Name</p>
                  <p className="font-medium">{patient?.firstName} {patient?.lastName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Age</p>
                  <p className="font-medium">{record.patientData?.ageYears || 'N/A'} years</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Gender</p>
                  <p className="font-medium capitalize">{record.patientData?.gender || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium text-sm">{patient?.email || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Prediction */}
          {record.prediction && (
            <Card className="border-blue-200 dark:border-blue-800">
              <CardHeader className="bg-blue-50 dark:bg-blue-900/20">
                <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                  <Brain className="h-5 w-5" />
                  AI Prediction
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-500">Diagnosis</p>
                    <p className="font-bold text-lg">{record.prediction.diagnosis || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Confidence</p>
                    <p className="font-bold text-lg">
                      {((record.prediction.confidence || 0) * 100).toFixed(0)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Risk Level</p>
                    <Badge className={cn('text-sm', getRiskLevelColor(record.prediction.riskLevel || 'low'))}>
                      {(record.prediction.riskLevel || 'low').toUpperCase()}
                    </Badge>
                  </div>
                </div>

                {record.prediction.geneAnalysis && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <Dna className="h-5 w-5 text-purple-600" />
                      <p className="text-sm font-medium">Gene Analysis</p>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Type</p>
                        <p className="font-medium">{record.prediction.geneAnalysis.type || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Affected Gene</p>
                        <p className="font-medium">{record.prediction.geneAnalysis.affectedGene || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Inheritance</p>
                        <p className="font-medium">{record.prediction.geneAnalysis.inheritance || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Lab Results */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Microscope className="h-5 w-5" />
                Lab Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">ALC Level</p>
                  <p className="font-medium">
                    {record.patientData?.labALCLevel !== undefined 
                      ? `${record.patientData.labALCLevel} cells/μL` 
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">IgG Level</p>
                  <p className="font-medium">
                    {record.patientData?.labIgGLevel !== undefined 
                      ? `${record.patientData.labIgGLevel} mg/dL` 
                      : 'N/A'}
                  </p>
                </div>
              </div>
              {record.patientData?.familyHistory && (
                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-400">
                    Family History: {record.patientData.familyHistory}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Review Form */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Submit Review</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Review Status */}
              <div>
                <label className="block text-sm font-medium mb-2">Review Decision</label>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setReviewStatus('approved')}
                    className={cn(
                      'w-full p-3 rounded-lg border-2 flex items-center gap-3 transition-all',
                      reviewStatus === 'approved'
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-green-300'
                    )}
                  >
                    <CheckCircle className={cn(
                      'h-5 w-5',
                      reviewStatus === 'approved' ? 'text-green-600' : 'text-gray-400'
                    )} />
                    <div className="text-left">
                      <p className="font-medium">Approve</p>
                      <p className="text-xs text-gray-500">AI prediction is correct</p>
                    </div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setReviewStatus('rejected')}
                    className={cn(
                      'w-full p-3 rounded-lg border-2 flex items-center gap-3 transition-all',
                      reviewStatus === 'rejected'
                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-red-300'
                    )}
                  >
                    <XCircle className={cn(
                      'h-5 w-5',
                      reviewStatus === 'rejected' ? 'text-red-600' : 'text-gray-400'
                    )} />
                    <div className="text-left">
                      <p className="font-medium">Override Diagnosis</p>
                      <p className="text-xs text-gray-500">AI prediction needs correction</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReviewStatus('needs_more_info')}
                    className={cn(
                      'w-full p-3 rounded-lg border-2 flex items-center gap-3 transition-all',
                      reviewStatus === 'needs_more_info'
                        ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-yellow-300'
                    )}
                  >
                    <AlertTriangle className={cn(
                      'h-5 w-5',
                      reviewStatus === 'needs_more_info' ? 'text-yellow-600' : 'text-gray-400'
                    )} />
                    <div className="text-left">
                      <p className="font-medium">Request More Info</p>
                      <p className="text-xs text-gray-500">Additional data needed</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Override Diagnosis (shown when rejected) */}
              {reviewStatus === 'rejected' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Corrected Diagnosis</label>
                  <input
                    type="text"
                    value={overrideDiagnosis}
                    onChange={(e) => setOverrideDiagnosis(e.target.value)}
                    placeholder="Enter the correct diagnosis"
                    className="w-full p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                  />
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium mb-2">Clinical Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter your clinical assessment and observations..."
                  rows={4}
                  className="w-full p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                />
              </div>

              {/* Recommendations */}
              <div>
                <label className="block text-sm font-medium mb-2">Recommendations (one per line)</label>
                <textarea
                  value={recommendations}
                  onChange={(e) => setRecommendations(e.target.value)}
                  placeholder="Enter recommendations for the patient..."
                  rows={3}
                  className="w-full p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <Button
                onClick={handleSubmitReview}
                disabled={submitting}
                className="w-full"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Submit Review
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default withAuth(ReviewDetailPage, ['counselor']);
