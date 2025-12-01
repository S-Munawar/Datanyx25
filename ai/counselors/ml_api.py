"""
ImmunoDetect ML API Service
FastAPI wrapper for the XGBoost immunodeficiency prediction model
"""

from fastapi import FastAPI, HTTPException, File, UploadFile, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import pandas as pd
import numpy as np
import joblib
import os
from datetime import datetime
import logging
import tempfile
import shutil

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="ImmunoDetect ML API",
    description="AI-powered immunodeficiency disease prediction service",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5000",
        os.getenv("FRONTEND_URL", "http://localhost:3000")
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Model path
MODEL_FILE = os.path.join(os.path.dirname(__file__), 'immunology_model.pkl')
SYSTEM = None


# ==========================================
# PYDANTIC MODELS
# ==========================================

class PatientData(BaseModel):
    """Patient demographics and clinical data"""
    age_years: float = Field(..., ge=0, le=120, description="Patient age in years")
    gender: str = Field(..., description="Patient gender (Male/Female)")
    family_history: str = Field(default="No", description="Family history of immunodeficiency (Yes/No)")
    consanguinity: str = Field(default="No", description="Consanguinity present (Yes/No)")
    
    # Clinical symptoms
    infection_ear_freq: int = Field(default=0, ge=0, description="Frequency of ear infections")
    infection_lung_freq: int = Field(default=0, ge=0, description="Frequency of lung infections")
    persistent_thrush: str = Field(default="None", description="Thrush status (None/Occasional/Persistent)")
    chronic_diarrhea: str = Field(default="None", description="Diarrhea status (None/Occasional/Chronic)")
    failure_to_thrive: str = Field(default="No", description="Failure to thrive (Yes/No)")
    history_iv_antibiotics: str = Field(default="No", description="History of IV antibiotics (Yes/No)")
    
    # Lab results
    lab_alc_level: float = Field(default=1000, ge=0, description="Absolute lymphocyte count")
    lab_igg_level: float = Field(default=700, ge=0, description="IgG level (mg/dL)")
    
    # Optional primary gene
    primary_gene_symbol: Optional[str] = Field(default=None, description="Primary gene of interest")


class GeneExpressionData(BaseModel):
    """Gene expression data for prediction"""
    cd3: float = Field(default=0, description="CD3+ T-cell count")
    cd4: float = Field(default=0, description="CD4+ T-cell count")
    cd8: float = Field(default=0, description="CD8+ T-cell count")
    cd19: float = Field(default=0, description="CD19+ B-cell count")
    cd56: float = Field(default=0, description="CD56+ NK cell count")
    igG: float = Field(default=0, description="IgG level")
    igA: float = Field(default=0, description="IgA level")
    igM: float = Field(default=0, description="IgM level")
    ada: float = Field(default=0, description="ADA enzyme activity")
    pnp: float = Field(default=0, description="PNP enzyme activity")
    
    # Additional gene expression markers (optional)
    additional_markers: Optional[Dict[str, float]] = None


class PredictionRequest(BaseModel):
    """Combined prediction request"""
    patient_data: PatientData
    gene_expression: Optional[GeneExpressionData] = None


class PredictionResponse(BaseModel):
    """Prediction result"""
    success: bool
    diagnosis: str
    confidence: float
    risk_level: str
    features_used: List[str]
    feature_importance: Optional[Dict[str, float]] = None
    model_version: str = "1.0.0"
    predicted_at: datetime
    explanation: str


class HealthCheckResponse(BaseModel):
    """Health check response"""
    status: str
    model_loaded: bool
    model_version: str
    timestamp: datetime


# ==========================================
# MODEL LOADING
# ==========================================

def load_model():
    """Load the trained model artifacts"""
    global SYSTEM
    
    if not os.path.exists(MODEL_FILE):
        logger.warning(f"Model file not found at {MODEL_FILE}")
        return None
        
    try:
        SYSTEM = joblib.load(MODEL_FILE)
        logger.info("ML System loaded successfully")
        return SYSTEM
    except Exception as e:
        logger.error(f"Error loading model: {e}")
        return None


def get_model():
    """Dependency to ensure model is loaded"""
    global SYSTEM
    if SYSTEM is None:
        SYSTEM = load_model()
    if SYSTEM is None:
        raise HTTPException(
            status_code=503,
            detail="ML model not available. Please ensure the model is trained."
        )
    return SYSTEM


# ==========================================
# PREDICTION LOGIC
# ==========================================

def calculate_risk_level(confidence: float, diagnosis: str) -> str:
    """Calculate risk level based on confidence and diagnosis"""
    if diagnosis.upper() in ['HEALTHY', 'NORMAL', 'NO_DISEASE']:
        return 'LOW'
    
    if confidence >= 0.85:
        if 'SCID' in diagnosis.upper():
            return 'CRITICAL'
        return 'HIGH'
    elif confidence >= 0.7:
        return 'HIGH' if 'SCID' in diagnosis.upper() else 'MODERATE'
    elif confidence >= 0.5:
        return 'MODERATE'
    else:
        return 'LOW'


