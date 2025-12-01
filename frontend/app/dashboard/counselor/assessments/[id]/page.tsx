'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { counselorApi } from '@/lib/api';

export default function CounselorAssessmentDetail() {
  const params = useParams();
  const router = useRouter();
  const [assessment, setAssessment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestingPrediction, setRequestingPrediction] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchAssessment();
    }
  }, [params.id]);

  const fetchAssessment = async () => {
    try {
      setLoading(true);
      const response = await counselorApi.getAssessment(params.id as string);
      setAssessment(response.assessment);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch assessment');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPrediction = async () => {
    try {
      setRequestingPrediction(true);
      await counselorApi.requestAssessmentPrediction(params.id as string);
      await fetchAssessment(); // Refresh
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to request prediction');
    } finally {
      setRequestingPrediction(false);
    }
  };

  const getRiskBadgeColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error || !assessment) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-800 p-4 rounded-lg">
          {error || 'Assessment not found'}
        </div>
        <button
          onClick={() => router.back()}
          className="mt-4 text-blue-600 hover:text-blue-800"
        >
          ← Go back
        </button>
      </div>
    );
  }

  const patient = assessment.patientId || {};
  const patientData = assessment.patientData || {};
  const prediction = assessment.prediction;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <Link href="/dashboard/counselor/assessments" className="text-blue-600 hover:text-blue-800 text-sm mb-2 inline-block">
            ← Back to Assessments
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Assessment {assessment.recordNumber}</h1>
          <p className="text-gray-600 mt-1">
            Created on {new Date(assessment.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${
            assessment.status === 'completed' ? 'bg-green-100 text-green-800' :
            assessment.status === 'processing' ? 'bg-blue-100 text-blue-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            {assessment.status}
          </span>
          {!prediction && assessment.status === 'pending' && (
            <button
              onClick={handleRequestPrediction}
              disabled={requestingPrediction}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {requestingPrediction ? 'Processing...' : 'Run Prediction'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Prediction Results */}
        {prediction && (
          <div className="lg:col-span-2">
            <div className={`bg-white rounded-lg shadow-lg border-2 ${getRiskBadgeColor(prediction.riskLevel)}`}>
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-4">AI Prediction Results</h2>
                
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Diagnosis</p>
                    <p className="text-xl font-bold text-gray-900">
                      {prediction.diagnosis?.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Confidence</p>
                    <p className="text-xl font-bold text-gray-900">
                      {prediction.confidence?.toFixed(1)}%
                    </p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Risk Level</p>
                    <p className={`text-xl font-bold capitalize ${
                      prediction.riskLevel === 'critical' ? 'text-red-600' :
                      prediction.riskLevel === 'high' ? 'text-orange-600' :
                      prediction.riskLevel === 'moderate' ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {prediction.riskLevel}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Risk Score</p>
                    <p className="text-xl font-bold text-gray-900">
                      {prediction.riskScore}/100
                    </p>
                  </div>
                </div>

                {prediction.recommendedAction && (
                  <div className="p-4 bg-blue-50 rounded-lg mb-6">
                    <p className="text-sm font-medium text-blue-800 mb-1">Recommended Action</p>
                    <p className="text-blue-900">{prediction.recommendedAction}</p>
                  </div>
                )}

                {/* Feature Importance */}
                {prediction.featureImportance && prediction.featureImportance.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium mb-3">Key Contributing Factors</h3>
                    <div className="space-y-3">
                      {prediction.featureImportance.map((fi: any, idx: number) => (
                        <div key={idx} className="flex items-center">
                          <span className="w-40 text-sm text-gray-600 truncate">
                            {fi.feature.replace(/_/g, ' ')}
                          </span>
                          <div className="flex-1 mx-3">
                            <div className="h-4 bg-gray-200 rounded-full">
                              <div
                                className={`h-4 rounded-full ${fi.direction === 'positive' ? 'bg-red-500' : 'bg-green-500'}`}
                                style={{ width: `${Math.min(fi.importance * 100, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                          <span className="w-16 text-sm text-gray-600 text-right">
                            {(fi.importance * 100).toFixed(1)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Patient Info & Data */}
        <div className={prediction ? 'lg:col-span-1' : 'lg:col-span-3'}>
          {/* Patient Info */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Patient Information</h2>
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center text-blue-800 font-bold text-lg mr-4">
                {patient.firstName?.charAt(0)}{patient.lastName?.charAt(0)}
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {patient.firstName} {patient.lastName}
                </p>
                <p className="text-sm text-gray-500">{patient.email}</p>
              </div>
            </div>
          </div>

          {/* Patient Data */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Assessment Data</h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Age</p>
                  <p className="text-sm font-medium">{patientData.ageYears} years</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Gender</p>
                  <p className="text-sm font-medium">{patientData.gender}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">ALC Level</p>
                  <p className="text-sm font-medium">{patientData.labALCLevel} cells/μL</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">IgG Level</p>
                  <p className="text-sm font-medium">{patientData.labIgGLevel} mg/dL</p>
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Clinical History</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center">
                    <span className={`w-2 h-2 rounded-full mr-2 ${patientData.familyHistory ? 'bg-orange-500' : 'bg-gray-300'}`}></span>
                    Family History
                  </div>
                  <div className="flex items-center">
                    <span className={`w-2 h-2 rounded-full mr-2 ${patientData.consanguinity ? 'bg-orange-500' : 'bg-gray-300'}`}></span>
                    Consanguinity
                  </div>
                  <div className="flex items-center">
                    <span className={`w-2 h-2 rounded-full mr-2 ${patientData.failureToThrive ? 'bg-orange-500' : 'bg-gray-300'}`}></span>
                    Failure to Thrive
                  </div>
                  <div className="flex items-center">
                    <span className={`w-2 h-2 rounded-full mr-2 ${patientData.historyIVAntibiotics ? 'bg-orange-500' : 'bg-gray-300'}`}></span>
                    IV Antibiotics History
                  </div>
                </div>
              </div>

              {patientData.primaryGeneSymbol && (
                <div className="border-t pt-4 mt-4">
                  <p className="text-xs text-gray-500">Primary Gene Symbol</p>
                  <p className="text-sm font-medium font-mono">{patientData.primaryGeneSymbol}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
