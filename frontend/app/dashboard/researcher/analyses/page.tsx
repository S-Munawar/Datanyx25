'use client';

import { useEffect, useState } from 'react';
import { useAuth, withAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@/components/ui';
import { cn, formatDate } from '@/lib/utils';
import {
  BarChart3,
  Search,
  Filter,
  ArrowLeft,
  Play,
  Eye,
  Loader2,
  AlertTriangle,
  Calendar,
  Clock,
  FlaskConical,
  Plus,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';

interface Analysis {
  id: string;
  name: string;
  description: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  datasetName: string;
  createdAt: string;
  completedAt?: string;
  duration?: number;
  resultsSummary?: string;
}

function AnalysesPage() {
  useAuth();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchAnalyses();
  }, [statusFilter]);

  const fetchAnalyses = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get('/researcher/analyses', {
        params: { status: statusFilter || undefined }
      });
      
      if (response.data.success) {
        // Map API response to Analysis interface
        const mappedAnalyses = response.data.analyses.map((a: any) => ({
          id: a.id,
          name: a.name,
          description: a.description || `${a.type} analysis on dataset`,
          type: a.type || 'statistical',
          status: a.status || 'completed',
          datasetName: a.datasetName || a.datasetType || 'Unknown Dataset',
          createdAt: a.createdAt,
          completedAt: a.completedAt,
          duration: a.duration,
          resultsSummary: a.resultsSummary,
        }));
        setAnalyses(mappedAnalyses);
      } else {
        throw new Error('Failed to fetch analyses');
      }
    } catch (err: any) {
      console.error('Failed to fetch analyses:', err);
      setError(err.response?.data?.message || 'Failed to load analyses. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredAnalyses = searchTerm
    ? analyses.filter(a => 
        a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.datasetName.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : analyses;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'running': return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'running': return 'bg-blue-100 text-blue-700';
      case 'failed': return 'bg-red-100 text-red-700';
      default: return 'bg-yellow-100 text-yellow-700';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'statistical': return 'bg-purple-100 text-purple-700';
      case 'ml_analysis': return 'bg-blue-100 text-blue-700';
      case 'ml_model': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const pendingCount = analyses.filter(a => a.status === 'pending').length;
  const runningCount = analyses.filter(a => a.status === 'running').length;
  const completedCount = analyses.filter(a => a.status === 'completed').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/researcher"
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Analyses</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              View and manage your data analyses
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/researcher/analysis/new"
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Analysis
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-xl font-bold">{analyses.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 dark:border-yellow-800">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-xl font-bold text-yellow-600">{pendingCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 dark:border-blue-800">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Play className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Running</p>
              <p className="text-xl font-bold text-blue-600">{runningCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 dark:border-green-800">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Completed</p>
              <p className="text-xl font-bold text-green-600">{completedCount}</p>
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
                placeholder="Search analyses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="running">Running</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
              <Button variant="outline" onClick={fetchAnalyses}>
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
          <button onClick={fetchAnalyses} className="ml-auto underline">Retry</button>
        </div>
      )}

      {/* Analyses List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : filteredAnalyses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FlaskConical className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">No analyses found</p>
            <Link
              href="/dashboard/researcher/analysis/new"
              className="inline-flex items-center gap-2 mt-4 text-blue-600 hover:underline"
            >
              <Plus className="h-4 w-4" />
              Create your first analysis
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredAnalyses.map((analysis) => (
            <Card key={analysis.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                      <BarChart3 className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{analysis.name}</h3>
                        {getStatusIcon(analysis.status)}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {analysis.description}
                      </p>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <Badge className={cn('text-xs', getTypeColor(analysis.type))}>
                          {analysis.type.replace('_', ' ')}
                        </Badge>
                        <Badge className={cn('text-xs', getStatusColor(analysis.status))}>
                          {analysis.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Created {formatDate(analysis.createdAt)}
                        </span>
                        {analysis.duration && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {formatDuration(analysis.duration)}
                          </span>
                        )}
                        <span>Dataset: {analysis.datasetName}</span>
                      </div>
                      {analysis.resultsSummary && (
                        <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            <strong>Results:</strong> {analysis.resultsSummary}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Link
                      href={`/dashboard/researcher/analyses/${analysis.id}`}
                      className="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </Link>
                    {analysis.status === 'completed' && (
                      <Button variant="outline" size="sm">
                        Export
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default withAuth(AnalysesPage, ['researcher']);
