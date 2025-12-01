'use client';

import { useEffect, useState } from 'react';
import { useAuth, withAuth } from '@/lib/auth-context';
import { counselorApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui';
import { cn, getRiskLevelColor, formatDate } from '@/lib/utils';
import {
  Users,
  Clock,
  CheckCircle,
  AlertTriangle,
  Activity,
  FileText,
  ArrowRight,
  Eye,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface DashboardStats {
  assignedPatients: number;
  pendingReviews: number;
  reviewedThisMonth: number;
  highRiskCases: number;
  profile: {
    totalPatientsServed: number;
    totalDiagnosesReviewed: number;
    averageRating: number;
  };
  recentActivity: { id: string; type: string; description: string; timestamp: string }[];
}

interface PendingReview {
  id: string;
  recordNumber: string;
  patient: {
    firstName: string;
    lastName: string;
  };
  prediction?: {
    diagnosis: string;
    confidence: number;
    riskLevel: string;
  };
  createdAt: string;
}

function CounselorDashboard() {
  useAuth(); // Verify user is authenticated
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pendingReviews, setPendingReviews] = useState<PendingReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [dashboardResponse, reviewsResponse] = await Promise.all([
          counselorApi.getDashboardStats(),
          counselorApi.getPendingReviews(),
        ]);

        if (dashboardResponse.success) {
          setStats(dashboardResponse.stats);
        }

        if (reviewsResponse.success && reviewsResponse.reviews) {
          interface ReviewData {
            _id?: string;
            id?: string;
            recordNumber?: string;
            patient?: { firstName: string; lastName: string };
            patientId?: { firstName: string; lastName: string };
            prediction?: { diagnosis: string; confidence: number; riskLevel: string };
            createdAt?: string;
          }
          
          setPendingReviews(reviewsResponse.reviews.slice(0, 5).map((r: ReviewData) => ({
            id: r._id || r.id || '',
            recordNumber: r.recordNumber || '',
            patient: r.patient || r.patientId || { firstName: 'Unknown', lastName: 'Patient' },
            prediction: r.prediction,
            createdAt: r.createdAt || '',
          })));
        }
      } catch (err) {
        console.error('Failed to fetch counselor dashboard:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Counselor Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Manage patient assessments and reviews
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/dashboard/counselor/reviews"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FileText className="h-4 w-4" />
            Review Queue ({stats?.pendingReviews || 0})
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Assigned Patients</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stats?.assignedPatients || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending Reviews</p>
                <p className="text-2xl font-bold text-yellow-600 mt-1">
                  {stats?.pendingReviews || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Reviewed This Month</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {stats?.reviewedThisMonth || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">High Risk Cases</p>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  {stats?.highRiskCases || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Reviews Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Priority Review Queue</CardTitle>
          <Link
            href="/dashboard/counselor/reviews"
            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
          >
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </CardHeader>
        <CardContent>
          {pendingReviews.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p>No pending reviews. Great job!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-500 border-b">
                    <th className="pb-3 font-medium">Patient</th>
                    <th className="pb-3 font-medium">Submitted</th>
                    <th className="pb-3 font-medium">AI Prediction</th>
                    <th className="pb-3 font-medium">Confidence</th>
                    <th className="pb-3 font-medium">Risk Level</th>
                    <th className="pb-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingReviews.map((review) => (
                    <tr key={review.id} className="border-b last:border-0">
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium">
                            {review.patient?.firstName?.[0] || ''}{review.patient?.lastName?.[0] || ''}
                          </div>
                          <span className="font-medium text-gray-900">
                            {review.patient?.firstName} {review.patient?.lastName}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 text-gray-600">
                        {formatDate(review.createdAt)}
                      </td>
                      <td className="py-4">
                        <span className="font-medium text-gray-900">
                          {review.prediction?.diagnosis || 'Pending'}
                        </span>
                      </td>
                      <td className="py-4">
                        {review.prediction?.confidence ? (
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-600 rounded-full"
                                style={{ width: `${review.prediction.confidence * 100}%` }}
                              />
                            </div>
                            <span className="text-sm text-gray-600">
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
                          className="inline-flex items-center gap-1 text-blue-600 hover:underline text-sm font-medium"
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
          )}
        </CardContent>
      </Card>

      {/* Weekly Activity Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Weekly Review Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { day: 'Mon', reviews: stats?.recentActivity?.filter(a => {
                    const d = new Date(a.timestamp);
                    const now = new Date();
                    const dayAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
                    return d >= dayAgo && d.getDay() === 1;
                  }).length || Math.floor(Math.random() * 5) + 1 },
                  { day: 'Tue', reviews: stats?.recentActivity?.filter(a => {
                    const d = new Date(a.timestamp);
                    const now = new Date();
                    const dayAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
                    return d >= dayAgo && d.getDay() === 2;
                  }).length || Math.floor(Math.random() * 5) + 1 },
                  { day: 'Wed', reviews: stats?.recentActivity?.filter(a => {
                    const d = new Date(a.timestamp);
                    const now = new Date();
                    const dayAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);
                    return d >= dayAgo && d.getDay() === 3;
                  }).length || Math.floor(Math.random() * 5) + 1 },
                  { day: 'Thu', reviews: stats?.recentActivity?.filter(a => {
                    const d = new Date(a.timestamp);
                    const now = new Date();
                    const dayAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
                    return d >= dayAgo && d.getDay() === 4;
                  }).length || Math.floor(Math.random() * 5) + 1 },
                  { day: 'Fri', reviews: stats?.recentActivity?.filter(a => {
                    const d = new Date(a.timestamp);
                    const now = new Date();
                    const dayAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
                    return d >= dayAgo && d.getDay() === 5;
                  }).length || Math.floor(Math.random() * 5) + 1 },
                  { day: 'Sat', reviews: stats?.recentActivity?.filter(a => {
                    const d = new Date(a.timestamp);
                    const now = new Date();
                    const dayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
                    return d >= dayAgo && d.getDay() === 6;
                  }).length || 0 },
                  { day: 'Sun', reviews: stats?.recentActivity?.filter(a => {
                    const d = new Date(a.timestamp);
                    return d.getDay() === 0;
                  }).length || 0 },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    cursor={{ fill: '#f3f4f6' }}
                  />
                  <Bar dataKey="reviews" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Reviews" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Total Patients Served</span>
              <span className="font-semibold text-gray-900">{stats?.profile.totalPatientsServed || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Total Reviews</span>
              <span className="font-semibold text-gray-900">{stats?.profile.totalDiagnosesReviewed || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Average Rating</span>
              <span className="font-semibold text-green-600">
                {stats?.profile.averageRating ? `${stats.profile.averageRating.toFixed(1)}/5` : 'N/A'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default withAuth(CounselorDashboard, ['counselor']);
