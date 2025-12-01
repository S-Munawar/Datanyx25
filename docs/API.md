# ImmunoDetect API Reference

## Overview

The ImmunoDetect API provides RESTful endpoints for managing users, health records, and AI-powered immunodeficiency predictions. All endpoints use JSON for request/response bodies.

## Base URL

```
Development: http://localhost:5000/api/v1
Production: https://api.immunodetect.io/api/v1
```

## Authentication

Most endpoints require authentication via JWT Bearer token.

```http
Authorization: Bearer <access_token>
```

### Token Refresh

Access tokens expire after 15 minutes. Use the refresh token to obtain new tokens:

```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
```

---

## Endpoints

### Authentication

#### Register User

```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe",
  "role": "patient"
}
```

**Response (201)**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "...",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "patient",
      "status": "pending"
    }
  },
  "message": "Registration successful. Please verify your email."
}
```

#### Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200)**
```json
{
  "success": true,
  "data": {
    "user": { ... },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

#### Google OAuth

```http
GET /auth/google
```
Redirects to Google OAuth consent screen.

```http
GET /auth/google/callback?code=...&state=...
```
Handles OAuth callback and issues tokens.

#### Logout

```http
POST /auth/logout
Authorization: Bearer <token>
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
```

#### Get Current User

```http
GET /auth/me
Authorization: Bearer <token>
```

---

### Health Records

#### List Records

```http
GET /health-records
Authorization: Bearer <token>
Query Parameters:
  - page: number (default: 1)
  - limit: number (default: 10)
  - status: string (draft|submitted|under_review|reviewed)
```

**Response (200)**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 50,
    "page": 1,
    "limit": 10,
    "pages": 5
  }
}
```

#### Create Record

```http
POST /health-records
Authorization: Bearer <token>
Content-Type: application/json

{
  "demographics": {
    "age": 2,
    "sex": "male",
    "ethnicity": "Caucasian",
    "familyHistory": "Mother is a carrier for SCID-X1"
  },
  "symptoms": ["Recurrent infections", "Failure to thrive"],
  "medicalHistory": "Multiple hospitalizations for pneumonia...",
  "geneExpressionData": {
    "cd3": 450,
    "cd4": 200,
    "cd8": 100,
    "cd19": 50,
    "cd56": 30,
    "igG": 150,
    "igA": 20,
    "igM": 15,
    "ada": 5,
    "pnp": 40
  },
  "labResults": {
    "wbc": 4500,
    "lymphocytes": 15,
    "neutrophils": 65
  }
}
```

#### Get Record

```http
GET /health-records/:id
Authorization: Bearer <token>
```

#### Submit for Review

```http
POST /health-records/:id/submit
Authorization: Bearer <token>
```

#### Request AI Prediction

```http
POST /health-records/:id/predict
Authorization: Bearer <token>
```

**Response (200)**
```json
{
  "success": true,
  "data": {
    "recordId": "...",
    "aiPrediction": {
      "diseaseType": "SCID-X1",
      "confidence": 0.92,
      "riskLevel": "CRITICAL",
      "modelVersion": "1.0.0",
      "predictedAt": "2024-01-15T10:30:00Z",
      "explanation": "X-linked SCID is indicated based on..."
    }
  }
}
```

---

### Counselor Endpoints

#### Get Assigned Patients

```http
GET /counselor/patients
Authorization: Bearer <token>
```

#### Get Pending Reviews

```http
GET /counselor/pending-reviews
Authorization: Bearer <token>
```

#### Submit Review

```http
POST /counselor/records/:id/review
Authorization: Bearer <token>
Content-Type: application/json

{
  "diagnosis": "SCID-X1 Confirmed",
  "recommendations": "Immediate referral to transplant center...",
  "riskAssessment": "critical",
  "notes": "Patient presents with classic SCID-X1 phenotype...",
  "followUpDate": "2024-02-01"
}
```

---

### Admin Endpoints

#### List Users

```http
GET /admin/users
Authorization: Bearer <token>
Query Parameters:
  - page: number
  - limit: number
  - role: string
  - status: string
```

#### Update User Status

```http
PATCH /admin/users/:id/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "active"
}
```

#### Approve License

```http
POST /admin/licenses/:id/approve
Authorization: Bearer <token>
```

#### Reject License

```http
POST /admin/licenses/:id/reject
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "License number could not be verified"
}
```

#### Get Audit Logs

```http
GET /admin/audit-logs
Authorization: Bearer <token>
Query Parameters:
  - page: number
  - limit: number
  - action: string
  - userId: string
  - startDate: ISO date
  - endDate: ISO date
```

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human readable message"
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `DUPLICATE_ENTRY` | 409 | Resource already exists |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Rate Limiting

- **Default**: 100 requests per 15 minutes per IP
- **Authenticated**: 200 requests per 15 minutes per user
- **Login attempts**: 5 per 15 minutes per IP

Rate limit headers:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705320000
```

---

## WebSocket Events

Connect to WebSocket for real-time updates:

```javascript
const socket = io('http://localhost:5000', {
  auth: { token: accessToken }
});

socket.emit('join', userId);

socket.on('notification', (data) => {
  console.log('New notification:', data);
});

socket.on('review_complete', (data) => {
  console.log('Review completed:', data);
});
```

### Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `join` | Client → Server | Join user's room |
| `notification` | Server → Client | New notification |
| `review_complete` | Server → Client | Counselor completed review |
| `prediction_ready` | Server → Client | AI prediction available |
