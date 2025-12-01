# ImmunoDetect ML API

Flask-based REST API for SCID (Severe Combined Immunodeficiency) prediction using XGBoost.

## Setup

1. **Install Dependencies**
   ```bash
   cd ai/counselors
   pip install flask flask-cors numpy pandas scikit-learn xgboost joblib
   ```

2. **Run the ML API**
   ```bash
   python api.py
   ```
   The server will start on `http://localhost:5001`

## Endpoints

### Health Check
```
GET /health
```
Returns server status and model load state.

### Prediction
```
POST /predict
Content-Type: application/json

{
  "patientData": {
    "ageYears": 2,
    "gender": "Male",
    "familyHistory": true,
    "consanguinity": false,
    "infectionEarFreq": 4,
    "infectionLungFreq": 3,
    "persistentThrush": "Persistent",
    "chronicDiarrhea": "Chronic",
    "failureToThrive": true,
    "historyIVAntibiotics": true,
    "labALCLevel": 250,
    "labIgGLevel": 150,
    "primaryGeneSymbol": "IL2RG"
  }
}
```

### Model Info
```
GET /model-info
```
Returns model version, features, and output labels.

## Response Format

```json
{
  "success": true,
  "prediction": {
    "diagnosis": "SCID_X_Linked",
    "confidence": 92.5,
    "riskLevel": "critical",
    "riskScore": 95,
    "allProbabilities": {
      "SCID_X_Linked": 0.925,
      "SCID_ADA_Deficiency": 0.05,
      "Healthy_Control": 0.025
    },
    "recommendations": [
      "URGENT: Immediate consultation with pediatric immunologist",
      "Consider hematopoietic stem cell transplantation (HSCT)",
      "Implement protective isolation protocols",
      "Avoid live vaccines",
      "Prophylactic antimicrobial therapy"
    ],
    "featureImportance": [
      {"feature": "Lab_ALC_Level", "importance": 0.35, "direction": "negative"},
      {"feature": "Lab_IgG_Level", "importance": 0.30, "direction": "negative"},
      {"feature": "Age_Years", "importance": 0.15, "direction": "positive"}
    ],
    "modelVersion": "xgboost-1.0-scid"
  }
}
```

## Environment Variables

- `ML_API_URL` - Set in backend `.env` to change the ML API URL (default: `http://localhost:5001`)

## Integration

The backend automatically calls this API when:
1. A patient requests a prediction on their health record
2. A counselor or researcher creates an assessment with `runPrediction: true`

If the ML service is unavailable, the backend falls back to a heuristic-based prediction.
