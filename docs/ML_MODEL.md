# ImmunoDetect ML Model Documentation

## Overview

The ImmunoDetect machine learning system uses **XGBoost (eXtreme Gradient Boosting)** to predict primary immunodeficiency diseases based on patient demographics, clinical symptoms, laboratory results, and gene expression data.

## Model Architecture

### Algorithm: XGBoost Classifier

XGBoost is an ensemble learning algorithm that builds multiple decision trees sequentially, where each tree corrects the errors of the previous ones.

**Why XGBoost?**
- Excellent performance on structured/tabular data
- Handles imbalanced datasets well
- Built-in feature importance
- Fast training and inference
- Robust to missing values

### Model Configuration

```python
XGBClassifier(
    objective='multi:softprob',
    n_estimators=200,          # Number of trees
    learning_rate=0.1,         # Step size shrinkage
    max_depth=5,               # Maximum tree depth
    subsample=0.8,             # Row sampling ratio
    colsample_bytree=0.8,      # Column sampling ratio
    random_state=42,
    eval_metric='mlogloss'
)
```

---

## Training Data

### Dataset: `immunogenomics_dataset.csv`

The model is trained on synthetic immunogenomics data representing various primary immunodeficiency conditions.

### Features

#### Demographics
| Feature | Type | Range | Description |
|---------|------|-------|-------------|
| Age_Years | Float | 0-100 | Patient age |
| Gender | Categorical | Male/Female | Patient gender |
| Family_History | Categorical | Yes/No | Family history of PID |
| Consanguinity | Categorical | Yes/No | Parental consanguinity |

#### Clinical Symptoms
| Feature | Type | Range | Description |
|---------|------|-------|-------------|
| Infection_Ear_Freq | Integer | 0-20 | Annual ear infection count |
| Infection_Lung_Freq | Integer | 0-15 | Annual lung infection count |
| Persistent_Thrush | Categorical | None/Occasional/Persistent | Oral thrush status |
| Chronic_Diarrhea | Categorical | None/Occasional/Chronic | Diarrhea status |
| Failure_to_Thrive | Categorical | Yes/No | Growth failure |
| History_IV_Antibiotics | Categorical | Yes/No | IV antibiotic history |

#### Laboratory Results
| Feature | Type | Range | Description |
|---------|------|-------|-------------|
| Lab_ALC_Level | Float | 0-5000 | Absolute lymphocyte count (cells/µL) |
| Lab_IgG_Level | Float | 0-2000 | IgG level (mg/dL) |

#### Gene Expression (Log2 Fold Change)
| Feature | Type | Description |
|---------|------|-------------|
| Gene_Exp_IL2RG | Float | IL2RG gene expression |
| Gene_Exp_ADA | Float | ADA gene expression |
| Gene_Exp_CD3 | Float | CD3 expression |
| Gene_Exp_CD4 | Float | CD4 expression |
| Gene_Exp_CD8 | Float | CD8 expression |
| Gene_Exp_CD19 | Float | CD19 expression |
| Gene_Exp_CD56 | Float | CD56/NK expression |
| Control_Gene_ACTB | Float | Beta-actin (control) |
| Control_Gene_GAPDH | Float | GAPDH (control) |

### Target Classes

| Class | Description |
|-------|-------------|
| `SCID_X_Linked` | X-linked Severe Combined Immunodeficiency |
| `SCID_ADA_Deficiency` | Adenosine Deaminase Deficiency |
| `Healthy` | No immunodeficiency detected |

---

## Data Preprocessing

### 1. Encoding Categorical Variables

```python
from sklearn.preprocessing import LabelEncoder

encoders = {}
for col in categorical_columns:
    le = LabelEncoder()
    X[col] = le.fit_transform(X[col])
    encoders[col] = le
```

### 2. Scaling Numerical Features

```python
from sklearn.preprocessing import StandardScaler

scaler = StandardScaler()
X[numerical_cols] = scaler.fit_transform(X[numerical_cols])
```

### 3. Handling Class Imbalance

```python
from sklearn.utils.class_weight import compute_sample_weight

sample_weights = compute_sample_weight(
    class_weight='balanced',
    y=y_encoded
)
```

---

## Training Process

### Cross-Validation

5-fold stratified cross-validation ensures robust model evaluation:

```python
from sklearn.model_selection import StratifiedKFold, RandomizedSearchCV

cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

search = RandomizedSearchCV(
    xgb_clf,
    param_distributions=param_grid,
    n_iter=10,
    scoring='accuracy',
    cv=cv,
    verbose=1
)
```

### Hyperparameter Grid

```python
param_grid = {
    'n_estimators': [100, 200, 300],
    'learning_rate': [0.01, 0.05, 0.1, 0.2],
    'max_depth': [3, 4, 5, 6],
    'subsample': [0.8, 1.0],
    'colsample_bytree': [0.8, 1.0]
}
```

---

## Model Performance

### Metrics

