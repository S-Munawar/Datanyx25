'use client';

import { useEffect, useState } from 'react';
import { useAuth, withAuth } from '@/lib/auth-context';
import { counselorApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@/components/ui';
import { cn, formatDate } from '@/lib/utils';
import {
  Users,
  Search,
  Filter,
  ArrowLeft,
  Eye,
  Loader2,
  AlertTriangle,
  User,
  Mail,
  Calendar,
  Activity,
} from 'lucide-react';
import Link from 'next/link';

interface Patient {
  id: string;
  _id?: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string;
  recordCount?: number;
  lastRecordDate?: string;
  riskLevel?: string;
}

function CounselorPatientsPage() {
  useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });

  useEffect(() => {
    fetchPatients();
  }, [pagination.page]);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await counselorApi.getAssignedPatients({
        page: pagination.page,
        limit: pagination.limit,
      });

      if (response.success && response.patients) {
        const formattedPatients = response.patients.map((p: any) => ({
          id: p._id || p.id || '',
          firstName: p.firstName || '',
          lastName: p.lastName || '',
          email: p.email || '',
          createdAt: p.createdAt || '',
          recordCount: p.recordCount || 0,
          lastRecordDate: p.lastRecordDate || null,
          riskLevel: p.riskLevel || null,
        }));
        setPatients(formattedPatients);
        
        if (response.pagination) {
          setPagination(prev => ({
            ...prev,
            total: response.pagination.total,
            pages: response.pagination.pages,
          }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch patients:', err);
      setError('Failed to load patients');
    } finally {
      setLoading(false);
    }
  };

  const filteredPatients = searchTerm
    ? patients.filter(p => 
        p.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.email?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : patients;

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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Assigned Patients</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              View and manage your assigned patients
            </p>
          </div>
        </div>
      </div>

      {/* Summary Card */}
      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
            <Users className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Assigned Patients</p>
            <p className="text-xl font-bold text-blue-600">{pagination.total}</p>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <Button variant="outline" onClick={fetchPatients}>
              <Filter className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3 text-red-700 dark:text-red-400">
          <AlertTriangle className="h-5 w-5" />
          <span>{error}</span>
          <button
            onClick={fetchPatients}
            className="ml-auto text-red-600 hover:text-red-800 underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Patients Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : filteredPatients.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">No patients found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPatients.map((patient) => (
            <Card key={patient.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-lg font-medium">
                      {patient.firstName?.[0]}{patient.lastName?.[0]}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {patient.firstName} {patient.lastName}
                      </h3>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {patient.email}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 flex items-center gap-1">
                      <Activity className="h-4 w-4" />
                      Records
                    </span>
                    <span className="font-medium">{patient.recordCount || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Last Activity
                    </span>
                    <span className="font-medium">
                      {patient.lastRecordDate ? formatDate(patient.lastRecordDate) : 'N/A'}
                    </span>
                  </div>
                  {patient.riskLevel && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Risk Level</span>
                      <Badge className={cn(
                        'text-xs',
                        patient.riskLevel === 'high' ? 'bg-red-100 text-red-700' :
                        patient.riskLevel === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      )}>
                        {patient.riskLevel.toUpperCase()}
                      </Badge>
                    </div>
                  )}
                </div>

                <Link
                  href={`/dashboard/counselor/patients/${patient.id}`}
                  className="flex items-center justify-center gap-2 w-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <Eye className="h-4 w-4" />
                  View Details
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && pagination.pages > 1 && (
        <div className="flex items-center justify-between">
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
    </div>
  );
}

export default withAuth(CounselorPatientsPage, ['counselor']);
