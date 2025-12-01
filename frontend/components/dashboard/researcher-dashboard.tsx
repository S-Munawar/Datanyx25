'use client';

import { useEffect, useState } from 'react';
import { useAuth, withAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@/components/ui';
import { cn, formatDate } from '@/lib/utils';
import {
  Database,
  FileText,
  BarChart3,
  Download,
  Search,
  Activity,
  BookOpen,
  FlaskConical,
  ArrowRight,
  Loader2,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  datasetsAccessed: number;
  analysesRun: number;
  activeProjects: number;
  publicationsCount: number;
  recentDatasets: { id: string; name: string; recordCount: number; lastAccessed: string }[];
  recentAnalyses: { id: string; name: string; status: string; createdAt: string }[];
}

function ResearcherDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await api.get('/researcher/dashboard');
        if (response.data.success) {
          setStats(response.data.stats);
        } else {
          throw new Error('Failed to fetch dashboard data');
        }
      } catch (err: any) {
        console.error('Failed to fetch researcher dashboard:', err);
        setError(err.response?.data?.message || 'Failed to load dashboard data. Please try again.');
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Research Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Welcome back, {user?.firstName || 'Researcher'}. Access datasets and run analyses.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/dashboard/researcher/datasets"
            className="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Database className="h-4 w-4" />
            Browse Datasets
          </Link>
          <Link
            href="/assessment"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FlaskConical className="h-4 w-4" />
            New Analysis
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Datasets Accessed</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stats?.datasetsAccessed || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Database className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Analyses Run</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">
                  {stats?.analysesRun || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Projects</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {stats?.activeProjects || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <FlaskConical className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Publications</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">
                  {stats?.publicationsCount || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Search className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Search Records</h3>
                <p className="text-sm text-gray-500">Query anonymized patient data</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Download className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Export Data</h3>
                <p className="text-sm text-gray-500">Download datasets for analysis</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">View Insights</h3>
                <p className="text-sm text-gray-500">Explore aggregate statistics</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Datasets */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Datasets</CardTitle>
            <Link
              href="/dashboard/researcher/datasets"
              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {stats?.recentDatasets && stats.recentDatasets.length > 0 ? (
              <div className="space-y-4">
                {stats.recentDatasets.map((dataset) => (
                  <div
                    key={dataset.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Database className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{dataset.name}</p>
                        <p className="text-sm text-gray-500">{dataset.recordCount} records</p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">
                      {formatDate(dataset.lastAccessed)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Database className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No datasets accessed yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Analyses */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Analyses</CardTitle>
            <Link
              href="/dashboard/researcher/analyses"
              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {stats?.recentAnalyses && stats.recentAnalyses.length > 0 ? (
              <div className="space-y-4">
                {stats.recentAnalyses.map((analysis) => (
                  <div
                    key={analysis.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <BarChart3 className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{analysis.name}</p>
                        <p className="text-sm text-gray-500">
                          {formatDate(analysis.createdAt)}
                        </p>
                      </div>
                    </div>
                    <Badge className={cn('text-xs', getStatusColor(analysis.status))}>
                      {analysis.status.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No analyses run yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Research Tools */}
      <Card>
        <CardHeader>
          <CardTitle>Research Tools</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/dashboard/researcher/analyses">
              <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2 w-full">
                <FileText className="h-6 w-6 text-blue-600" />
                <span>Generate Report</span>
              </Button>
            </Link>
            <Link href="/dashboard/researcher/analysis/new">
              <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2 w-full">
                <Activity className="h-6 w-6 text-green-600" />
                <span>Run ML Model</span>
              </Button>
            </Link>
            <Link href="/dashboard/researcher/datasets">
              <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2 w-full">
                <BarChart3 className="h-6 w-6 text-purple-600" />
                <span>Statistics</span>
              </Button>
            </Link>
            <Link href="/educator">
              <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2 w-full">
                <BookOpen className="h-6 w-6 text-orange-600" />
                <span>Documentation</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default withAuth(ResearcherDashboard, ['researcher']);
