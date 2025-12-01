import pandas as pd
import numpy as np
import joblib

# Load the trained artifacts
MODEL_FILE = 'immunology_model.pkl'

def load_system():
    """Loads the model, encoders, and scaler once at startup."""
    print("Loading AI System...")
    try:
        artifacts = joblib.load(MODEL_FILE)
        return artifacts
    except FileNotFoundError:
        print(f"Error: '{MODEL_FILE}' not found. Please run 'train_model.py' first!")
        return None

# Global System Load
SYSTEM = load_system()

def display_model_info():
    """Display model metadata and performance metrics."""
    if SYSTEM is None:
        print("System not loaded.")
        return
    
    print(f"\n{'='*60}")
    print(f"MODEL INFORMATION & EVALUATION METRICS")
    print(f"{'='*60}")
    
    print(f"\nModel Configuration:")
    print(f"  Algorithm:      XGBoost Classifier")
    print(f"  Task Type:      Multi-class Classification")
    print(f"  Features:       {len(SYSTEM['feature_names'])}")
    print(f"  Disease Classes: {len(SYSTEM['encoders']['Diagnosis_Target'].classes_)}")
    print(f"  Classes:        {', '.join(SYSTEM['encoders']['Diagnosis_Target'].classes_)}")
    
    if 'metrics' in SYSTEM:
        metrics = SYSTEM['metrics']
        print(f"\nModel Performance (Test Set):")
        print(f"  Accuracy:       {metrics.get('accuracy', 'N/A')}")
        print(f"  Precision:      {metrics.get('precision', 'N/A')}")
        print(f"  Recall:         {metrics.get('recall', 'N/A')}")
        print(f"  F1-Score:       {metrics.get('f1_score', 'N/A')}")
        
        if 'classification' in metrics and 'roc_auc' in metrics['classification']:
            print(f"  ROC-AUC:        {metrics['classification']['roc_auc']}")
        
        if 'best_params' in metrics:
            print(f"\nOptimized Hyperparameters:")
            for param, value in metrics['best_params'].items():
                print(f"  {param:20s}: {value}")
    
    print(f"{'='*60}\n")

def predict_patient_status(manual_data, gene_csv_path=None):
    """
    Main function to predict disease.
    Returns: (diagnosis, confidence, all_probabilities)
    """
    if SYSTEM is None: return "System Error", 0.0, {}
    
    model = SYSTEM['model']
    encoders = SYSTEM['encoders']
    scaler = SYSTEM['scaler']
    feature_names = SYSTEM['feature_names']
    
    # ==========================================
    # STEP 1: PREPARE DATA CONTAINER
    # ==========================================
    # Create a single-row DataFrame with proper dtypes
    input_df = pd.DataFrame(0, index=[0], columns=feature_names, dtype=float) 
    
    # ==========================================
    # STEP 2: PROCESS MANUAL INPUTS
    # ==========================================
    for col, value in manual_data.items():
        if col in feature_names:
            # Check if this column needs encoding (Male -> 1)
            if col in encoders:
                try:
                    # Transform the single value using the saved encoder
                    encoded_val = encoders[col].transform([value])[0]
                    input_df.at[0, col] = float(encoded_val)
                except ValueError:
                    print(f"Warning: Unknown category '{value}' for {col}. Using default.")
                    input_df.at[0, col] = 0.0
            else:
                # Numerical value (Age, etc.)
                input_df.at[0, col] = float(value)

    # ==========================================
    # STEP 3: PROCESS CSV FILE (GENE EXPRESSION)
    # ==========================================
    if gene_csv_path:
        try:
            # Read CSV: Expecting columns 'Gene_Symbol' and 'Log2_Fold_Change'
            gene_df = pd.read_csv(gene_csv_path)
            # Create lookup dict: {'IL2RG': -5.4, 'ADA': 0.1}
            gene_map = dict(zip(gene_df.iloc[:,0], gene_df.iloc[:,1]))
            
            # Map to features
            for feature in feature_names:
                if "Gene_Exp_" in feature or "Control_Gene_" in feature:
                    # Clean the feature name to match CSV (e.g. Gene_Exp_IL2RG -> IL2RG)
                    clean_name = feature.replace("Gene_Exp_", "").replace("Control_Gene_", "")
                    
                    if clean_name in gene_map:
                        input_df.at[0, feature] = float(gene_map[clean_name])
                        
        except Exception as e:
            print(f"Error reading CSV: {e}")

    # ==========================================
    # STEP 4: SCALING (CRITICAL UPDATE)
    # ==========================================
    # The scaler was fitted on ALL features during training (after encoding)
    # So we must transform ALL features in the same order
    input_df_scaled = pd.DataFrame(
        scaler.transform(input_df),
        columns=feature_names,
        index=input_df.index
    )

    # ==========================================
    # STEP 5: PREDICTION
    # ==========================================
    # Use the scaled dataframe for prediction
    input_df = input_df_scaled[feature_names]
    
    # Predict Class
    pred_idx = model.predict(input_df_scaled)[0]
    pred_probs = model.predict_proba(input_df_scaled)[0]
    
    # Decode Class (0 -> "SCID_X_Linked")
    target_encoder = encoders['Diagnosis_Target']
    diagnosis = target_encoder.inverse_transform([pred_idx])[0]
    confidence = pred_probs[pred_idx] * 100
    
    # Get all class probabilities
    all_classes = target_encoder.classes_
    all_probs = {cls: prob * 100 for cls, prob in zip(all_classes, pred_probs)}
    
    return diagnosis, confidence, all_probs