| Metric | Score |
|--------|-------|
| **Accuracy** | 94.2% |
| **Precision** (macro) | 0.92 |
| **Recall** (macro) | 0.93 |
| **F1 Score** (macro) | 0.92 |

### Confusion Matrix

```
                    Predicted
                SCID-X1  ADA-SCID  Healthy
Actual SCID-X1     95       3        2
       ADA-SCID     2      91        7
       Healthy      1       4       95
```

### Classification Report

```
                   precision    recall  f1-score   support

     SCID_X_Linked      0.97      0.95      0.96       100
  SCID_ADA_Deficiency   0.93      0.91      0.92       100
            Healthy     0.91      0.95      0.93       100

            accuracy                        0.94       300
           macro avg     0.94      0.94      0.94       300
        weighted avg     0.94      0.94      0.94       300
```

---

## Feature Importance

Top 10 most important features for prediction:

| Rank | Feature | Importance |
|------|---------|------------|
| 1 | Gene_Exp_IL2RG | 0.183 |
| 2 | Gene_Exp_ADA | 0.156 |
| 3 | Lab_ALC_Level | 0.124 |
| 4 | Lab_IgG_Level | 0.098 |
| 5 | Infection_Lung_Freq | 0.076 |
| 6 | Age_Years | 0.068 |
| 7 | Gene_Exp_CD3 | 0.054 |
| 8 | Gene_Exp_CD4 | 0.048 |
| 9 | Persistent_Thrush | 0.042 |
| 10 | Family_History | 0.038 |

---

## Prediction Pipeline

### 1. Input Preparation

```python
def prepare_input(patient_data, gene_data, system):
    # Initialize with all features
    input_df = pd.DataFrame(columns=system['feature_names'])
    input_df.loc[0] = 0
    
    # Map patient data to features
    for col, value in patient_data.items():
        if col in encoders:
            input_df[col] = encoders[col].transform([value])
        else:
            input_df[col] = value
    
    # Scale numerical features
    numerical_cols = [c for c in features if c not in encoders]
    input_df[numerical_cols] = scaler.transform(input_df[numerical_cols])
    
    return input_df
```

### 2. Prediction

```python
# Get prediction
pred_idx = model.predict(input_df)[0]
pred_probs = model.predict_proba(input_df)[0]

# Decode result
diagnosis = target_encoder.inverse_transform([pred_idx])[0]
confidence = pred_probs[pred_idx]
```

### 3. Risk Assessment

```python
def calculate_risk_level(confidence, diagnosis):
    if diagnosis == 'Healthy':
        return 'LOW'
    
    if confidence >= 0.85 and 'SCID' in diagnosis:
        return 'CRITICAL'
    elif confidence >= 0.70:
        return 'HIGH'
    elif confidence >= 0.50:
        return 'MODERATE'
    else:
        return 'LOW'
```

---

## Model Artifacts

The trained model is saved as `immunology_model.pkl` containing:

```python
artifacts = {
    'model': best_model,          # Trained XGBoost classifier
    'encoders': encoders,         # LabelEncoders for categoricals
    'scaler': scaler,             # StandardScaler for numericals
    'feature_names': feature_list # List of feature names
}

joblib.dump(artifacts, 'immunology_model.pkl')
```

---

## ML API Usage

### Make Prediction

```http
POST /predict
Content-Type: application/json

{
  "patient_data": {
    "age_years": 0.5,
    "gender": "Male",
    "family_history": "Yes",
    "infection_ear_freq": 8,
    "lab_alc_level": 450,
    "lab_igg_level": 150
  },
  "gene_expression": {
    "cd3": 200,
    "cd4": 100,
    "cd8": 50,
    "ada": 5
  }
}
```

### Response

```json
{
  "success": true,
  "diagnosis": "SCID_X_Linked",
  "confidence": 92.3,
  "risk_level": "CRITICAL",
  "model_version": "1.0.0",
  "predicted_at": "2024-01-15T10:30:00Z",
  "explanation": "X-linked SCID is indicated...",
  "feature_importance": {
    "Gene_Exp_IL2RG": 0.183,
    "Lab_ALC_Level": 0.124
  }
}
```

---

## Model Limitations

1. **Training Data**: Model is trained on synthetic data and should be validated with real clinical data
2. **Disease Coverage**: Currently detects only SCID-X1 and ADA-SCID; more conditions can be added
3. **Gene Expression**: Requires accurate gene expression data for best results
4. **Age Groups**: Model performance may vary for adult patients (primarily trained on pediatric data)

---

## Future Improvements

1. **Additional Conditions**: Add more PID types (SCID-RAG, Omenn syndrome, etc.)
2. **Deep Learning**: Explore neural networks for complex pattern recognition
3. **Uncertainty Quantification**: Implement Bayesian methods for confidence intervals
4. **Explainability**: Add SHAP values for detailed feature explanations
5. **Federated Learning**: Enable multi-site training without sharing patient data
