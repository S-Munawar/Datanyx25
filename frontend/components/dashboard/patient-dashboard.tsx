'use client';

import { useEffect, useState } from 'react';
import { useAuth, withAuth } from '@/lib/auth-context';
import { healthRecordApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui';
import { cn, getRiskLevelColor, formatDate } from '@/lib/utils';
import {
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  Activity,
  Calendar,
  TrendingUp,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import type { HealthRecord as GlobalHealthRecord } from '@/lib/types';

interface LocalRecord {
  id: string;
  recordNumber: string;
  status: string;
  prediction?: {
    diagnosis: string;
    confidence: number;
    riskLevel: string;
  };
  createdAt: string;
}

interface DashboardStats {
  totalRecords: number;
  pendingReviews: number;
  completedAssessments: number;
  upcomingAppointments: number;
}

function PatientDashboard() {
  const { user } = useAuth();
  const [records, setRecords] = useState<LocalRecord[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalRecords: 0,
    pendingReviews: 0,
    completedAssessments: 0,
    upcomingAppointments: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch health records
        const response = await healthRecordApi.getAll({ limit: 5 });
        
        if (response.success && response.records) {
          setRecords(response.records.map((r: GlobalHealthRecord) => ({
            id: r._id || '',
            recordNumber: r.recordNumber || `Record ${r._id?.slice(-4)}`,
            status: r.status || 'pending',
            prediction: r.prediction ? {
              diagnosis: r.prediction.diagnosis || '',
              confidence: r.prediction.confidence || 0,
              riskLevel: r.prediction.riskLevel || 'low',
            } : undefined,
            createdAt: r.createdAt?.toString() || '',
          })));
          
          // Calculate stats from records
          const allRecordsResponse = await healthRecordApi.getAll({ limit: 100 });
          if (allRecordsResponse.success && allRecordsResponse.records) {
            const allRecords = allRecordsResponse.records;
            setStats({
              totalRecords: allRecords.length,
              pendingReviews: allRecords.filter((r: GlobalHealthRecord) => r.status === 'submitted' || r.status === 'under_review').length,
              completedAssessments: allRecords.filter((r: GlobalHealthRecord) => r.status === 'reviewed').length,
              upcomingAppointments: 0, // Would need separate API for appointments
            });
          }
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
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

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.firstName}!
          </h1>
          <p className="text-gray-600 mt-1">
            Here&apos;s an overview of your immunodeficiency assessments
          </p>
        </div>
        <Link
          href="/assessment"
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <FileText className="h-4 w-4" />
          New Assessment
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Records</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stats.totalRecords}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-blue-600" />
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
                  {stats.pendingReviews}
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
                <p className="text-sm text-gray-500">Completed</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {stats.completedAssessments}
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
                <p className="text-sm text-gray-500">Appointments</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">
                  {stats.upcomingAppointments}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Predictions */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent AI Predictions</CardTitle>
              <Link
                href="/dashboard/results"
                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
              >
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="text-center text-red-600 py-4">{error}</div>
              )}
              {!error && records.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No health records yet.</p>
                  <p className="text-sm mt-1">Submit your first assessment to get started.</p>
                </div>
              )}
              <div className="space-y-4">
                {records.filter(r => r.prediction).map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-lg flex items-center justify-center',
                          record.prediction?.riskLevel === 'high'
                            ? 'bg-red-100'
                            : record.prediction?.riskLevel === 'moderate'
                            ? 'bg-yellow-100'
                            : 'bg-green-100'
                        )}
                      >
                        <Activity
                          className={cn(
                            'h-5 w-5',
                            record.prediction?.riskLevel === 'high'
                              ? 'text-red-600'
                              : record.prediction?.riskLevel === 'moderate'
                              ? 'text-yellow-600'
                              : 'text-green-600'
                          )}
                        />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {record.prediction?.diagnosis || 'Pending Analysis'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatDate(record.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {record.prediction?.confidence 
                            ? `${(record.prediction.confidence * 100).toFixed(0)}% confidence`
                            : 'N/A'}
                        </p>
                        <Badge
                          variant={
                            record.status === 'reviewed'
                              ? 'success'
                              : 'warning'
                          }
                          className="mt-1"
                        >
                          {record.status}
                        </Badge>
                      </div>
                      {record.prediction?.riskLevel && (
                        <Badge
                          className={cn(
                            'text-xs',
                            getRiskLevelColor(record.prediction.riskLevel)
                          )}
                        >
                          {record.prediction.riskLevel.toUpperCase()}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link
                href="/dashboard/records/new"
                className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <FileText className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-700">
                  Submit New Health Data
                </span>
              </Link>
              <Link
                href="/dashboard/records"
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Clock className="h-5 w-5 text-gray-600" />
                <span className="font-medium text-gray-700">
                  View Pending Reviews
                </span>
              </Link>
              <Link
                href="/dashboard/settings"
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <TrendingUp className="h-5 w-5 text-gray-600" />
                <span className="font-medium text-gray-700">
                  Update Profile
                </span>
              </Link>
            </CardContent>
          </Card>

          {/* Health Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Important Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                If you experience frequent infections, unexplained fevers, or
                other concerning symptoms, please consult with your healthcare
                provider immediately.
              </p>
              <p className="text-sm text-gray-600 mt-3">
                Our AI predictions are meant to assist, not replace,
                professional medical diagnosis.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default withAuth(PatientDashboard, ['patient']);
