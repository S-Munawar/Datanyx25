'use client';

import { useEffect, useState } from 'react';
import { useAuth, withAuth } from '@/lib/auth-context';
import { adminApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui';
import {
  Users,
  Shield,
  Activity,
  Database,
  Server,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  users: {
    total: number;
    active: number;
    byRole: {
      patient: number;
      counselor: number;
      researcher: number;
      admin: number;
    };
    recentRegistrations: number;
  };
  licenses: {
    total: number;
    available: number;
    claimed: number;
  };
  healthRecords: {
    total: number;
    pending: number;
    completed: number;
    reviewed: number;
  };
}

interface SystemHealth {
  status: string;
  uptime: {
    seconds: number;
    formatted: string;
  };
  services: {
    mongodb: { status: string };
    redis: { status: string };
  };
  memory: {
    heapUsed: string;
    heapTotal: string;
  };
}

function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [dashboardResponse, healthResponse] = await Promise.all([
          adminApi.getDashboardStats(),
          adminApi.getSystemHealth(),
        ]);

        if (dashboardResponse.success) {
          setStats(dashboardResponse.stats);
        }

        if (healthResponse.success) {
          setSystemHealth(healthResponse.health);
        }
      } catch (err: any) {
        console.error('Failed to fetch admin dashboard:', err);
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
            Admin Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            System overview and management
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/dashboard/admin/users"
            className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Users className="h-4 w-4" />
            Manage Users
          </Link>
          <Link
            href="/dashboard/admin/licenses"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Shield className="h-4 w-4" />
            License Management
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Users</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {(stats?.users.total || 0).toLocaleString()}
                </p>
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  +{stats?.users.recentRegistrations || 0} this week
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
                <p className="text-sm text-gray-500">Available Licenses</p>
                <p className="text-2xl font-bold text-yellow-600 mt-1">
                  {stats?.licenses.available || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">{stats?.licenses.claimed || 0} claimed</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Shield className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Health Records</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {(stats?.healthRecords.total || 0).toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">{stats?.healthRecords.pending || 0} pending review</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Database className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">System Status</p>
                <p className="text-2xl font-bold text-gray-900 mt-1 capitalize">
                  {systemHealth?.status || 'Unknown'}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Uptime: {systemHealth?.uptime.formatted || 'N/A'}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Server className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Breakdown */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>User Distribution</CardTitle>
              <Link
                href="/dashboard/admin/users"
                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
              >
                Manage users <ArrowRight className="h-4 w-4" />
              </Link>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-blue-600">{stats?.users.byRole.patient || 0}</p>
                  <p className="text-sm text-blue-700 mt-1">Patients</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-green-600">{stats?.users.byRole.counselor || 0}</p>
                  <p className="text-sm text-green-700 mt-1">Counselors</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-purple-600">{stats?.users.byRole.researcher || 0}</p>
                  <p className="text-sm text-purple-700 mt-1">Researchers</p>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-orange-600">{stats?.users.byRole.admin || 0}</p>
                  <p className="text-sm text-orange-700 mt-1">Admins</p>
                </div>
              </div>
              
              <div className="mt-6 space-y-3">
                <h4 className="font-medium text-gray-700">Health Records Summary</h4>
                <div className="flex gap-4">
                  <div className="flex-1 p-3 bg-yellow-50 rounded-lg">
                    <p className="text-lg font-bold text-yellow-600">{stats?.healthRecords.pending || 0}</p>
                    <p className="text-xs text-yellow-700">Pending</p>
                  </div>
                  <div className="flex-1 p-3 bg-blue-50 rounded-lg">
                    <p className="text-lg font-bold text-blue-600">{stats?.healthRecords.completed || 0}</p>
                    <p className="text-xs text-blue-700">Completed</p>
                  </div>
                  <div className="flex-1 p-3 bg-green-50 rounded-lg">
                    <p className="text-lg font-bold text-green-600">{stats?.healthRecords.reviewed || 0}</p>
                    <p className="text-xs text-green-700">Reviewed</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Health */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>System Health</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">MongoDB</span>
                </div>
                <Badge variant={systemHealth?.services.mongodb.status === 'connected' ? 'success' : 'destructive'}>
                  {systemHealth?.services.mongodb.status || 'unknown'}
                </Badge>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">Redis</span>
                </div>
                <Badge variant={systemHealth?.services.redis.status === 'connected' ? 'success' : 'destructive'}>
                  {systemHealth?.services.redis.status || 'unknown'}
                </Badge>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">Memory Usage</span>
                </div>
                <span className="font-semibold text-gray-900 text-sm">
                  {systemHealth?.memory.heapUsed || 'N/A'}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link
                href="/dashboard/admin/audit"
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Activity className="h-5 w-5 text-gray-600" />
                <span className="font-medium text-gray-700">View Audit Logs</span>
              </Link>
              <Link
                href="/dashboard/admin/system"
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Server className="h-5 w-5 text-gray-600" />
                <span className="font-medium text-gray-700">System Settings</span>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default withAuth(AdminDashboard, ['admin']);
