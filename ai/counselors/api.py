"""
AI Prediction API Server
Provides REST endpoints for the ImmunoDetect ML model
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
import joblib
import os
import traceback

app = Flask(__name__)
CORS(app)

# Load the trained model
MODEL_FILE = os.path.join(os.path.dirname(__file__), 'immunology_model.pkl')
SYSTEM = None

def load_system():
    """Loads the model, encoders, and scaler once at startup."""
    global SYSTEM
    try:
        print(f"Loading AI System from {MODEL_FILE}...")
        SYSTEM = joblib.load(MODEL_FILE)
        print("AI System loaded successfully!")
        return True
    except FileNotFoundError:
        print(f"Error: '{MODEL_FILE}' not found. Please run 'train_model.py' first!")
        return False

def predict_patient_status(patient_data, gene_data=None):
    """
    Main function to predict disease.
    Returns: (diagnosis, confidence, risk_level, all_probabilities, recommendations)
    """
    if SYSTEM is None:
        return {
            "error": "System not loaded",
            "diagnosis": "Unknown",
            "confidence": 0,
            "riskLevel": "unknown"
        }
    
    model = SYSTEM['model']
    encoders = SYSTEM['encoders']
    scaler = SYSTEM['scaler']
    feature_names = SYSTEM['feature_names']
    
    # Create input DataFrame
    input_df = pd.DataFrame(0, index=[0], columns=feature_names, dtype=float)
    
    # Map patient data to model features
    feature_mapping = {
        'ageYears': 'Age_Years',
        'gender': 'Gender',
        'familyHistory': 'Family_History',
        'consanguinity': 'Consanguinity',
        'infectionEarFreq': 'Infection_Ear_Freq',
        'infectionLungFreq': 'Infection_Lung_Freq',
        'persistentThrush': 'Persistent_Thrush',
        'chronicDiarrhea': 'Chronic_Diarrhea',
        'failureToThrive': 'Failure_to_Thrive',
        'historyIVAntibiotics': 'History_IV_Antibiotics',
        'labALCLevel': 'Lab_ALC_Level',
        'labIgGLevel': 'Lab_IgG_Level',
        'primaryGeneSymbol': 'Primary_Gene_Symbol',
    }
    
    # Convert patient data to model input format
    manual_data = {}
    for key, value in patient_data.items():
        if key in feature_mapping:
            model_key = feature_mapping[key]
            
            # Handle boolean conversions
            if isinstance(value, bool):
                value = 'Yes' if value else 'No'
            
            manual_data[model_key] = value
    
    # Process manual inputs
    for col, value in manual_data.items():
        if col in feature_names:
            if col in encoders:
                try:
                    encoded_val = encoders[col].transform([value])[0]
                    input_df.at[0, col] = float(encoded_val)
                except (ValueError, KeyError):
                    input_df.at[0, col] = 0.0
            else:
                try:
                    input_df.at[0, col] = float(value)
                except (ValueError, TypeError):
                    input_df.at[0, col] = 0.0

    # Process gene expression data if provided
    if gene_data:
        for feature in feature_names:
            if "Gene_Exp_" in feature or "Control_Gene_" in feature:
                clean_name = feature.replace("Gene_Exp_", "").replace("Control_Gene_", "")
                if clean_name in gene_data:
                    input_df.at[0, feature] = float(gene_data[clean_name])

    # Scale features
    input_df_scaled = pd.DataFrame(
        scaler.transform(input_df),
        columns=feature_names,
        index=input_df.index
    )

    # Predict
    pred_idx = model.predict(input_df_scaled)[0]
    pred_probs = model.predict_proba(input_df_scaled)[0]
    
    # Decode prediction
    target_encoder = encoders['Diagnosis_Target']
    diagnosis = target_encoder.inverse_transform([pred_idx])[0]
    confidence = float(pred_probs[pred_idx])
    
    # Get all class probabilities
    all_classes = target_encoder.classes_
    all_probs = {cls: float(prob) for cls, prob in zip(all_classes, pred_probs)}
    
    # Determine risk level based on diagnosis and confidence
    risk_level = determine_risk_level(diagnosis, confidence, patient_data)
    
    # Get recommendations
    recommendations = get_recommendations(diagnosis, risk_level, patient_data)
    
    # Get feature importance for explainability
    feature_importance = get_feature_importance(model, feature_names, input_df_scaled)
    
    return {
        "diagnosis": diagnosis,
        "confidence": round(confidence * 100, 2),
        "riskLevel": risk_level,
        "riskScore": calculate_risk_score(diagnosis, confidence, patient_data),
        "allProbabilities": all_probs,
        "recommendations": recommendations,
        "featureImportance": feature_importance,
        "modelVersion": "1.0.0"
    }

def determine_risk_level(diagnosis, confidence, patient_data):
    """Determine risk level based on diagnosis and patient data."""
    # SCID cases are always high/critical risk
    if 'SCID' in diagnosis:
        if confidence > 0.8:
            return 'critical'
        return 'high'
    
    # Check lab values for risk indicators
    alc_level = patient_data.get('labALCLevel', 1000)
    igg_level = patient_data.get('labIgGLevel', 400)
    
    if alc_level < 500 or igg_level < 200:
        return 'high'
    elif alc_level < 1000 or igg_level < 400:
        return 'moderate'
    
    if 'Healthy' in diagnosis:
        return 'low'
    
    return 'moderate'

def calculate_risk_score(diagnosis, confidence, patient_data):
    """Calculate a 0-100 risk score."""
    base_score = 50
    
    # Diagnosis-based scoring
    if 'SCID' in diagnosis:
        base_score = 80
    elif 'Healthy' in diagnosis:
        base_score = 20
    
    # Adjust by confidence
    score = base_score * confidence
    
    # Adjust by lab values
    alc_level = patient_data.get('labALCLevel', 1000)
    if alc_level < 500:
        score += 15
    elif alc_level < 1000:
        score += 8
    
    return min(100, max(0, round(score)))

def get_recommendations(diagnosis, risk_level, patient_data):
    """Get treatment recommendations based on diagnosis."""
    recommendations = []
    
    if 'SCID_X_Linked' in diagnosis:
        recommendations = [
            "Immediate consultation with pediatric immunologist",
            "Consider hematopoietic stem cell transplantation (HSCT)",
            "Implement protective isolation protocols",
            "Avoid live vaccines",
            "Prophylactic antimicrobial therapy"
        ]
    elif 'SCID_ADA' in diagnosis:
        recommendations = [
            "Immediate consultation with pediatric immunologist",
            "Consider enzyme replacement therapy (PEG-ADA)",
            "Evaluate for gene therapy eligibility",
            "Implement protective isolation protocols",
            "Regular metabolic monitoring"
        ]
    elif 'Healthy' in diagnosis:
        recommendations = [
            "Continue routine pediatric care",
            "Follow standard immunization schedule",
            "Monitor for any new symptoms"
        ]
    else:
        recommendations = [
            "Consult with immunologist for further evaluation",
            "Consider additional genetic testing",
            "Monitor immune function parameters"
        ]
    
    # Add lab-specific recommendations
    alc_level = patient_data.get('labALCLevel', 1000)
    if alc_level < 500:
        recommendations.append("URGENT: Critically low lymphocyte count - immediate intervention required")
    
    return recommendations

def get_feature_importance(model, feature_names, input_df):
    """Extract feature importance from XGBoost model."""
    try:
        importances = model.feature_importances_
        feature_importance = []
        
        # Get top 10 most important features
        indices = np.argsort(importances)[-10:][::-1]
        
        for idx in indices:
            if importances[idx] > 0.01:  # Only include meaningful features
                value = float(input_df.iloc[0, idx])
                feature_importance.append({
                    "feature": feature_names[idx],
                    "importance": round(float(importances[idx]), 4),
                    "direction": "positive" if value > 0 else "negative"
                })
        
        return feature_importance
    except Exception:
        return []


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        "status": "healthy",
        "model_loaded": SYSTEM is not None
    })


@app.route('/predict', methods=['POST'])
def predict():
    """
    Main prediction endpoint.
    Expects JSON with patientData and optional geneData.
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        patient_data = data.get('patientData', {})
        gene_data = data.get('geneData', None)
        
        # Validate required fields
        required_fields = ['ageYears', 'gender', 'labALCLevel', 'labIgGLevel']
        missing_fields = [f for f in required_fields if f not in patient_data]
        
        if missing_fields:
            return jsonify({
                "error": f"Missing required fields: {', '.join(missing_fields)}"
            }), 400
        
        result = predict_patient_status(patient_data, gene_data)
        
        return jsonify({
            "success": True,
            "prediction": result
        })
        
    except Exception as e:
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route('/model-info', methods=['GET'])
def model_info():
    """Get model information and metadata."""
    if SYSTEM is None:
        return jsonify({"error": "Model not loaded"}), 500
    
    info = {
        "modelVersion": "1.0.0",
        "featureCount": len(SYSTEM['feature_names']),
        "classes": list(SYSTEM['encoders']['Diagnosis_Target'].classes_),
        "features": SYSTEM['feature_names'][:20]  # Return first 20 features
    }
    
    if 'metrics' in SYSTEM:
        info['metrics'] = {
            "accuracy": SYSTEM['metrics'].get('accuracy'),
            "precision": SYSTEM['metrics'].get('precision'),
            "recall": SYSTEM['metrics'].get('recall'),
            "f1_score": SYSTEM['metrics'].get('f1_score')
        }
    
    return jsonify(info)


if __name__ == '__main__':
    # Load the model on startup
    if load_system():
        print("Starting AI Prediction API Server...")
        app.run(host='0.0.0.0', port=5001, debug=True)
    else:
        print("Failed to load model. Server not started.")
