'use client';

import { useEffect, useState } from 'react';
import { withAuth } from '@/lib/auth-context';
import { adminApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Input, Label } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import {
  Shield,
  Plus,
  Search,
  Loader2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  XCircle,
  Copy,
  Check,
} from 'lucide-react';

interface LicenseData {
  _id: string;
  licenseNumber: string;
  type: string;
  status: string;
  claimedBy?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: string;
  expiresAt?: string;
  claimedAt?: string;
}

function AdminLicensesPage() {
  const [licenses, setLicenses] = useState<LicenseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Create form state
  const [newLicense, setNewLicense] = useState({
    type: 'counselor',
    expiresAt: '',
  });

  // Bulk create state
  const [bulkCreate, setBulkCreate] = useState({
    type: 'counselor',
    count: 10,
    prefix: '',
    expiresAt: '',
  });

  const fetchLicenses = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.type = typeFilter;

      const response = await adminApi.getLicenses(params);
      
      if (response.success) {
        // Map the API response to our local type
        const licenseList = (response.licenses || []).map((l) => ({
          _id: l._id,
          licenseNumber: l.licenseNumber,
          type: l.licenseType || 'unknown',
          status: l.verificationStatus || 'pending',
          createdAt: l.createdAt?.toString() || '',
          expiresAt: l.expiryDate?.toString(),
        })) as LicenseData[];
        setLicenses(licenseList);
      }
    } catch (err) {
      console.error('Failed to fetch licenses:', err);
      setError('Failed to load licenses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLicenses();
  }, [statusFilter, typeFilter]);

  const handleCreateLicense = async () => {
    try {
      setCreating(true);
      await adminApi.createLicense({
        licenseNumber: `LIC-${Date.now()}`,
        type: newLicense.type,
        expiresAt: newLicense.expiresAt || undefined,
      });
      setShowCreateModal(false);
      setNewLicense({ type: 'counselor', expiresAt: '' });
      await fetchLicenses();
    } catch (err) {
      alert('Failed to create license');
    } finally {
      setCreating(false);
    }
  };

  const handleBulkCreate = async () => {
    try {
      setCreating(true);
      await adminApi.bulkCreateLicenses({
        type: bulkCreate.type,
        count: bulkCreate.count,
        prefix: bulkCreate.prefix || undefined,
        expiresAt: bulkCreate.expiresAt || undefined,
      });
      setShowBulkModal(false);
      setBulkCreate({ type: 'counselor', count: 10, prefix: '', expiresAt: '' });
      await fetchLicenses();
    } catch (err) {
      alert('Failed to create licenses');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (licenseId: string) => {
    const reason = prompt('Enter reason for revocation:');
    if (!reason) return;

    try {
      await adminApi.revokeLicense(licenseId, reason);
      await fetchLicenses();
    } catch (err) {
      alert('Failed to revoke license');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
      available: 'success',
      claimed: 'warning',
      revoked: 'destructive',
      expired: 'secondary',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const filteredLicenses = licenses.filter((license) =>
    search === '' ||
    license.licenseNumber.toLowerCase().includes(search.toLowerCase()) ||
    license.claimedBy?.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading && licenses.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">License Management</h1>
          <p className="text-gray-600 mt-1">Create and manage professional licenses</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowBulkModal(true)}>
            Bulk Create
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create License
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search licenses..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">All Types</option>
                <option value="counselor">Counselor</option>
                <option value="researcher">Researcher</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">All Status</option>
                <option value="available">Available</option>
                <option value="claimed">Claimed</option>
                <option value="revoked">Revoked</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 border-b">
                  <th className="pb-3 font-medium">License Number</th>
                  <th className="pb-3 font-medium">Type</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Claimed By</th>
                  <th className="pb-3 font-medium">Created</th>
                  <th className="pb-3 font-medium">Expires</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLicenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-500">
                      No licenses found
                    </td>
                  </tr>
                ) : (
                  filteredLicenses.map((license) => (
                    <tr key={license._id} className="border-b last:border-0">
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                            {license.licenseNumber}
                          </code>
                          <button
                            onClick={() => copyToClipboard(license.licenseNumber, license._id)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            {copiedId === license._id ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-4 capitalize">{license.type}</td>
                      <td className="py-4">{getStatusBadge(license.status)}</td>
                      <td className="py-4">
                        {license.claimedBy ? (
                          <div>
                            <p className="font-medium text-gray-900">
                              {license.claimedBy.firstName} {license.claimedBy.lastName}
                            </p>
                            <p className="text-sm text-gray-500">{license.claimedBy.email}</p>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-4 text-gray-600">{formatDate(license.createdAt)}</td>
                      <td className="py-4 text-gray-600">
                        {license.expiresAt ? formatDate(license.expiresAt) : 'Never'}
                      </td>
                      <td className="py-4">
                        {license.status === 'claimed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRevoke(license._id)}
                            className="text-red-600"
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Revoke
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create License Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Create New License</h2>
            <div className="space-y-4">
              <div>
                <Label>License Type</Label>
                <select
                  value={newLicense.type}
                  onChange={(e) => setNewLicense({ ...newLicense, type: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="counselor">Counselor</option>
                  <option value="researcher">Researcher</option>
                </select>
              </div>
              <div>
                <Label>Expiration Date (Optional)</Label>
                <Input
                  type="date"
                  value={newLicense.expiresAt}
                  onChange={(e) => setNewLicense({ ...newLicense, expiresAt: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowCreateModal(false)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleCreateLicense} disabled={creating} className="flex-1">
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Create Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Bulk Create Licenses</h2>
            <div className="space-y-4">
              <div>
                <Label>License Type</Label>
                <select
                  value={bulkCreate.type}
                  onChange={(e) => setBulkCreate({ ...bulkCreate, type: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="counselor">Counselor</option>
                  <option value="researcher">Researcher</option>
                </select>
              </div>
              <div>
                <Label>Number of Licenses</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={bulkCreate.count}
                  onChange={(e) => setBulkCreate({ ...bulkCreate, count: parseInt(e.target.value) || 1 })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Prefix (Optional)</Label>
                <Input
                  value={bulkCreate.prefix}
                  onChange={(e) => setBulkCreate({ ...bulkCreate, prefix: e.target.value })}
                  placeholder="e.g., BATCH-2024"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Expiration Date (Optional)</Label>
                <Input
                  type="date"
                  value={bulkCreate.expiresAt}
                  onChange={(e) => setBulkCreate({ ...bulkCreate, expiresAt: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowBulkModal(false)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleBulkCreate} disabled={creating} className="flex-1">
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : `Create ${bulkCreate.count} Licenses`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default withAuth(AdminLicensesPage, ['admin']);
