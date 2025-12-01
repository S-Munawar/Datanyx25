import { spawn } from 'child_process';
import path from 'path';

// Path to the Python inference script
const INFERENCE_SCRIPT = path.resolve(__dirname, '../../../ai/counselors/inference.py');
const PYTHON_PATH = process.env.PYTHON_PATH || 'python';

interface PatientData {
  ageYears: number;
  gender: 'Male' | 'Female';
  familyHistory?: boolean;
  consanguinity?: boolean;
  infectionEarFreq?: number;
  infectionLungFreq?: number;
  persistentThrush?: string;
  chronicDiarrhea?: string;
  failureToThrive?: boolean;
  historyIVAntibiotics?: boolean;
  labALCLevel: number;
  labIgGLevel: number;
  primaryGeneSymbol?: string;
}

interface GeneData {
  [geneSymbol: string]: number;
}

export interface PredictionResult {
  diagnosis: string;
  confidence: number;
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  riskScore: number;
  probabilities: Record<string, number>;
  recommendations: string[];
  featureImportance: Array<{
    feature: string;
    importance: number;
    direction: 'positive' | 'negative';
  }>;
  modelVersion: string;
}

/**
 * Run Python inference script and get prediction
 */
function runPythonInference(inputData: object): Promise<any> {
  return new Promise((resolve, reject) => {
    const jsonInput = JSON.stringify(inputData);
    const pythonProcess = spawn(PYTHON_PATH, [INFERENCE_SCRIPT, jsonInput]);
    
    let stdout = '';
    let stderr = '';
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error('Python stderr:', stderr);
        reject(new Error(`Python process exited with code ${code}: ${stderr}`));
        return;
      }
      
      try {
        const result = JSON.parse(stdout.trim());
        resolve(result);
      } catch (e) {
        reject(new Error(`Failed to parse Python output: ${stdout}`));
      }
    });
    
    pythonProcess.on('error', (err) => {
      reject(new Error(`Failed to start Python process: ${err.message}`));
    });
  });
}

/**
 * Get a prediction from the ML model
 */
export async function getPrediction(
  patientData: PatientData,
  geneData?: GeneData
): Promise<PredictionResult> {
  try {
    const result = await runPythonInference(patientData);
    
    if (result.success && result.prediction) {
      // Map the Python response to our expected format
      const pred = result.prediction;
      return {
        diagnosis: pred.diagnosis,
        confidence: pred.confidence,
        riskLevel: pred.riskLevel || 'moderate',
        riskScore: pred.confidence,
        probabilities: pred.probabilities || {},
        recommendations: pred.recommendations || [],
        featureImportance: [],
        modelVersion: pred.modelVersion || '1.0.0',
      };
    } else {
      console.warn('ML prediction failed:', result.error);
      return generateFallbackPrediction(patientData);
    }
  } catch (error: any) {
    console.error('ML Inference Error:', error.message);
    return generateFallbackPrediction(patientData);
  }
}

/**
 * Check if ML model is available
 */
export async function checkMLServiceHealth(): Promise<boolean> {
  try {
    const result = await runPythonInference({});
    return result.success && result.modelLoaded;
  } catch {
    return false;
  }
}

/**
 * Fallback prediction when ML service is unavailable
 * Uses simple heuristics based on lab values
 */
function generateFallbackPrediction(patientData: PatientData): PredictionResult {
  const { labALCLevel, labIgGLevel, ageYears, familyHistory } = patientData;
  
  let diagnosis = 'Healthy_Control';
  let confidence = 70;
  let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
  let riskScore = 20;
  
  // Simple heuristic-based prediction
  if (labALCLevel < 300 && labIgGLevel < 200) {
    diagnosis = 'SCID_X_Linked';
    confidence = 85;
    riskLevel = 'critical';
    riskScore = 90;
  } else if (labALCLevel < 500 && labIgGLevel < 300) {
    diagnosis = 'SCID_ADA_Deficiency';
    confidence = 75;
    riskLevel = 'high';
    riskScore = 80;
  } else if (labALCLevel < 1000 || labIgGLevel < 400) {
    diagnosis = 'Immunodeficiency_Suspected';
    confidence = 60;
    riskLevel = 'moderate';
    riskScore = 50;
  }
  
  // Family history increases risk
  if (familyHistory && riskLevel !== 'critical') {
    riskScore = Math.min(100, riskScore + 10);
  }
  
  // Age factor - very young patients at higher risk
  if (ageYears < 1 && diagnosis.includes('SCID')) {
    riskLevel = 'critical';
    riskScore = Math.min(100, riskScore + 5);
  }
  
  return {
    diagnosis,
    confidence,
    riskLevel,
    riskScore,
    probabilities: {
      [diagnosis]: confidence,
      'Other': 100 - confidence,
    },
    recommendations: getRecommendations(diagnosis, riskLevel),
    featureImportance: [
      { feature: 'Lab_ALC_Level', importance: 0.35, direction: labALCLevel < 1000 ? 'negative' : 'positive' as const },
      { feature: 'Lab_IgG_Level', importance: 0.30, direction: labIgGLevel < 400 ? 'negative' : 'positive' as const },
      { feature: 'Family_History', importance: 0.15, direction: familyHistory ? 'positive' : 'negative' as const },
    ],
    modelVersion: 'fallback-1.0',
  };
}

function getRecommendations(diagnosis: string, riskLevel: string): string[] {
  if (diagnosis.includes('SCID_X')) {
    return [
      'URGENT: Immediate consultation with pediatric immunologist',
      'Consider hematopoietic stem cell transplantation (HSCT)',
      'Implement protective isolation protocols',
      'Avoid live vaccines',
      'Prophylactic antimicrobial therapy',
    ];
  } else if (diagnosis.includes('SCID_ADA')) {
    return [
      'URGENT: Immediate consultation with pediatric immunologist',
      'Consider enzyme replacement therapy (PEG-ADA)',
      'Evaluate for gene therapy eligibility',
      'Implement protective isolation protocols',
    ];
  } else if (diagnosis.includes('Immunodeficiency')) {
    return [
      'Consult with immunologist for further evaluation',
      'Consider additional genetic testing',
      'Monitor immune function parameters',
    ];
  }
  
  return [
    'Continue routine pediatric care',
    'Follow standard immunization schedule',
    'Monitor for any new symptoms',
  ];
}

export default {
  getPrediction,
  checkMLServiceHealth,
};
