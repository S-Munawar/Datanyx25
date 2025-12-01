'use client';

import { useEffect, useState } from 'react';
import { useAuth, withAuth } from '@/lib/auth-context';
import { counselorApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@/components/ui';
import { cn, getRiskLevelColor, formatDate } from '@/lib/utils';
import {
  Clock,
  CheckCircle,
  AlertTriangle,
  Eye,
  Loader2,
  Search,
  Filter,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';

interface PendingReview {
  id: string;
  _id?: string;
  recordNumber: string;
  patient: {
    firstName: string;
    lastName: string;
  };
  patientId?: {
    firstName: string;
    lastName: string;
  };
  prediction?: {
    diagnosis: string;
    confidence: number;
    riskLevel: string;
  };
  status: string;
  createdAt: string;
}

function CounselorReviewsPage() {
  useAuth();
  const [reviews, setReviews] = useState<PendingReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });

  useEffect(() => {
    fetchReviews();
  }, [pagination.page, riskFilter]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await counselorApi.getPendingReviews({
        page: pagination.page,
        limit: pagination.limit,
        riskLevel: riskFilter || undefined,
      });

      if (response.success && response.reviews) {
        const formattedReviews = response.reviews.map((r: any) => ({
          id: r._id || r.id || '',
          recordNumber: r.recordNumber || '',
          patient: r.patient || r.patientId || { firstName: 'Unknown', lastName: 'Patient' },
          prediction: r.prediction,
          status: r.status || 'pending',
          createdAt: r.createdAt || '',
        }));
        setReviews(formattedReviews);
        
        if (response.pagination) {
          setPagination(prev => ({
            ...prev,
            total: response.pagination.total,
            pages: response.pagination.pages,
          }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
      setError('Failed to load pending reviews');
    } finally {
      setLoading(false);
    }
  };

  const filteredReviews = searchTerm
    ? reviews.filter(r => 
        r.recordNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.patient?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.patient?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.prediction?.diagnosis?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : reviews;

  const highRiskCount = reviews.filter(r => r.prediction?.riskLevel === 'high').length;
  const moderateRiskCount = reviews.filter(r => r.prediction?.riskLevel === 'moderate').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/counselor"
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Review Queue</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Review and validate AI predictions for patient assessments
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-yellow-200 dark:border-yellow-800">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Pending</p>
              <p className="text-xl font-bold text-yellow-600">{pagination.total}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">High Risk</p>
              <p className="text-xl font-bold text-red-600">{highRiskCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 dark:border-orange-800">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Moderate Risk</p>
              <p className="text-xl font-bold text-orange-600">{moderateRiskCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by patient name, record number, or diagnosis..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <select 
                value={riskFilter}
                onChange={(e) => {
                  setRiskFilter(e.target.value);
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Risk Levels</option>
                <option value="high">High Risk</option>
                <option value="moderate">Moderate Risk</option>
                <option value="low">Low Risk</option>
              </select>
              <Button variant="outline" onClick={fetchReviews}>
                <Filter className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3 text-red-700 dark:text-red-400">
          <AlertTriangle className="h-5 w-5" />
          <span>{error}</span>
          <button
            onClick={fetchReviews}
            className="ml-auto text-red-600 hover:text-red-800 underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Reviews Table */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Reviews ({filteredReviews.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : filteredReviews.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p className="text-gray-500">No pending reviews. Great job!</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-gray-500 border-b dark:border-gray-700">
                      <th className="pb-3 font-medium">Record #</th>
                      <th className="pb-3 font-medium">Patient</th>
                      <th className="pb-3 font-medium">Submitted</th>
                      <th className="pb-3 font-medium">AI Prediction</th>
                      <th className="pb-3 font-medium">Confidence</th>
                      <th className="pb-3 font-medium">Risk Level</th>
                      <th className="pb-3 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReviews.map((review) => (
                      <tr key={review.id} className="border-b dark:border-gray-700 last:border-0">
                        <td className="py-4">
                          <span className="font-mono text-sm text-gray-600 dark:text-gray-400">
                            {review.recordNumber || 'N/A'}
                          </span>
                        </td>
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-sm font-medium">
                              {review.patient?.firstName?.[0] || ''}{review.patient?.lastName?.[0] || ''}
                            </div>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {review.patient?.firstName} {review.patient?.lastName}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 text-gray-600 dark:text-gray-400">
                          {formatDate(review.createdAt)}
                        </td>
                        <td className="py-4">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {review.prediction?.diagnosis || 'Pending'}
                          </span>
                        </td>
                        <td className="py-4">
                          {review.prediction?.confidence ? (
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-600 rounded-full"
                                  style={{ width: `${review.prediction.confidence * 100}%` }}
                                />
                              </div>
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {(review.prediction.confidence * 100).toFixed(0)}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="py-4">
                          {review.prediction?.riskLevel ? (
                            <Badge
                              className={cn(
                                'text-xs',
                                getRiskLevelColor(review.prediction.riskLevel)
                              )}
                            >
                              {review.prediction.riskLevel.toUpperCase()}
                            </Badge>
                          ) : (
                            <Badge variant="secondary">N/A</Badge>
                          )}
                        </td>
                        <td className="py-4">
                          <Link
                            href={`/dashboard/counselor/reviews/${review.id}`}
                            className="inline-flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                          >
                            <Eye className="h-4 w-4" />
                            Review
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t dark:border-gray-700">
                  <p className="text-sm text-gray-500">
                    Page {pagination.page} of {pagination.pages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page === 1}
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page === pagination.pages}
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default withAuth(CounselorReviewsPage, ['counselor']);
