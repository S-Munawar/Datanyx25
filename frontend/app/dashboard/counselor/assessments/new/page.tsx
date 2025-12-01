'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Patient {
  id: string;
  name: string;
  email: string;
}

interface PatientData {
  ageYears: number;
  gender: 'Male' | 'Female';
  familyHistory: boolean;
  consanguinity: boolean;
  infectionEarFreq: number;
  infectionLungFreq: number;
  persistentThrush: string;
  chronicDiarrhea: string;
  failureToThrive: boolean;
  historyIVAntibiotics: boolean;
  labALCLevel: number;
  labIgGLevel: number;
  primaryGeneSymbol: string;
}

interface PredictionResult {
  diagnosis: string;
  confidence: number;
  riskLevel: string;
  riskScore: number;
  allProbabilities: Record<string, number>;
  recommendations: string[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export default function NewHealthAssessment() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mlStatus, setMlStatus] = useState<'checking' | 'available' | 'unavailable'>('checking');
  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);
  
  // Optional patient selection
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  
  // Form data with sensible defaults
  const [patientData, setPatientData] = useState<PatientData>({
    ageYears: 1,
    gender: 'Male',
    familyHistory: false,
    consanguinity: false,
    infectionEarFreq: 0,
    infectionLungFreq: 0,
    persistentThrush: 'No',
    chronicDiarrhea: 'No',
    failureToThrive: false,
    historyIVAntibiotics: false,
    labALCLevel: 2000,
    labIgGLevel: 800,
    primaryGeneSymbol: '',
  });

  useEffect(() => {
    checkMLStatus();
    fetchPatients();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPatients(patientSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [patientSearch]);

  const checkMLStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/assessment/ml-status`);
      const data = await res.json();
      setMlStatus(data.status === 'available' ? 'available' : 'unavailable');
    } catch {
      setMlStatus('unavailable');
    }
  };

  const fetchPatients = async (search?: string) => {
    try {
      setLoadingPatients(true);
      const token = localStorage.getItem('accessToken');
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      params.append('limit', '20');
      
      const res = await fetch(`${API_BASE}/assessment/patients?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success) {
        setPatients(data.patients || []);
      }
    } catch (err) {
      console.error('Failed to fetch patients:', err);
    } finally {
      setLoadingPatients(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setPredictionResult(null);

    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${API_BASE}/assessment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          patientId: selectedPatient?.id,
          patientData,
          runPrediction: true,
        }),
      });

      const data = await res.json();

      if (data.success) {
        if (data.prediction) {
          setPredictionResult(data.prediction);
        }
      } else {
        setError(data.message || 'Failed to create assessment');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit assessment');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async () => {
    setLoading(true);
    setError(null);
    setPredictionResult(null);

    try {
      const res = await fetch(`${API_BASE}/assessment/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientData }),
      });

      const data = await res.json();
      if (data.success && data.prediction) {
        setPredictionResult(data.prediction);
      } else {
        setError(data.message || 'Failed to get prediction');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to get prediction');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof PatientData, value: any) => {
    setPatientData(prev => ({ ...prev, [field]: value }));
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-50 border-red-200 text-red-800';
      case 'high': return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'moderate': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default: return 'bg-green-50 border-green-200 text-green-800';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New Health Assessment</h1>
        <p className="text-gray-600 mt-1">Enter patient data to generate an AI-powered immunodeficiency prediction</p>
        
        {/* ML Status */}
        <div className={`mt-4 inline-flex items-center px-3 py-1.5 rounded-full text-sm ${
          mlStatus === 'available' ? 'bg-green-100 text-green-800' :
          mlStatus === 'unavailable' ? 'bg-yellow-100 text-yellow-800' :
          'bg-gray-100 text-gray-600'
        }`}>
          <span className={`w-2 h-2 rounded-full mr-2 ${
            mlStatus === 'available' ? 'bg-green-500' :
            mlStatus === 'unavailable' ? 'bg-yellow-500' : 'bg-gray-400'
          }`}></span>
          {mlStatus === 'checking' ? 'Checking ML status...' :
           mlStatus === 'available' ? 'ML Model Ready' : 'Using Fallback Predictions'}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form - 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSubmit}>
            {/* Optional Patient Selection */}
            {patients.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4">Link to Patient (Optional)</h2>
                
                {selectedPatient ? (
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center mr-3 font-medium">
                        {selectedPatient.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium">{selectedPatient.name}</p>
                        <p className="text-sm text-gray-600">{selectedPatient.email}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedPatient(null)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search patients..."
                      value={patientSearch}
                      onChange={(e) => {
                        setPatientSearch(e.target.value);
                        setShowPatientDropdown(true);
                      }}
                      onFocus={() => setShowPatientDropdown(true)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {showPatientDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {loadingPatients ? (
                          <div className="p-4 text-center text-gray-500">Loading...</div>
                        ) : patients.length === 0 ? (
                          <div className="p-4 text-center text-gray-500">No patients found</div>
                        ) : (
                          patients.map((patient) => (
                            <button
                              key={patient.id}
                              type="button"
                              onClick={() => {
                                setSelectedPatient(patient);
                                setShowPatientDropdown(false);
                                setPatientSearch('');
                              }}
                              className="w-full flex items-center p-3 hover:bg-gray-50 border-b last:border-b-0 text-left"
                            >
                              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-3 text-sm">
                                {patient.name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-medium text-sm">{patient.name}</p>
                                <p className="text-xs text-gray-500">{patient.email}</p>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Demographics */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Patient Demographics</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Age (Years) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="120"
                    step="0.1"
                    value={patientData.ageYears}
                    onChange={(e) => updateField('ageYears', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={patientData.gender}
                    onChange={(e) => updateField('gender', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={patientData.familyHistory}
                    onChange={(e) => updateField('familyHistory', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Family History</span>
                </label>
                
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={patientData.consanguinity}
                    onChange={(e) => updateField('consanguinity', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Consanguinity</span>
                </label>
              </div>
            </div>

            {/* Clinical Symptoms */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Clinical Symptoms</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ear Infections (per year)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={patientData.infectionEarFreq}
                    onChange={(e) => updateField('infectionEarFreq', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lung Infections (per year)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={patientData.infectionLungFreq}
                    onChange={(e) => updateField('infectionLungFreq', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Persistent Thrush
                  </label>
                  <select
                    value={patientData.persistentThrush}
                    onChange={(e) => updateField('persistentThrush', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="No">No</option>
                    <option value="Persistent">Persistent</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Chronic Diarrhea
                  </label>
                  <select
                    value={patientData.chronicDiarrhea}
                    onChange={(e) => updateField('chronicDiarrhea', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="No">No</option>
                    <option value="Chronic">Chronic</option>
                  </select>
                </div>
                
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={patientData.failureToThrive}
                    onChange={(e) => updateField('failureToThrive', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Failure to Thrive</span>
                </label>
                
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={patientData.historyIVAntibiotics}
                    onChange={(e) => updateField('historyIVAntibiotics', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">History of IV Antibiotics</span>
                </label>
              </div>
            </div>

            {/* Lab Results */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Lab Results</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ALC Level (cells/μL) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="20000"
                    value={patientData.labALCLevel}
                    onChange={(e) => updateField('labALCLevel', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Normal: 1000-4800</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    IgG Level (mg/dL) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="5000"
                    value={patientData.labIgGLevel}
                    onChange={(e) => updateField('labIgGLevel', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Normal: 700-1600</p>
                </div>
                
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Primary Gene Symbol (optional)
                  </label>
                  <input
                    type="text"
                    value={patientData.primaryGeneSymbol}
                    onChange={(e) => updateField('primaryGeneSymbol', e.target.value.toUpperCase())}
                    placeholder="e.g., IL2RG, ADA, JAK3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={handlePreview}
                disabled={loading}
                className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 font-medium"
              >
                {loading ? 'Processing...' : 'Preview Prediction'}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
              >
                {loading ? 'Processing...' : 'Save Assessment'}
              </button>
            </div>
          </form>
        </div>

        {/* Results Panel - 1 column */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            {predictionResult ? (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">Prediction Results</h2>
                
                {/* Main Result */}
                <div className={`p-4 rounded-lg border mb-4 ${getRiskColor(predictionResult.riskLevel)}`}>
                  <p className="text-sm font-medium opacity-75 mb-1">Predicted Diagnosis</p>
                  <p className="text-xl font-bold">{predictionResult.diagnosis?.replace(/_/g, ' ')}</p>
                  
                  <div className="flex justify-between mt-3">
                    <div>
                      <p className="text-xs opacity-75">Confidence</p>
                      <p className="text-lg font-bold">{predictionResult.confidence?.toFixed(1)}%</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs opacity-75">Risk Level</p>
                      <p className="text-lg font-bold capitalize">{predictionResult.riskLevel}</p>
                    </div>
                  </div>
                </div>

                {/* Probabilities */}
                {predictionResult.allProbabilities && Object.keys(predictionResult.allProbabilities).length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Class Probabilities</h3>
                    <div className="space-y-2">
                      {Object.entries(predictionResult.allProbabilities)
                        .sort(([,a], [,b]) => (b as number) - (a as number))
                        .slice(0, 5)
                        .map(([cls, prob]) => (
                          <div key={cls}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-gray-600">{cls.replace(/_/g, ' ')}</span>
                              <span className="font-medium">{(prob as number).toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div
                                className="bg-blue-600 h-1.5 rounded-full"
                                style={{ width: `${prob}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {predictionResult.recommendations && predictionResult.recommendations.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Recommendations</h3>
                    <ul className="space-y-1">
                      {predictionResult.recommendations.map((rec, idx) => (
                        <li key={idx} className="flex items-start text-xs">
                          <span className="text-blue-500 mr-2">•</span>
                          <span className="text-gray-600">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-6 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-gray-900 mb-1">No Prediction Yet</h3>
                <p className="text-xs text-gray-500">
                  Fill out the form and click "Preview Prediction" to see ML results
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
