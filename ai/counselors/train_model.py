import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.model_selection import StratifiedKFold, RandomizedSearchCV, train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import (
    classification_report, confusion_matrix, accuracy_score, balanced_accuracy_score,
    roc_auc_score, log_loss, matthews_corrcoef, cohen_kappa_score, brier_score_loss,
    silhouette_score, davies_bouldin_score, calinski_harabasz_score, f1_score
)
from sklearn.utils.class_weight import compute_sample_weight
import joblib

# ==========================================
# 1. SETUP & CONFIGURATION
# ==========================================
DATA_FILE = 'immunogenomics_dataset.csv'
MODEL_FILE = 'immunology_model.pkl'

def train_robust_model():
    print("--- 1. Loading and Inspecting Data ---")
    try:
        df = pd.read_csv(DATA_FILE)
    except FileNotFoundError:
        print(f"Error: {DATA_FILE} not found.")
        return

    # ==========================================
    # 2. PREPROCESSING
    # ==========================================
    
    # A. Feature Selection
    X = df.drop(columns=[
        'Patient_Name', 'Diagnosis_Target', 'Risk_Score_Prediction', 
        'Severity_Level', 'Recommended_Action'
    ])
    y = df['Diagnosis_Target']

    # B. Encoding Categoricals
    # We save these to ensure the live app encodes inputs exactly the same way
    encoders = {}
    categorical_cols = X.select_dtypes(include=['object']).columns
    
    print(f"   > Encoding {len(categorical_cols)} categorical features...")
    for col in categorical_cols:
        le = LabelEncoder()
        X[col] = le.fit_transform(X[col])
        encoders[col] = le

    # C. Encoding Target
    target_encoder = LabelEncoder()
    y_encoded = target_encoder.fit_transform(y)
    encoders['Diagnosis_Target'] = target_encoder

    # D. Scaling Numerical Values (New Robustness Step)
    # This helps when gene expression ranges (-5 to 5) differ from ALC (0 to 5000)
    scaler = StandardScaler()
    numerical_cols = X.select_dtypes(include=['int64', 'float64']).columns
    X[numerical_cols] = scaler.fit_transform(X[numerical_cols])

    # ==========================================
    # 3. HANDLING IMBALANCE (CRITICAL FOR MEDTECH)
    # ==========================================
    # We calculate weights so the model pays more attention to rare diseases
    print("   > Calculating Class Weights for Imbalance handling...")
    sample_weights = compute_sample_weight(
        class_weight='balanced',
        y=y_encoded
    )

    # Split Data (80% Train, 20% Test)
    # Stratify ensures both sets have the same % of sick patients
    X_train, X_test, y_train, y_test, w_train, w_test = train_test_split(
        X, y_encoded, sample_weights, test_size=0.2, stratify=y_encoded, random_state=42
    )

    # ==========================================
    # 4. HYPERPARAMETER TUNING & CROSS VALIDATION
    # ==========================================
    print("\n--- 2. Starting Robust Training (Grid Search) ---")
    
    # Define the parameter grid to search through
    param_grid = {
        'n_estimators': [100, 200, 300],
        'learning_rate': [0.01, 0.05, 0.1, 0.2],
        'max_depth': [3, 4, 5, 6],
        'subsample': [0.8, 1.0],
        'colsample_bytree': [0.8, 1.0]
    }

    xgb_clf = xgb.XGBClassifier(
        objective='multi:softprob', 
        random_state=42,
        eval_metric='mlogloss'
    )

    # RandomizedSearchCV performs Cross-Validation automatically
    # It tries random combinations to find the "Best" model
    search = RandomizedSearchCV(
        xgb_clf, 
        param_distributions=param_grid, 
        n_iter=10,             # Try 10 different combinations
        scoring='accuracy', 
        cv=5,                  # 5-Fold Cross Validation
        verbose=1, 
        random_state=42,
        n_jobs=-1              # Use all CPU cores
    )

    # Fit the search (Notice we pass sample_weight here!)
    search.fit(X_train, y_train, sample_weight=w_train)

    best_model = search.best_estimator_
    print(f"\n   > Best Parameters Found: {search.best_params_}")

    # ==========================================
    # 5. FINAL EVALUATION
    # ==========================================
    print("\n--- 3. Final Evaluation on Test Set ---")
    
    y_pred = best_model.predict(X_test)
    y_pred_proba = best_model.predict_proba(X_test)
    acc = accuracy_score(y_test, y_pred)
    
    print(f"   > Model Accuracy: {acc * 100:.2f}%")
    print("\n   > Detailed Classification Report:")
    report = classification_report(y_test, y_pred, target_names=target_encoder.classes_, output_dict=True)
    print(classification_report(y_test, y_pred, target_names=target_encoder.classes_))
    
    # Confusion Matrix
    cm = confusion_matrix(y_test, y_pred)
    print("\n   > Confusion Matrix:")
    print(cm)
    
    # Extract comprehensive metrics
    per_class_metrics = {}
    for cls in target_encoder.classes_:
        if cls in report:
            per_class_metrics[cls] = report[cls]
    
    # Additional Accuracy Metrics
    balanced_acc = balanced_accuracy_score(y_test, y_pred)
    macro_f1 = f1_score(y_test, y_pred, average='macro')
    micro_f1 = f1_score(y_test, y_pred, average='micro')
    mcc = matthews_corrcoef(y_test, y_pred)
    kappa = cohen_kappa_score(y_test, y_pred)
    
    # Classification Metrics
    try:
        roc_auc = roc_auc_score(y_test, y_pred_proba, multi_class='ovr', average='weighted')
        logloss = log_loss(y_test, y_pred_proba)
        brier = np.mean([brier_score_loss(y_test == i, y_pred_proba[:, i]) for i in range(len(target_encoder.classes_))])
        classification_metrics = {
            'roc_auc': f"{roc_auc:.4f}",
            'log_loss': f"{logloss:.4f}",
            'brier_score': f"{brier:.4f}",
            'tp': int(np.diag(cm).sum()),
            'tn': int((cm.sum() - cm.sum(axis=0) - cm.sum(axis=1) + np.diag(cm)).sum() / len(cm)),
            'fp': int((cm.sum(axis=0) - np.diag(cm)).sum()),
            'fn': int((cm.sum(axis=1) - np.diag(cm)).sum()),
            'sensitivity': f"{report['weighted avg']['recall']:.4f}",
            'specificity': 'N/A (multi-class)'
        }
    except:
        classification_metrics = {}
    
    # Clustering Metrics (Feature space analysis)
    try:
        silhouette = silhouette_score(X_test, y_test)
        davies_bouldin = davies_bouldin_score(X_test, y_test)
        calinski = calinski_harabasz_score(X_test, y_test)
        clustering_metrics = {
            'silhouette': f"{silhouette:.4f}",
            'davies_bouldin': f"{davies_bouldin:.4f}",
            'calinski_harabasz': f"{calinski:.2f}"
        }
    except:
        clustering_metrics = {}
    
    metrics = {
        'accuracy': f"{acc * 100:.2f}%",
        'balanced_accuracy': f"{balanced_acc:.4f}",
        'precision': f"{report['weighted avg']['precision']:.4f}",
        'recall': f"{report['weighted avg']['recall']:.4f}",
        'f1_score': f"{report['weighted avg']['f1-score']:.4f}",
        'macro_f1': f"{macro_f1:.4f}",
        'micro_f1': f"{micro_f1:.4f}",
        'mcc': f"{mcc:.4f}",
        'kappa': f"{kappa:.4f}",
        'per_class': per_class_metrics,
        'confusion_matrix': cm.tolist(),
        'class_names': list(target_encoder.classes_),
        'best_params': search.best_params_,
        'classification': classification_metrics,
        'clustering': clustering_metrics
    }

    # ==========================================
    # 6. SAVE SYSTEM ARTIFACTS
    # ==========================================
    artifacts = {
        'model': best_model,
        'encoders': encoders,
        'scaler': scaler,
        'feature_names': list(X.columns),
        'metrics': metrics
    }
    
    joblib.dump(artifacts, MODEL_FILE)
    print(f"\n[SUCCESS] Robust Model saved to '{MODEL_FILE}'")

if __name__ == "__main__":
    train_robust_model()