def generate_explanation(diagnosis: str, confidence: float, risk_level: str) -> str:
    """Generate human-readable explanation of prediction"""
    explanations = {
        'SCID_X_Linked': (
            "X-linked Severe Combined Immunodeficiency (SCID-X1) is indicated. "
            "This condition is caused by mutations in the IL2RG gene affecting T and NK cell development. "
            "Immediate consultation with an immunologist is recommended."
        ),
        'SCID_ADA_Deficiency': (
            "Adenosine Deaminase (ADA) deficiency is indicated. "
            "This metabolic disorder affects lymphocyte development and survival. "
            "Enzyme replacement therapy or gene therapy may be treatment options."
        ),
        'Healthy': (
            "Analysis suggests normal immune function. "
            "No significant indicators of primary immunodeficiency were detected. "
            "Continue routine monitoring as recommended by your healthcare provider."
        ),
    }
    
    base_explanation = explanations.get(diagnosis, 
        f"The analysis indicates {diagnosis}. Please consult with a specialist for confirmation.")
    
    confidence_note = f"\n\nPrediction confidence: {confidence:.1%}. "
    if confidence < 0.7:
        confidence_note += "Due to moderate confidence, clinical correlation is strongly recommended."
    
    risk_note = f"Risk assessment: {risk_level}."
    
    return base_explanation + confidence_note + risk_note


def prepare_input_data(patient_data: PatientData, gene_expression: Optional[GeneExpressionData], system: dict) -> pd.DataFrame:
    """Prepare input data for model prediction"""
    feature_names = system['feature_names']
    encoders = system['encoders']
    scaler = system['scaler']
    
    # Initialize DataFrame with zeros
    input_df = pd.DataFrame(columns=feature_names)
    input_df.loc[0] = 0
    
    # Map patient data to model features
    field_mapping = {
        'Age_Years': patient_data.age_years,
        'Gender': patient_data.gender,
        'Family_History': patient_data.family_history,
        'Consanguinity': patient_data.consanguinity,
        'Infection_Ear_Freq': patient_data.infection_ear_freq,
        'Infection_Lung_Freq': patient_data.infection_lung_freq,
        'Persistent_Thrush': patient_data.persistent_thrush,
        'Chronic_Diarrhea': patient_data.chronic_diarrhea,
        'Failure_to_Thrive': patient_data.failure_to_thrive,
        'History_IV_Antibiotics': patient_data.history_iv_antibiotics,
        'Lab_ALC_Level': patient_data.lab_alc_level,
        'Lab_IgG_Level': patient_data.lab_igg_level,
    }
    
    if patient_data.primary_gene_symbol:
        field_mapping['Primary_Gene_Symbol'] = patient_data.primary_gene_symbol
    
    # Apply field mapping
    for col, value in field_mapping.items():
        if col in feature_names:
            if col in encoders:
                try:
                    encoded_val = encoders[col].transform([value])[0]
                    input_df.at[0, col] = encoded_val
                except ValueError:
                    logger.warning(f"Unknown category '{value}' for {col}, using default")
                    input_df.at[0, col] = 0
            else:
                input_df.at[0, col] = value
    
    # Add gene expression data if provided
    if gene_expression:
        gene_mapping = {
            'Gene_Exp_CD3': gene_expression.cd3,
            'Gene_Exp_CD4': gene_expression.cd4,
            'Gene_Exp_CD8': gene_expression.cd8,
            'Gene_Exp_CD19': gene_expression.cd19,
            'Gene_Exp_CD56': gene_expression.cd56,
            'Gene_Exp_IgG': gene_expression.igG,
            'Gene_Exp_IgA': gene_expression.igA,
            'Gene_Exp_IgM': gene_expression.igM,
            'Gene_Exp_ADA': gene_expression.ada,
            'Gene_Exp_PNP': gene_expression.pnp,
        }
        
        for col, value in gene_mapping.items():
            if col in feature_names:
                input_df.at[0, col] = value
        
        # Additional markers
        if gene_expression.additional_markers:
            for marker, value in gene_expression.additional_markers.items():
                if marker in feature_names:
                    input_df.at[0, marker] = value
    
    # Scale numerical features
    numerical_cols = [col for col in feature_names if col not in encoders]
    input_df[numerical_cols] = scaler.transform(input_df[numerical_cols])
    
    # Ensure correct column order
    input_df = input_df[feature_names]
    
    return input_df


# ==========================================
# API ENDPOINTS
# ==========================================

@app.on_event("startup")
async def startup_event():
    """Load model on startup"""
    load_model()


