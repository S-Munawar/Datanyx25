'use client';

import { useEffect, useState } from 'react';
import { useAuth, withAuth } from '@/lib/auth-context';
import { adminApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import {
  Settings,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Server,
  Database,
  Mail,
  Shield,
  Bell,
  Save,
  RefreshCw,
  CheckCircle,
  Activity,
  Globe,
  Lock,
} from 'lucide-react';
import Link from 'next/link';

interface SystemSettings {
  general: {
    siteName: string;
    siteUrl: string;
    maintenanceMode: boolean;
    registrationEnabled: boolean;
  };
  security: {
    sessionTimeout: number;
    maxLoginAttempts: number;
    passwordMinLength: number;
    requireEmailVerification: boolean;
    twoFactorEnabled: boolean;
  };
  notifications: {
    emailNotificationsEnabled: boolean;
    smtpHost: string;
    smtpPort: number;
    emailFrom: string;
  };
  ai: {
    modelVersion: string;
    confidenceThreshold: number;
    autoProcessing: boolean;
  };
}

interface SystemHealth {
  status: string;
  uptime: { seconds: number; formatted: string };
  services: {
    mongodb: { status: string; latency?: number };
    redis: { status: string; latency?: number };
    aiService: { status: string; latency?: number };
  };
  memory: { heapUsed: string; heapTotal: string; percentage: number };
  cpu: { usage: number };
}

function SystemSettingsPage() {
  useAuth();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [settingsRes, healthRes] = await Promise.all([
        adminApi.getSystemSettings().catch(() => ({ success: false } as { success: false })),
        adminApi.getSystemHealth().catch(() => ({ success: false } as { success: false })),
      ]);

      if (settingsRes.success && 'settings' in settingsRes && settingsRes.settings) {
        setSettings(settingsRes.settings);
      } else {
        // Default settings when API not available
        setSettings({
          general: {
            siteName: 'ImmunoDetect',
            siteUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://immunodetect.com',
            maintenanceMode: false,
            registrationEnabled: true,
          },
          security: {
            sessionTimeout: 3600,
            maxLoginAttempts: 5,
            passwordMinLength: 8,
            requireEmailVerification: true,
            twoFactorEnabled: false,
          },
          notifications: {
            emailNotificationsEnabled: true,
            smtpHost: 'smtp.example.com',
            smtpPort: 587,
            emailFrom: 'noreply@immunodetect.com',
          },
          ai: {
            modelVersion: '2.1.0',
            confidenceThreshold: 0.75,
            autoProcessing: true,
          },
        });
      }

      if (healthRes.success && healthRes.health) {
        setHealth(healthRes.health);
      } else if (healthRes.success && healthRes.status) {
        // Map alternative response structure
        setHealth({
          status: healthRes.status,
          uptime: healthRes.uptime || { seconds: 0, formatted: 'N/A' },
          services: healthRes.services || {
            mongodb: { status: 'unknown' },
            redis: { status: 'unknown' },
            aiService: { status: 'unknown' },
          },
          memory: healthRes.memory || { heapUsed: 'N/A', heapTotal: 'N/A', percentage: 0 },
          cpu: healthRes.cpu || { usage: 0 },
        });
      }
    } catch (err: any) {
      console.error('Failed to fetch system data:', err);
      setError(err.response?.data?.message || 'Failed to load system settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    
    try {
      setSaving(true);
      setError(null);

      const response = await adminApi.updateSystemSettings(settings);
      
      if (response.success) {
        setSuccessMessage('Settings saved successfully');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      setError(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (category: keyof SystemSettings, key: string, value: any) => {
    if (!settings) return;
    setSettings({
      ...settings,
      [category]: {
        ...settings[category],
        [key]: value,
      },
    });
  };

  const getServiceStatusColor = (status: string) => {
    return status === 'connected' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">System Settings</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Configure system behavior and monitor health
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-3 text-green-700 dark:text-green-400">
          <CheckCircle className="h-5 w-5" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3 text-red-700 dark:text-red-400">
          <AlertTriangle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* General Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                General Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Site Name
                </label>
                <input
                  type="text"
                  value={settings?.general.siteName || ''}
                  onChange={(e) => updateSetting('general', 'siteName', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Site URL
                </label>
                <input
                  type="url"
                  value={settings?.general.siteUrl || ''}
                  onChange={(e) => updateSetting('general', 'siteUrl', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                />
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="font-medium">Registration Enabled</p>
                  <p className="text-sm text-gray-500">Allow new users to register</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings?.general.registrationEnabled || false}
                    onChange={(e) => updateSetting('general', 'registrationEnabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div>
                  <p className="font-medium text-yellow-800 dark:text-yellow-400">Maintenance Mode</p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-500">Disable access for non-admin users</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings?.general.maintenanceMode || false}
                    onChange={(e) => updateSetting('general', 'maintenanceMode', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Security Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Session Timeout (seconds)
                  </label>
                  <input
                    type="number"
                    value={settings?.security.sessionTimeout || 3600}
                    onChange={(e) => updateSetting('security', 'sessionTimeout', parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Max Login Attempts
                  </label>
                  <input
                    type="number"
                    value={settings?.security.maxLoginAttempts || 5}
                    onChange={(e) => updateSetting('security', 'maxLoginAttempts', parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Minimum Password Length
                </label>
                <input
                  type="number"
                  value={settings?.security.passwordMinLength || 8}
                  onChange={(e) => updateSetting('security', 'passwordMinLength', parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                />
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="font-medium">Require Email Verification</p>
                  <p className="text-sm text-gray-500">Users must verify email before accessing</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings?.security.requireEmailVerification || false}
                    onChange={(e) => updateSetting('security', 'requireEmailVerification', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* AI Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                AI Model Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Model Version
                  </label>
                  <input
                    type="text"
                    value={settings?.ai.modelVersion || ''}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-100 dark:bg-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Confidence Threshold
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={settings?.ai.confidenceThreshold || 0.75}
                    onChange={(e) => updateSetting('ai', 'confidenceThreshold', parseFloat(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="font-medium">Auto Processing</p>
                  <p className="text-sm text-gray-500">Automatically process new submissions</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings?.ai.autoProcessing || false}
                    onChange={(e) => updateSetting('ai', 'autoProcessing', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Health Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                System Health
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="font-semibold text-green-700 dark:text-green-400 capitalize">
                  {health?.status || 'Unknown'}
                </p>
                <p className="text-sm text-green-600 dark:text-green-500">
                  Uptime: {health?.uptime.formatted || 'N/A'}
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-gray-700 dark:text-gray-300">Services</h4>
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-gray-500" />
                    <span>MongoDB</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getServiceStatusColor(health?.services.mongodb.status || 'unknown')}>
                      {health?.services.mongodb.status || 'unknown'}
                    </Badge>
                    {health?.services.mongodb.latency && (
                      <span className="text-xs text-gray-500">{health.services.mongodb.latency}ms</span>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Server className="h-4 w-4 text-gray-500" />
                    <span>Redis</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getServiceStatusColor(health?.services.redis.status || 'unknown')}>
                      {health?.services.redis.status || 'unknown'}
                    </Badge>
                    {health?.services.redis.latency && (
                      <span className="text-xs text-gray-500">{health.services.redis.latency}ms</span>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-gray-500" />
                    <span>AI Service</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getServiceStatusColor(health?.services.aiService?.status || 'unknown')}>
                      {health?.services.aiService?.status || 'unknown'}
                    </Badge>
                    {health?.services.aiService?.latency && (
                      <span className="text-xs text-gray-500">{health.services.aiService.latency}ms</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-gray-700 dark:text-gray-300">Resources</h4>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-500">Memory</span>
                    <span className="text-sm font-medium">{health?.memory.percentage || 0}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${health?.memory.percentage || 0}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {health?.memory.heapUsed} / {health?.memory.heapTotal}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-500">CPU</span>
                    <span className="text-sm font-medium">{health?.cpu.usage || 0}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: `${health?.cpu.usage || 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default withAuth(SystemSettingsPage, ['admin']);
