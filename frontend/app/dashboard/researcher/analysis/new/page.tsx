'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, withAuth } from '@/lib/auth-context';
import { api, researcherApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, Button, Label } from '@/components/ui';
import {
  ArrowLeft,
  FlaskConical,
  Loader2,
  AlertTriangle,
  Database,
  BarChart3,
  TrendingUp,
  GitBranch,
  CheckCircle,
} from 'lucide-react';
import Link from 'next/link';

interface Dataset {
  id: string;
  name: string;
  type: string;
  recordCount: number;
}

const analysisTypes = [
  {
    id: 'distribution',
    name: 'Distribution Analysis',
    description: 'Analyze diagnosis and risk level distribution across the dataset',
    icon: BarChart3,
    color: 'blue',
  },
  {
    id: 'correlation',
    name: 'Correlation Analysis',
    description: 'Find correlations between lab markers and outcomes',
    icon: GitBranch,
    color: 'purple',
  },
  {
    id: 'trend',
    name: 'Trend Analysis',
    description: 'Analyze time-based trends in the data',
    icon: TrendingUp,
    color: 'green',
  },
];

function NewAnalysisPage() {
  const router = useRouter();
  useAuth();
  
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    datasetType: '',
    analysisType: '',
  });

  useEffect(() => {
    fetchDatasets();
  }, []);

  const fetchDatasets = async () => {
    try {
      setLoading(true);
      const response = await researcherApi.getDatasets();
      if (response.success) {
        setDatasets(response.datasets);
      }
    } catch (err: any) {
      console.error('Failed to fetch datasets:', err);
      setError('Failed to load datasets');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.datasetType || !formData.analysisType) {
      setError('Please select a dataset and analysis type');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const response = await api.post('/researcher/analysis', {
        name: formData.name || `${formData.analysisType} Analysis`,
        datasetType: formData.datasetType,
        analysisType: formData.analysisType,
      });

      if (response.data.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/dashboard/researcher/analyses');
        }, 2000);
      }
    } catch (err: any) {
      console.error('Failed to run analysis:', err);
      setError(err.response?.data?.message || 'Failed to run analysis. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Analysis Complete!</h2>
            <p className="text-gray-600 mb-4">
              Your analysis has been completed successfully. Redirecting to results...
            </p>
            <Loader2 className="h-5 w-5 animate-spin mx-auto text-blue-600" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/researcher/analyses"
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New Analysis</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Configure and run a new data analysis
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3 text-red-700 dark:text-red-400">
          <AlertTriangle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Analysis Name */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-purple-600" />
              Analysis Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Analysis Name (Optional)</Label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., TREC Level Correlation Study"
                  className="mt-1 w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Leave blank to auto-generate based on analysis type
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dataset Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-600" />
              Select Dataset
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              </div>
            ) : datasets.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Database className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No datasets available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* All datasets option */}
                <label
                  className={`flex items-center gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    formData.datasetType === 'all'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="dataset"
                    value="all"
                    checked={formData.datasetType === 'all'}
                    onChange={(e) => setFormData({ ...formData, datasetType: e.target.value })}
                    className="sr-only"
                  />
                  <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                    <Database className="h-5 w-5 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">All Datasets</p>
                    <p className="text-sm text-gray-500">Analyze across all available data</p>
                  </div>
                  {formData.datasetType === 'all' && (
                    <CheckCircle className="h-5 w-5 text-blue-600" />
                  )}
                </label>

                {datasets.map((dataset) => (
                  <label
                    key={dataset.id}
                    className={`flex items-center gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.datasetType === dataset.type
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="dataset"
                      value={dataset.type}
                      checked={formData.datasetType === dataset.type}
                      onChange={(e) => setFormData({ ...formData, datasetType: e.target.value })}
                      className="sr-only"
                    />
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                      <Database className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">{dataset.name}</p>
                      <p className="text-sm text-gray-500">{dataset.recordCount} records</p>
                    </div>
                    {formData.datasetType === dataset.type && (
                      <CheckCircle className="h-5 w-5 text-blue-600" />
                    )}
                  </label>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Analysis Type Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-600" />
              Select Analysis Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analysisTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <label
                    key={type.id}
                    className={`flex items-center gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.analysisType === type.id
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="analysisType"
                      value={type.id}
                      checked={formData.analysisType === type.id}
                      onChange={(e) => setFormData({ ...formData, analysisType: e.target.value })}
                      className="sr-only"
                    />
                    <div className={`w-10 h-10 bg-${type.color}-100 dark:bg-${type.color}-900/30 rounded-lg flex items-center justify-center`}>
                      <Icon className={`h-5 w-5 text-${type.color}-600`} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">{type.name}</p>
                      <p className="text-sm text-gray-500">{type.description}</p>
                    </div>
                    {formData.analysisType === type.id && (
                      <CheckCircle className="h-5 w-5 text-purple-600" />
                    )}
                  </label>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Link
            href="/dashboard/researcher/analyses"
            className="px-6 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </Link>
          <Button
            type="submit"
            disabled={submitting || !formData.datasetType || !formData.analysisType}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Running Analysis...
              </>
            ) : (
              <>
                <FlaskConical className="h-4 w-4 mr-2" />
                Run Analysis
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default withAuth(NewAnalysisPage, ['researcher', 'admin']);
