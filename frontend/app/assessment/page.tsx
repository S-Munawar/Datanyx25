'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Activity, 
  Dna, 
  FlaskConical, 
  User, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2,
  ChevronDown,
  Stethoscope
} from 'lucide-react';

interface Patient {
  id: string;
  name: string;
  email: string;
}

interface PredictionResult {
  diagnosis: string;
  confidence: number;
  riskLevel: string;
  probabilities: Record<string, number>;
  recommendations: string[];
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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export default function AssessmentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [mlStatus, setMlStatus] = useState<'checking' | 'available' | 'unavailable'>('checking');
  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showPatientSelect, setShowPatientSelect] = useState(false);

  const [patientData, setPatientData] = useState<PatientData>({
    ageYears: 0.5,
    gender: 'Male',
    familyHistory: false,
    consanguinity: false,
    infectionEarFreq: 0,
    infectionLungFreq: 0,
    persistentThrush: 'No',
    chronicDiarrhea: 'No',
    failureToThrive: false,
    historyIVAntibiotics: false,
    labALCLevel: 1500,
    labIgGLevel: 600,
    primaryGeneSymbol: '',
  });

  useEffect(() => {
    checkMLStatus();
    fetchPatients();
  }, []);

  const checkMLStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/assessment/ml-status`);
      const data = await res.json();
      setMlStatus(data.status === 'available' ? 'available' : 'unavailable');
    } catch {
      setMlStatus('unavailable');
    }
  };

  const fetchPatients = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${API_BASE}/assessment/patients`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success) {
        setPatients(data.patients || []);
      }
    } catch (err) {
      console.error('Failed to fetch patients:', err);
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
          patientData,
          runPrediction: true,
        }),
      });

      const data = await res.json();

      if (data.success && data.prediction) {
        setPredictionResult(data.prediction);
      } else {
        setError(data.message || 'Failed to get prediction');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit assessment');
    } finally {
      setLoading(false);
    }
  };

  const handlePredictOnly = async () => {
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

  const getRiskStyles = (level: string) => {
    switch (level.toLowerCase()) {
      case 'critical': return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100 text-red-800' };
      case 'high': return { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-800' };
      case 'moderate': return { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', badge: 'bg-yellow-100 text-yellow-800' };
      default: return { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-800' };
    }
  };

  // Helper component for section headers
  const SectionHeader = ({ icon: Icon, title }: { icon: any, title: string }) => (
    <div className="flex items-center space-x-2 mb-4 pb-2 border-b border-gray-100">
      <div className="p-1.5 bg-blue-50 rounded-md text-blue-600">
        <Icon size={18} />
      </div>
      <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">{title}</h3>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 py-10 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Section */}
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <Link 
              href="/" 
              className="group inline-flex items-center text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors mb-3"
            >
              <ArrowLeft size={16} className="mr-1 group-hover:-translate-x-1 transition-transform" />
              Back to Dashboard
            </Link>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Clinical Assessment</h1>
            <p className="text-slate-500 mt-2 text-lg">
              AI-powered immunodeficiency screening and risk stratification
            </p>
          </div>
          
          <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-200">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-sm font-medium text-slate-600">ML Engine Ready</span>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: Input Form */}
          <div className="xl:col-span-7 space-y-6">
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              
              {/* Optional Patient Link */}
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-100">
                {patients.length > 0 && (
                  <div className="relative">
                    {selectedPatient ? (
                      <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-blue-100 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                            {selectedPatient.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{selectedPatient.name}</p>
                            <p className="text-xs text-slate-500">{selectedPatient.email}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedPatient(null)}
                          className="text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Unlink
                        </button>
                      </div>
                    ) : (
                      <div>
                        <button
                          type="button"
                          onClick={() => setShowPatientSelect(!showPatientSelect)}
                          className="w-full flex items-center justify-between bg-white p-3 rounded-xl border border-slate-300 hover:border-blue-400 text-left text-slate-600 transition-all focus:outline-none focus:ring-2 focus:ring-blue-100"
                        >
                          <span className="flex items-center gap-2">
                            <User size={18} />
                            Link to existing patient (Optional)
                          </span>
                          <ChevronDown size={16} className={`transition-transform ${showPatientSelect ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {showPatientSelect && (
                          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 z-20 max-h-60 overflow-y-auto">
                            {patients.map((patient) => (
                              <button
                                key={patient.id}
                                type="button"
                                onClick={() => {
                                  setSelectedPatient(patient);
                                  setShowPatientSelect(false);
                                }}
                                className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 transition-colors"
                              >
                                <p className="font-medium text-sm text-slate-900">{patient.name}</p>
                                <p className="text-xs text-slate-500">{patient.email}</p>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-6 md:p-8 space-y-8">
                
                {/* 1. Demographics */}
                <section>
                  <SectionHeader icon={User} title="Demographics & History" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Age (Years)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={patientData.ageYears}
                        onChange={(e) => setPatientData({...patientData, ageYears: parseFloat(e.target.value) || 0})}
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Gender</label>
                      <div className="relative">
                        <select
                          value={patientData.gender}
                          onChange={(e) => setPatientData({...patientData, gender: e.target.value as 'Male' | 'Female'})}
                          className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none appearance-none bg-white"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                        <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${patientData.familyHistory ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 hover:border-slate-300'}`}>
                      <input
                        type="checkbox"
                        checked={patientData.familyHistory}
                        onChange={(e) => setPatientData({...patientData, familyHistory: e.target.checked})}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                      />
                      <span className="ml-3 font-medium text-slate-700">Family History</span>
                    </label>
                    <label className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${patientData.consanguinity ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 hover:border-slate-300'}`}>
                      <input
                        type="checkbox"
                        checked={patientData.consanguinity}
                        onChange={(e) => setPatientData({...patientData, consanguinity: e.target.checked})}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                      />
                      <span className="ml-3 font-medium text-slate-700">Consanguinity</span>
                    </label>
                  </div>
                </section>

                {/* 2. Clinical Symptoms */}
                <section>
                  <SectionHeader icon={Activity} title="Clinical Symptoms" />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Ear Infections <span className="text-slate-400 font-normal">(per year)</span></label>
                      <input
                        type="number"
                        min="0"
                        value={patientData.infectionEarFreq}
                        onChange={(e) => setPatientData({...patientData, infectionEarFreq: parseInt(e.target.value) || 0})}
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Lung Infections <span className="text-slate-400 font-normal">(per year)</span></label>
                      <input
                        type="number"
                        min="0"
                        value={patientData.infectionLungFreq}
                        onChange={(e) => setPatientData({...patientData, infectionLungFreq: parseInt(e.target.value) || 0})}
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Persistent Thrush</label>
                      <div className="relative">
                        <select
                          value={patientData.persistentThrush}
                          onChange={(e) => setPatientData({...patientData, persistentThrush: e.target.value})}
                          className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none appearance-none bg-white"
                        >
                          <option value="No">No</option>
                          <option value="Persistent">Yes, Persistent</option>
                        </select>
                        <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Chronic Diarrhea</label>
                      <div className="relative">
                        <select
                          value={patientData.chronicDiarrhea}
                          onChange={(e) => setPatientData({...patientData, chronicDiarrhea: e.target.value})}
                          className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none appearance-none bg-white"
                        >
                          <option value="No">No</option>
                          <option value="Chronic">Yes, Chronic</option>
                        </select>
                        <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${patientData.failureToThrive ? 'border-red-400 bg-red-50/30' : 'border-slate-200 hover:border-slate-300'}`}>
                      <input
                        type="checkbox"
                        checked={patientData.failureToThrive}
                        onChange={(e) => setPatientData({...patientData, failureToThrive: e.target.checked})}
                        className="w-5 h-5 text-red-600 rounded focus:ring-red-500 border-gray-300"
                      />
                      <span className="ml-3 font-medium text-slate-700">Failure to Thrive</span>
                    </label>
                    <label className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${patientData.historyIVAntibiotics ? 'border-orange-400 bg-orange-50/30' : 'border-slate-200 hover:border-slate-300'}`}>
                      <input
                        type="checkbox"
                        checked={patientData.historyIVAntibiotics}
                        onChange={(e) => setPatientData({...patientData, historyIVAntibiotics: e.target.checked})}
                        className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500 border-gray-300"
                      />
                      <span className="ml-3 font-medium text-slate-700">History of IV Antibiotics</span>
                    </label>
                  </div>
                </section>

                {/* 3. Lab Values */}
                <section>
                  <SectionHeader icon={FlaskConical} title="Laboratory Results" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <div className="flex justify-between items-baseline mb-2">
                        <label className="block text-sm font-semibold text-slate-700">ALC Level</label>
                        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">Ref: 1500-3000 cells/μL</span>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          value={patientData.labALCLevel}
                          onChange={(e) => setPatientData({...patientData, labALCLevel: parseInt(e.target.value) || 0})}
                          className={`w-full pl-4 pr-12 py-2.5 rounded-lg border focus:ring-4 transition-all outline-none ${
                            patientData.labALCLevel < 1500 ? 'border-orange-300 focus:border-orange-500 focus:ring-orange-500/10' : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500/10'
                          }`}
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">cells/μL</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-baseline mb-2">
                        <label className="block text-sm font-semibold text-slate-700">IgG Level</label>
                        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">Ref: 600-1600 mg/dL</span>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          value={patientData.labIgGLevel}
                          onChange={(e) => setPatientData({...patientData, labIgGLevel: parseInt(e.target.value) || 0})}
                          className={`w-full pl-4 pr-12 py-2.5 rounded-lg border focus:ring-4 transition-all outline-none ${
                            patientData.labIgGLevel < 600 ? 'border-orange-300 focus:border-orange-500 focus:ring-orange-500/10' : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500/10'
                          }`}
                        />
                         <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">mg/dL</span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* 4. Genomics */}
                <section>
                  <SectionHeader icon={Dna} title="Genomics" />
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Primary Gene Suspect <span className="text-slate-400 font-normal">(Optional)</span></label>
                    <div className="relative">
                      <input
                        type="text"
                        value={patientData.primaryGeneSymbol}
                        onChange={(e) => setPatientData({...patientData, primaryGeneSymbol: e.target.value.toUpperCase()})}
                        placeholder="e.g., IL2RG, ADA"
                        className="w-full pl-10 px-4 py-2.5 rounded-lg border border-slate-300 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all outline-none uppercase placeholder:normal-case"
                      />
                      <Dna size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                    <p className="text-xs text-slate-500 mt-2">Enter standard HUGO gene nomenclature if genetic screening data is available.</p>
                  </div>
                </section>

              </div>
              
              {/* Footer Actions */}
              <div className="bg-slate-50 px-6 py-5 border-t border-slate-200 flex flex-col sm:flex-row gap-4">
                <button
                  type="button"
                  onClick={handlePredictOnly}
                  disabled={loading}
                  className="flex-1 py-3 px-6 bg-white border border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 hover:border-slate-400 focus:ring-4 focus:ring-slate-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <Stethoscope size={20} />}
                  Run Simulation
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  // className="flex-1 py-3 px-6 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/20 focus:ring-4 focus:ring-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
>
                  {/* {loading ? 'Processing...' : 'Save & Analyze'} */}
                </button>
              </div>
            </form>
          </div>

          {/* RIGHT COLUMN: Results */}
          <div className="xl:col-span-5">
            <div className="sticky top-8 space-y-6">
              
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg shadow-sm flex items-start gap-3 animate-in slide-in-from-top-2">
                  <AlertTriangle className="text-red-500 shrink-0" size={24} />
                  <div>
                    <h3 className="font-bold text-red-800">Assessment Failed</h3>
                    <p className="text-red-700 text-sm mt-1">{error}</p>
                  </div>
                </div>
              )}

              {predictionResult ? (
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                  {/* Result Header */}
                  <div className={`px-6 py-6 border-b ${getRiskStyles(predictionResult.riskLevel).bg} ${getRiskStyles(predictionResult.riskLevel).border}`}>
                    <div className="flex justify-between items-start mb-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getRiskStyles(predictionResult.riskLevel).badge}`}>
                        {predictionResult.riskLevel} Risk
                      </span>
                      <div className="text-right">
                        <span className="block text-xs font-bold text-slate-500 uppercase">Confidence</span>
                        <span className="text-xl font-black text-slate-800">{predictionResult.confidence.toFixed(1)}%</span>
                      </div>
                    </div>
                    <h2 className={`text-2xl font-bold ${getRiskStyles(predictionResult.riskLevel).text}`}>
                      {predictionResult.diagnosis.replace(/_/g, ' ')}
                    </h2>
                    <p className="text-slate-600 text-sm mt-1">
                      Based on analysis of {Object.keys(patientData).length} clinical parameters.
                    </p>
                  </div>

                  {/* Probabilities */}
                  {predictionResult.probabilities && Object.keys(predictionResult.probabilities).length > 0 && (
                    <div className="p-6 border-b border-slate-100">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Activity size={14} />
                        Differential Diagnosis
                      </h3>
                      <div className="space-y-4">
                        {Object.entries(predictionResult.probabilities)
                          .sort(([,a], [,b]) => b - a)
                          .slice(0, 4) // Show top 4
                          .map(([cls, prob]) => (
                            <div key={cls}>
                              <div className="flex justify-between text-sm mb-1.5">
                                <span className="font-medium text-slate-700">{cls.replace(/_/g, ' ')}</span>
                                <span className="font-bold text-slate-900">{prob.toFixed(1)}%</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-1000 ease-out ${
                                    cls === predictionResult.diagnosis ? 'bg-blue-600' : 'bg-slate-300'
                                  }`}
                                  style={{ width: `${prob}%` }}
                                ></div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  <div className="p-6 bg-slate-50/50">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <FileText size={14} />
                      Clinical Recommendations
                    </h3>
                    <ul className="space-y-3">
                      {predictionResult.recommendations && predictionResult.recommendations.length > 0 ? (
                        predictionResult.recommendations.map((rec, idx) => (
                          <li key={idx} className="flex items-start text-sm text-slate-600 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                            <CheckCircle2 className="text-green-500 mr-3 shrink-0 mt-0.5" size={16} />
                            {rec}
                          </li>
                        ))
                      ) : (
                        <li className="text-sm text-slate-500 italic">No specific recommendations generated.</li>
                      )}
                    </ul>
                  </div>
                </div>
              ) : (
                /* Empty State */
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 text-center">
                  <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-500">
                    <Activity size={40} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Ready to Analyze</h3>
                  <p className="text-slate-500 max-w-xs mx-auto">
                    Complete the form on the left and click "Run Simulation" to generate a real-time risk assessment.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}