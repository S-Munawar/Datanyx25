#!/usr/bin/env python3
"""
ML Inference Module for ImmunoDetect
This module provides prediction functionality that can be called from Node.js
Usage: python inference.py '{"ageYears": 0.5, "gender": "Male", ...}'
"""

import sys
import json
import os

# Change to the script's directory to find the model file
os.chdir(os.path.dirname(os.path.abspath(__file__)))

import pandas as pd
import numpy as np
import joblib

MODEL_FILE = 'immunology_model.pkl'

def load_model():
    """Load the trained model and artifacts."""
    try:
        return joblib.load(MODEL_FILE)
    except FileNotFoundError:
        return None

def predict(input_data: dict) -> dict:
    """
    Make a prediction based on input data.
    
    Args:
        input_data: Dictionary with patient data
        
    Returns:
        Dictionary with prediction results
    """
    system = load_model()
    
    if system is None:
        return {
            "success": False,
            "error": "Model not found. Please train the model first.",
            "prediction": None
        }
    
    try:
        model = system['model']
        encoders = system['encoders']
        scaler = system['scaler']
        feature_names = system['feature_names']
        
        # Map frontend field names to model feature names
        field_mapping = {
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
        
        # Value mappings for categorical fields
        value_mapping = {
            'familyHistory': lambda v: 'Yes' if v in [True, 'true', 'Yes', 1] else 'No',
            'consanguinity': lambda v: 'Yes' if v in [True, 'true', 'Yes', 1] else 'No',
            'failureToThrive': lambda v: 'Yes' if v in [True, 'true', 'Yes', 1] else 'No',
            'historyIVAntibiotics': lambda v: 'Yes' if v in [True, 'true', 'Yes', 1] else 'No',
            'persistentThrush': lambda v: 'Persistent' if v in ['Persistent', 'Yes', True] else 'No',
            'chronicDiarrhea': lambda v: 'Chronic' if v in ['Chronic', 'Yes', True] else 'No',
        }
        
        # Create input DataFrame
        input_df = pd.DataFrame(0, index=[0], columns=feature_names, dtype=float)
        
        # Process input data
        for frontend_key, model_key in field_mapping.items():
            if frontend_key in input_data and model_key in feature_names:
                value = input_data[frontend_key]
                
                # Apply value mapping if exists
                if frontend_key in value_mapping:
                    value = value_mapping[frontend_key](value)
                
                # Encode or use directly
                if model_key in encoders:
                    try:
                        encoded_val = encoders[model_key].transform([value])[0]
                        input_df.at[0, model_key] = float(encoded_val)
                    except (ValueError, KeyError):
                        input_df.at[0, model_key] = 0.0
                else:
                    try:
                        input_df.at[0, model_key] = float(value) if value is not None else 0.0
                    except (ValueError, TypeError):
                        input_df.at[0, model_key] = 0.0
        
        # Scale features
        input_scaled = pd.DataFrame(
            scaler.transform(input_df),
            columns=feature_names,
            index=input_df.index
        )
        
        # Make prediction
        pred_idx = model.predict(input_scaled)[0]
        pred_probs = model.predict_proba(input_scaled)[0]
        
        # Decode prediction
        target_encoder = encoders['Diagnosis_Target']
        diagnosis = target_encoder.inverse_transform([pred_idx])[0]
        confidence = float(pred_probs[pred_idx] * 100)
        
        # Get all probabilities
        all_classes = target_encoder.classes_
        probabilities = {cls: float(prob * 100) for cls, prob in zip(all_classes, pred_probs)}
        
        # Determine risk level based on diagnosis
        risk_levels = {
            'Healthy': 'low',
            'SCID_ADA': 'critical',
            'SCID_X_Linked': 'critical',
        }
        risk_level = risk_levels.get(diagnosis, 'medium')
        
        # Generate recommendations
        recommendations = generate_recommendations(diagnosis, confidence, input_data)
        
        return {
            "success": True,
            "prediction": {
                "diagnosis": diagnosis,
                "confidence": round(confidence, 2),
                "riskLevel": risk_level,
                "probabilities": probabilities,
                "recommendations": recommendations,
                "modelVersion": "1.0.0",
                "timestamp": pd.Timestamp.now().isoformat()
            }
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "prediction": None
        }


def generate_recommendations(diagnosis: str, confidence: float, input_data: dict) -> list:
    """Generate clinical recommendations based on prediction."""
    recommendations = []
    
    if diagnosis == 'Healthy':
        recommendations.append("Continue routine monitoring and follow-up")
        recommendations.append("Maintain current immunization schedule")
        if confidence < 80:
            recommendations.append("Consider additional testing to confirm healthy status")
    
    elif diagnosis == 'SCID_X_Linked':
        recommendations.append("URGENT: Refer to pediatric immunologist immediately")
        recommendations.append("Initiate protective isolation protocols")
        recommendations.append("Genetic counseling for IL2RG mutation confirmation")
        recommendations.append("Evaluate for bone marrow transplant eligibility")
        recommendations.append("Avoid live vaccines until immune function is restored")
    
    elif diagnosis == 'SCID_ADA':
        recommendations.append("URGENT: Refer to pediatric immunologist immediately")
        recommendations.append("Consider ADA enzyme replacement therapy (PEG-ADA)")
        recommendations.append("Genetic testing to confirm ADA gene mutation")
        recommendations.append("Evaluate for gene therapy clinical trials")
        recommendations.append("Initiate protective isolation protocols")
    
    # Add general recommendations based on lab values
    if input_data.get('labALCLevel', 0) < 500:
        recommendations.append("Monitor absolute lymphocyte count closely")
    
    if input_data.get('labIgGLevel', 0) < 200:
        recommendations.append("Consider IVIG replacement therapy")
    
    return recommendations


def get_model_info() -> dict:
    """Get information about the loaded model."""
    system = load_model()
    
    if system is None:
        return {"success": False, "error": "Model not loaded"}
    
    info = {
        "success": True,
        "modelLoaded": True,
        "featureCount": len(system['feature_names']),
        "classes": list(system['encoders']['Diagnosis_Target'].classes_),
        "version": "1.0.0"
    }
    
    if 'metrics' in system:
        info["metrics"] = {
            "accuracy": system['metrics'].get('accuracy'),
            "precision": system['metrics'].get('precision'),
            "recall": system['metrics'].get('recall'),
            "f1Score": system['metrics'].get('f1_score')
        }
    
    return info


if __name__ == '__main__':
    if len(sys.argv) < 2:
        # No arguments - return model info
        result = get_model_info()
    else:
        try:
            # Parse input JSON
            input_data = json.loads(sys.argv[1])
            result = predict(input_data)
        except json.JSONDecodeError as e:
            result = {"success": False, "error": f"Invalid JSON: {str(e)}"}
    
    # Output result as JSON
    print(json.dumps(result))