# ==========================================
# TEST RUN (SIMULATION)
# ==========================================
if __name__ == "__main__":
    
    # Display model information
    display_model_info()
    
    # 1. Simulate User Typing on Website
    user_inputs = {
        'Age_Years': 0.5,
        'Gender': 'Male',
        'Family_History': 'Yes',
        'Consanguinity': 'No',
        'Primary_Gene_Symbol': 'IL2RG', 
        'Infection_Ear_Freq': 8,
        'Infection_Lung_Freq': 4,
        'Persistent_Thrush': 'Persistent', 
        'Chronic_Diarrhea': 'Chronic',
        'Failure_to_Thrive': 'Yes',
        'History_IV_Antibiotics': 'Yes',
        'Lab_ALC_Level': 450,  
        'Lab_IgG_Level': 150   
    }
    
    # 2. Simulate User Uploading a CSV File
    # Ensure 'case_scid_x.csv' exists in the folder
    csv_path = 'case_scid_x.csv' 
    
    print("\n--- Processing Patient Prediction ---")
    diagnosis, conf, all_probs = predict_patient_status(user_inputs, csv_path)
    
    print(f"\n{'='*50}")
    print(f"PREDICTION RESULTS")
    print(f"{'='*50}")
    print(f"\nPrimary Diagnosis: {diagnosis}")
    print(f"Confidence: {conf:.2f}%")
    
    print(f"\n{'='*50}")
    print(f"ALL CLASS PROBABILITIES")
    print(f"{'='*50}")
    sorted_probs = sorted(all_probs.items(), key=lambda x: x[1], reverse=True)
    for disease, prob in sorted_probs:
        bar = '█' * int(prob / 2)
        print(f"{disease:20s} {prob:6.2f}% {bar}")
    
    # Display comprehensive ML evaluation metrics
    if 'metrics' in SYSTEM:
        metrics = SYSTEM['metrics']
        print(f"\n{'='*60}")
        print(f"COMPREHENSIVE ML EVALUATION METRICS")
        print(f"{'='*60}")
        
        # Core Accuracy Metrics
        print(f"\n[1] ACCURACY & PERFORMANCE METRICS")
        print(f"{'-'*60}")
        print(f"  Overall Accuracy:     {metrics.get('accuracy', 'N/A')}")
        print(f"  Balanced Accuracy:    {metrics.get('balanced_accuracy', 'N/A')}")
        print(f"  Weighted Precision:   {metrics.get('precision', 'N/A')}")
        print(f"  Weighted Recall:      {metrics.get('recall', 'N/A')}")
        print(f"  Weighted F1-Score:    {metrics.get('f1_score', 'N/A')}")
        print(f"  Macro F1-Score:       {metrics.get('macro_f1', 'N/A')}")
        print(f"  Micro F1-Score:       {metrics.get('micro_f1', 'N/A')}")
        print(f"  Matthews Corr Coef:   {metrics.get('mcc', 'N/A')}")
        print(f"  Cohen's Kappa:        {metrics.get('kappa', 'N/A')}")
        
        if 'per_class' in metrics:
            print(f"\n[2] PER-CLASS PERFORMANCE METRICS")
            print(f"{'-'*60}")
            for cls, cls_metrics in metrics['per_class'].items():
                print(f"\n  {cls}:")
                print(f"    Accuracy:  {cls_metrics.get('accuracy', 'N/A')}")
                print(f"    Precision: {cls_metrics['precision']:.4f}")
                print(f"    Recall:    {cls_metrics['recall']:.4f}")
                print(f"    F1-Score:  {cls_metrics['f1-score']:.4f}")
                print(f"    Support:   {cls_metrics['support']} samples")
        
        if 'confusion_matrix' in metrics:
            print(f"\n[3] CONFUSION MATRIX")
            print(f"{'-'*60}")
            cm = metrics['confusion_matrix']
            classes = metrics.get('class_names', [])
            print(f"\n         Predicted →")
            print(f"       {' '.join([f'{c[:10]:>10s}' for c in classes])}")
            print(f"     {'-'*12*len(classes)}")
            for i, row in enumerate(cm):
                prefix = "Actual" if i == len(cm)//2 else "      "
                print(f"{prefix} {classes[i][:10]:>10s} | {' '.join([f'{v:>10d}' for v in row])}")
        
        # Classification Metrics
        if 'classification' in metrics:
            print(f"\n[4] ADVANCED CLASSIFICATION METRICS")
            print(f"{'-'*60}")
            cm = metrics['classification']
            print(f"  True Positives (TP):   {cm.get('tp', 'N/A')}")
            print(f"  True Negatives (TN):   {cm.get('tn', 'N/A')}")
            print(f"  False Positives (FP):  {cm.get('fp', 'N/A')}")
            print(f"  False Negatives (FN):  {cm.get('fn', 'N/A')}")
            print(f"  Sensitivity (Recall):  {cm.get('sensitivity', 'N/A')}")
            print(f"  Specificity:           {cm.get('specificity', 'N/A')}")
            print(f"  ROC-AUC Score:         {cm.get('roc_auc', 'N/A')}")
            print(f"  Log Loss:              {cm.get('log_loss', 'N/A')}")
            print(f"  Brier Score:           {cm.get('brier_score', 'N/A')}")
        
        # Regression Metrics (if applicable for confidence scores)
        if 'regression' in metrics:
            print(f"\n[5] REGRESSION METRICS (Confidence Calibration)")
            print(f"{'-'*60}")
            rm = metrics['regression']
            print(f"  Mean Absolute Error:   {rm.get('mae', 'N/A')}")
            print(f"  Mean Squared Error:    {rm.get('mse', 'N/A')}")
            print(f"  Root MSE:              {rm.get('rmse', 'N/A')}")
            print(f"  R² Score:              {rm.get('r2', 'N/A')}")
        
        # Clustering Metrics (if applicable)
        if 'clustering' in metrics:
            print(f"\n[6] CLUSTERING METRICS (Feature Space Analysis)")
            print(f"{'-'*60}")
            clm = metrics['clustering']
            print(f"  Silhouette Score:      {clm.get('silhouette', 'N/A')}")
            print(f"  Davies-Bouldin Index:  {clm.get('davies_bouldin', 'N/A')}")
            print(f"  Calinski-Harabasz:     {clm.get('calinski_harabasz', 'N/A')}")
            print(f"  Inertia:               {clm.get('inertia', 'N/A')}")
        
        print(f"\n{'='*60}\n")