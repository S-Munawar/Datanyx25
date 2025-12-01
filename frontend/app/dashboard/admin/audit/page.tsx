'use client';

import { useEffect, useState } from 'react';
import { useAuth, withAuth } from '@/lib/auth-context';
import { adminApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@/components/ui';
import { cn, formatDate } from '@/lib/utils';
import {
  Activity,
  Search,
  Filter,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  User,
  Shield,
  Database,
  FileText,
  Calendar,
  Download,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';

interface AuditLog {
  id: string;
  action: string;
  userId: string;
  userEmail: string;
  userRole: string;
  resource: string;
  resourceId?: string;
  details?: string;
  ipAddress?: string;
  timestamp: string;
}

function AuditLogsPage() {
  useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 0 });

  useEffect(() => {
    fetchLogs();
  }, [pagination.page, actionFilter]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await adminApi.getAuditLogs({
        page: pagination.page,
        limit: pagination.limit,
        action: actionFilter || undefined,
      });
      
      if (response.success) {
        // Map API response to AuditLog interface
        const mappedLogs = response.logs.map((log: any) => ({
          id: log._id || log.id,
          action: log.action,
          userId: log.userId?._id || log.userId,
          userEmail: log.userId?.email || log.userEmail || 'Unknown',
          userRole: log.userId?.role || log.userRole || 'unknown',
          resource: log.resource || log.action?.split('.')[0] || 'system',
          resourceId: log.resourceId || log.metadata?.resourceId,
          details: log.description || log.details,
          ipAddress: log.ipAddress || log.metadata?.ipAddress,
          timestamp: log.createdAt || log.timestamp,
        }));
        setLogs(mappedLogs);
        if (response.pagination) {
          setPagination(prev => ({
            ...prev,
            total: response.pagination.total,
            pages: response.pagination.pages,
          }));
        }
      } else {
        throw new Error('Failed to fetch audit logs');
      }
    } catch (err: any) {
      console.error('Failed to fetch audit logs:', err);
      setError(err.response?.data?.message || 'Failed to load audit logs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = searchTerm
    ? logs.filter(l => 
        l.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.details?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : logs;

  const getActionColor = (action: string) => {
    if (action.includes('LOGIN') || action.includes('LOGOUT')) return 'bg-blue-100 text-blue-700';
    if (action.includes('CREATED') || action.includes('REGISTERED')) return 'bg-green-100 text-green-700';
    if (action.includes('DELETED') || action.includes('FAILED')) return 'bg-red-100 text-red-700';
    if (action.includes('UPDATED') || action.includes('SUBMITTED')) return 'bg-yellow-100 text-yellow-700';
    return 'bg-gray-100 text-gray-700';
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-700';
      case 'counselor': return 'bg-green-100 text-green-700';
      case 'researcher': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getResourceIcon = (resource: string) => {
    switch (resource) {
      case 'user':
      case 'auth':
        return <User className="h-4 w-4" />;
      case 'healthRecord':
        return <FileText className="h-4 w-4" />;
      case 'license':
        return <Shield className="h-4 w-4" />;
      case 'dataset':
        return <Database className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/admin"
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Audit Logs</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              View system activity and user actions
            </p>
          </div>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Logs
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by user, action, or details..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <select 
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Actions</option>
                <option value="login">Login/Logout</option>
                <option value="created">Created</option>
                <option value="updated">Updated</option>
                <option value="deleted">Deleted</option>
                <option value="accessed">Accessed</option>
              </select>
              <Button variant="outline" onClick={fetchLogs}>
                <RefreshCw className="h-4 w-4 mr-2" />
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
          <button onClick={fetchLogs} className="ml-auto underline">Retry</button>
        </div>
      )}

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Log ({filteredLogs.length} entries)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">No audit logs found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-500 border-b dark:border-gray-700">
                    <th className="pb-3 font-medium">Timestamp</th>
                    <th className="pb-3 font-medium">Action</th>
                    <th className="pb-3 font-medium">User</th>
                    <th className="pb-3 font-medium">Resource</th>
                    <th className="pb-3 font-medium">Details</th>
                    <th className="pb-3 font-medium">IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="border-b dark:border-gray-700 last:border-0">
                      <td className="py-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600 dark:text-gray-400">
                            {formatDate(log.timestamp)}
                          </span>
                        </div>
                      </td>
                      <td className="py-4">
                        <Badge className={cn('text-xs', getActionColor(log.action))}>
                          {log.action.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {log.userEmail}
                          </p>
                          <Badge className={cn('text-xs mt-1', getRoleColor(log.userRole))}>
                            {log.userRole}
                          </Badge>
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          {getResourceIcon(log.resource)}
                          <span>{log.resource}</span>
                          {log.resourceId && (
                            <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">
                              {log.resourceId}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {log.details || '—'}
                        </span>
                      </td>
                      <td className="py-4">
                        <span className="text-sm font-mono text-gray-500">
                          {log.ipAddress || '—'}
                        </span>
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

export default withAuth(AuditLogsPage, ['admin']);