@app.get("/", response_model=dict)
async def root():
    """Root endpoint"""
    return {
        "service": "ImmunoDetect ML API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }


@app.get("/health", response_model=HealthCheckResponse)
async def health_check():
    """Health check endpoint"""
    return HealthCheckResponse(
        status="healthy" if SYSTEM else "degraded",
        model_loaded=SYSTEM is not None,
        model_version="1.0.0",
        timestamp=datetime.now()
    )


@app.post("/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest, system: dict = Depends(get_model)):
    """
    Make a prediction based on patient data and optional gene expression
    """
    try:
        # Prepare input data
        input_df = prepare_input_data(request.patient_data, request.gene_expression, system)
        
        model = system['model']
        encoders = system['encoders']
        target_encoder = encoders['Diagnosis_Target']
        
        # Make prediction
        pred_idx = model.predict(input_df)[0]
        pred_probs = model.predict_proba(input_df)[0]
        
        # Decode prediction
        diagnosis = target_encoder.inverse_transform([pred_idx])[0]
        confidence = float(pred_probs[pred_idx])
        
        # Calculate risk level
        risk_level = calculate_risk_level(confidence, diagnosis)
        
        # Get feature importance (if available)
        feature_importance = None
        if hasattr(model, 'feature_importances_'):
            importances = model.feature_importances_
            feature_importance = {
                name: float(imp) 
                for name, imp in zip(system['feature_names'], importances)
                if imp > 0.01  # Only include significant features
            }
            # Sort by importance
            feature_importance = dict(sorted(
                feature_importance.items(), 
                key=lambda x: x[1], 
                reverse=True
            )[:10])  # Top 10 features
        
        # Generate explanation
        explanation = generate_explanation(diagnosis, confidence, risk_level)
        
        return PredictionResponse(
            success=True,
            diagnosis=diagnosis,
            confidence=confidence * 100,  # Convert to percentage
            risk_level=risk_level,
            features_used=system['feature_names'],
            feature_importance=feature_importance,
            predicted_at=datetime.now(),
            explanation=explanation
        )
        
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@app.post("/predict-from-csv")
async def predict_from_csv(
    age_years: float,
    gender: str,
    family_history: str = "No",
    gene_csv: UploadFile = File(...),
    system: dict = Depends(get_model)
):
    """
    Make prediction using uploaded CSV file with gene expression data
    """
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix='.csv') as tmp:
            shutil.copyfileobj(gene_csv.file, tmp)
            tmp_path = tmp.name
        
        # Read gene expression from CSV
        gene_df = pd.read_csv(tmp_path)
        gene_map = dict(zip(gene_df.iloc[:, 0], gene_df.iloc[:, 1]))
        
        # Create patient data
        patient_data = PatientData(
            age_years=age_years,
            gender=gender,
            family_history=family_history
        )
        
        # Create gene expression data from CSV
        gene_expression = GeneExpressionData(
            cd3=gene_map.get('CD3', 0),
            cd4=gene_map.get('CD4', 0),
            cd8=gene_map.get('CD8', 0),
            cd19=gene_map.get('CD19', 0),
            cd56=gene_map.get('CD56', 0),
            igG=gene_map.get('IgG', gene_map.get('IGG', 0)),
            igA=gene_map.get('IgA', gene_map.get('IGA', 0)),
            igM=gene_map.get('IgM', gene_map.get('IGM', 0)),
            ada=gene_map.get('ADA', 0),
            pnp=gene_map.get('PNP', 0),
            additional_markers={k: v for k, v in gene_map.items() 
                               if k not in ['CD3', 'CD4', 'CD8', 'CD19', 'CD56', 
                                           'IgG', 'IgA', 'IgM', 'ADA', 'PNP']}
        )
        
        # Clean up temp file
        os.unlink(tmp_path)
        
        # Make prediction
        request = PredictionRequest(
            patient_data=patient_data,
            gene_expression=gene_expression
        )
        
        return await predict(request, system)
        
    except Exception as e:
        logger.error(f"CSV prediction error: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@app.get("/model-info")
async def model_info(system: dict = Depends(get_model)):
    """Get information about the loaded model"""
    model = system['model']
    target_encoder = system['encoders']['Diagnosis_Target']
    
    return {
        "model_type": type(model).__name__,
        "feature_count": len(system['feature_names']),
        "features": system['feature_names'],
        "target_classes": list(target_encoder.classes_),
        "model_params": model.get_params() if hasattr(model, 'get_params') else {}
    }


@app.get("/diseases")
async def get_diseases(system: dict = Depends(get_model)):
    """Get list of detectable diseases"""
    target_encoder = system['encoders']['Diagnosis_Target']
    
    disease_info = {
        'SCID_X_Linked': {
            'name': 'X-linked Severe Combined Immunodeficiency',
            'gene': 'IL2RG',
            'inheritance': 'X-linked recessive',
            'description': 'Most common form of SCID, affecting T and NK cell development'
        },
        'SCID_ADA_Deficiency': {
            'name': 'Adenosine Deaminase Deficiency',
            'gene': 'ADA',
            'inheritance': 'Autosomal recessive',
            'description': 'Metabolic disorder causing accumulation of toxic metabolites'
        },
        'Healthy': {
            'name': 'No Immunodeficiency Detected',
            'gene': 'N/A',
            'inheritance': 'N/A',
            'description': 'Normal immune function indicators'
        }
    }
    
    return {
        "detectable_conditions": list(target_encoder.classes_),
        "detailed_info": {
            cls: disease_info.get(cls, {'name': cls, 'description': 'Information not available'})
            for cls in target_encoder.classes_
        }
    }


# ==========================================
# MAIN
# ==========================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
