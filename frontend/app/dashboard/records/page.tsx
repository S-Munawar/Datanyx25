'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from '@/components/ui';
import { cn, formatDate, getRiskLevelColor, getStatusColor } from '@/lib/utils';
import { FileText, Plus, Eye, Filter, Search, AlertCircle, CheckCircle, Loader2, AlertTriangle } from 'lucide-react';
import { healthRecordApi } from '@/lib/api';
import type { HealthRecord } from '@/lib/types';

function RecordsContent() {
  const searchParams = useSearchParams();
  const created = searchParams.get('created');
  const [showSuccess, setShowSuccess] = useState(!!created);
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });

  useEffect(() => {
    if (created) {
      const timer = setTimeout(() => setShowSuccess(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [created]);

  useEffect(() => {
    fetchRecords();
  }, [pagination.page, statusFilter]);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await healthRecordApi.getAll({
        page: pagination.page,
        limit: pagination.limit,
        status: statusFilter || undefined,
      });
      
      if (response.success) {
        setRecords((response.records as HealthRecord[]) || []);
        if (response.pagination) {
          setPagination(prev => ({
            ...prev,
            total: response.pagination.total,
            pages: response.pagination.pages,
          }));
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch records:', err);
      setError('Failed to load health records');
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = searchTerm
    ? records.filter(r => 
        r.recordNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.prediction?.diagnosis?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : records;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Health Records</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            View and manage your immunodeficiency assessments
          </p>
        </div>
        <Link
          href="/assessment"
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Assessment
        </Link>
      </div>

      {/* Success message */}
      {showSuccess && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-3 text-green-700 dark:text-green-400">
          <CheckCircle className="h-5 w-5" />
          <span>Health record submitted successfully! It will be reviewed shortly.</span>
          <button
            onClick={() => setShowSuccess(false)}
            className="ml-auto text-green-600 hover:text-green-800"
          >
            ×
          </button>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3 text-red-700 dark:text-red-400">
          <AlertTriangle className="h-5 w-5" />
          <span>{error}</span>
          <button
            onClick={() => fetchRecords()}
            className="ml-auto text-red-600 hover:text-red-800 underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search records..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <select 
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="submitted">Submitted</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="reviewed">Reviewed</option>
              </select>
              <Button variant="outline" onClick={fetchRecords}>
                <Filter className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Records List */}
      <Card>
        <CardHeader>
          <CardTitle>Assessment History ({pagination.total} records)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">No health records found</p>
              <Link
                href="/assessment"
                className="inline-flex items-center gap-2 mt-4 text-blue-600 hover:underline"
              >
                <Plus className="h-4 w-4" />
                Create your first assessment
              </Link>
            </div>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 border-b dark:border-gray-700">
                  <th className="pb-3 font-medium">Record #</th>
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">AI Prediction</th>
                  <th className="pb-3 font-medium">Confidence</th>
                  <th className="pb-3 font-medium">Risk Level</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => (
                  <tr key={record.id || record._id} className="border-b dark:border-gray-700 last:border-0">
                    <td className="py-4">
                      <span className="font-mono text-sm text-gray-600 dark:text-gray-400">
                        {record.recordNumber || 'N/A'}
                      </span>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-900 dark:text-gray-100">{formatDate(record.createdAt ? new Date(record.createdAt).toISOString() : new Date().toISOString())}</span>
                      </div>
                    </td>
                    <td className="py-4">
                      <Badge
                        className={cn(
                          'capitalize',
                          getStatusColor(record.status?.replace('_', ' ') || 'pending')
                        )}
                      >
                        {record.status?.replace('_', ' ') || 'pending'}
                      </Badge>
                    </td>
                    <td className="py-4">
                      {record.prediction?.diagnosis ? (
                        <span className="font-medium text-gray-900 dark:text-gray-100">{record.prediction.diagnosis}</span>
                      ) : (
                        <span className="text-gray-400">Pending</span>
                      )}
                    </td>
                    <td className="py-4">
                      {record.prediction?.confidence ? (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-600 rounded-full"
                              style={{ width: `${record.prediction.confidence * 100}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {(record.prediction.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-4">
                      {record.prediction?.riskLevel ? (
                        <Badge className={cn('text-xs', getRiskLevelColor(record.prediction.riskLevel))}>
                          {record.prediction.riskLevel.toUpperCase()}
                        </Badge>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-4">
                      <Link
                        href={`/dashboard/records/${record.id || record._id}`}
                        className="inline-flex items-center gap-1 text-blue-600 hover:underline text-sm font-medium"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}

          {/* Pagination */}
          {!loading && pagination.pages > 1 && (
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
        </CardContent>
      </Card>
    </div>
  );
}

export default function RecordsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    }>
      <RecordsContent />
    </Suspense>
  );
}
