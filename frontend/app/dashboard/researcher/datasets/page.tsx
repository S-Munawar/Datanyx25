'use client';

import { useEffect, useState } from 'react';
import { useAuth, withAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@/components/ui';
import { cn, formatDate } from '@/lib/utils';
import {
  Database,
  Search,
  Filter,
  ArrowLeft,
  Download,
  Eye,
  Loader2,
  AlertTriangle,
  Calendar,
  Users,
  FileText,
} from 'lucide-react';
import Link from 'next/link';

interface Dataset {
  id: string;
  name: string;
  description: string;
  type: string;
  recordCount: number;
  lastUpdated: string;
  accessLevel: string;
  tags?: string[];
}

function DatasetsPage() {
  useAuth();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [exporting, setExporting] = useState<string | null>(null);

  useEffect(() => {
    fetchDatasets();
  }, [typeFilter]);

  const fetchDatasets = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get('/researcher/datasets', {
        params: { type: typeFilter || undefined }
      });
      
      if (response.data.success) {
        // Map API response to Dataset interface
        const mappedDatasets = response.data.datasets.map((d: any) => ({
          id: d.id,
          name: d.name,
          description: d.description || `Dataset containing ${d.recordCount} anonymized health records`,
          type: d.type || 'clinical',
          recordCount: d.recordCount,
          lastUpdated: d.lastUpdated || new Date().toISOString(),
          accessLevel: d.accessLevel || 'full',
          tags: d.tags || [d.type || 'clinical', 'Immunology'],
        }));
        setDatasets(mappedDatasets);
      } else {
        throw new Error('Failed to fetch datasets');
      }
    } catch (err: any) {
      console.error('Failed to fetch datasets:', err);
      setError(err.response?.data?.message || 'Failed to load datasets. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (datasetId: string) => {
    try {
      setExporting(datasetId);
      
      // Find dataset type from the dataset
      const dataset = datasets.find(d => d.id === datasetId);
      const datasetType = dataset?.type || 'all';
      
      const response = await api.post('/researcher/export', { 
        datasetType,
        format: 'json'
      });
      
      if (response.data.success) {
        // Create downloadable JSON file
        const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dataset-${datasetType}-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err: any) {
      console.error('Export failed:', err);
      alert(err.response?.data?.message || 'Failed to export dataset. Please try again.');
    } finally {
      setExporting(null);
    }
  };

  const filteredDatasets = searchTerm
    ? datasets.filter(d => 
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.tags?.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : datasets;

  const getAccessLevelColor = (level: string) => {
    switch (level) {
      case 'full': return 'bg-green-100 text-green-700';
      case 'restricted': return 'bg-yellow-100 text-yellow-700';
      case 'anonymized': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'clinical': return 'bg-blue-100 text-blue-700';
      case 'laboratory': return 'bg-purple-100 text-purple-700';
      case 'genomic': return 'bg-green-100 text-green-700';
      case 'screening': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Research Datasets</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Access anonymized patient data for research purposes
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search datasets by name, description, or tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <select 
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value="clinical">Clinical</option>
                <option value="laboratory">Laboratory</option>
                <option value="genomic">Genomic</option>
                <option value="screening">Screening</option>
              </select>
              <Button variant="outline" onClick={fetchDatasets}>
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
          <button onClick={fetchDatasets} className="ml-auto underline">Retry</button>
        </div>
      )}

      {/* Datasets Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : filteredDatasets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Database className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">No datasets found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredDatasets.map((dataset) => (
            <Card key={dataset.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                      <Database className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{dataset.name}</CardTitle>
                      <div className="flex gap-2 mt-1">
                        <Badge className={cn('text-xs', getTypeColor(dataset.type))}>
                          {dataset.type}
                        </Badge>
                        <Badge className={cn('text-xs', getAccessLevelColor(dataset.accessLevel))}>
                          {dataset.accessLevel}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {dataset.description}
                </p>

                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{dataset.recordCount} records</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>Updated {formatDate(dataset.lastUpdated)}</span>
                  </div>
                </div>

                {dataset.tags && dataset.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {dataset.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <Link
                    href={`/dashboard/researcher/datasets/${dataset.id}`}
                    className="flex-1 flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Eye className="h-4 w-4" />
                    View Details
                  </Link>
                  <Button
                    variant="outline"
                    onClick={() => handleExport(dataset.id)}
                    disabled={exporting === dataset.id}
                  >
                    {exporting === dataset.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default withAuth(DatasetsPage, ['researcher']);
