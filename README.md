# 🧬 ImmunoDetect

## AI-Powered Immunodeficiency Disease Detection Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org/)
[![Express](https://img.shields.io/badge/Express-5.1-green.svg)](https://expressjs.com/)
[![XGBoost](https://img.shields.io/badge/XGBoost-ML-orange.svg)](https://xgboost.readthedocs.io/)

ImmunoDetect is a comprehensive medical platform designed to assist in the early detection and diagnosis of primary immunodeficiency diseases (PIDs) using advanced machine learning algorithms. The platform combines AI-powered predictions with expert genetic counselor reviews to provide accurate, actionable health insights.

---

## 📋 Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [ML Model](#ml-model)
- [Security](#security)
- [Deployment](#deployment)
- [Contributing](#contributing)

---

## ✨ Features

### For Patients
- **Secure Health Data Submission**: Submit gene expression data and clinical symptoms
- **AI-Powered Predictions**: Get instant preliminary assessments using XGBoost ML model
- **Expert Review**: All predictions reviewed by certified genetic counselors
- **Results Dashboard**: Track assessment history and view detailed reports
- **Secure Messaging**: Communicate with assigned counselors

### For Genetic Counselors
- **Patient Management**: View and manage assigned patients
- **Review Queue**: Prioritized list of pending AI predictions to review
- **Diagnosis Tools**: Confirm, modify, or override AI predictions
- **Reporting**: Generate detailed patient reports
- **License Verification**: Secure credential verification system

### For Administrators
- **User Management**: Manage patients, counselors, and researchers
- **License Approvals**: Verify healthcare professional credentials
- **Audit Logging**: Comprehensive activity tracking for compliance
- **System Monitoring**: Real-time health checks and analytics
- **Access Control**: Role-based permission management

### Technical Features
- **Multi-Role Authentication**: Patient, Counselor, Researcher, Admin roles
- **Google OAuth Integration**: Secure single sign-on with PKCE
- **JWT with Refresh Tokens**: Secure session management via Redis
- **Real-time Updates**: WebSocket notifications via Socket.IO
- **HIPAA-Ready Security**: Encryption, audit logs, access controls

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  Next.js 16 + React 19 + TailwindCSS 4                          │
│  - Login/Register Pages                                          │
│  - Role-based Dashboards                                         │
│  - Health Record Forms                                           │
│  - Results Visualization                                         │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS/WSS
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND                                  │
│  Express 5 + TypeScript + Socket.IO                             │
│  - RESTful API                                                   │
│  - Authentication/Authorization                                  │
│  - Business Logic                                                │
│  - Real-time Events                                              │
└───────────┬────────────────────────────────────┬────────────────┘
            │                                    │
            ▼                                    ▼
┌───────────────────────┐              ┌──────────────────────────┐
│      MongoDB          │              │    ML Service (Python)    │
│  - User Data          │              │  - FastAPI Wrapper        │
│  - Health Records     │              │  - XGBoost Model          │
│  - Audit Logs         │              │  - Prediction API         │
└───────────────────────┘              └──────────────────────────┘
            │
            ▼
┌───────────────────────┐
│        Redis          │
│  - Session Storage    │
│  - Refresh Tokens     │
│  - Rate Limiting      │
└───────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 20.x
- **Python** >= 3.9
- **MongoDB** >= 7.0
- **Redis** >= 7.0
- **pnpm** or **npm**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/immunodetect.git
   cd immunodetect
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   # Create .env.local with NEXT_PUBLIC_API_URL
   npm run dev
   ```

4. **ML Service Setup**
   ```bash
   cd ai/counselors
   pip install -r requirements.txt
   python train_model.py  # Train the model first
   python ml_api.py       # Start the ML API
   ```

### Environment Variables

#### Backend (.env)
```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/immunodetect

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=your-refresh-token-secret
REFRESH_TOKEN_EXPIRES_IN=7d

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/v1/auth/google/callback

# Frontend
FRONTEND_URL=http://localhost:3000

# ML Service
ML_SERVICE_URL=http://localhost:8000

# AWS S3 (for file uploads)
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=immunodetect-uploads
```

#### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
```

---

## 📁 Project Structure

```
immunodetect/
├── ai/                          # AI/ML Components
│   └── counselors/
│       ├── ml_api.py            # FastAPI ML service
│       ├── train_model.py       # Model training script
│       ├── predict.py           # Prediction utilities
│       ├── requirements.txt     # Python dependencies
│       └── immunology_model.pkl # Trained model (generated)
│
├── backend/                     # Express.js Backend
│   ├── src/
│   │   ├── config/              # Configuration files
│   │   │   ├── db.ts            # MongoDB connection
│   │   │   ├── redis.ts         # Redis client
│   │   │   ├── passport.ts      # OAuth strategies
│   │   │   └── s3.ts            # AWS S3 client
│   │   ├── controllers/         # Route handlers
│   │   ├── middlewares/         # Auth, validation, etc.
│   │   ├── models/              # Mongoose schemas
│   │   ├── routes/              # API routes
│   │   ├── services/            # Business logic
│   │   └── index.ts             # Server entry point
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                    # Next.js Frontend
│   ├── app/                     # App Router pages
│   │   ├── login/               # Login page
│   │   ├── register/            # Registration page
│   │   └── dashboard/           # Protected dashboard
│   ├── components/              # React components
│   │   ├── ui/                  # Reusable UI components
│   │   └── dashboard/           # Dashboard-specific
│   ├── lib/                     # Utilities & API
│   │   ├── api.ts               # API client
│   │   ├── auth-context.tsx     # Auth provider
│   │   └── types.ts             # TypeScript types
│   ├── package.json
│   └── next.config.ts
│
└── docs/                        # Documentation
    ├── API.md                   # API reference
    ├── ML_MODEL.md              # ML model documentation
    └── SECURITY.md              # Security guidelines
```

---

## 📚 API Documentation

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login with email/password |
| POST | `/api/v1/auth/logout` | Logout and invalidate tokens |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| GET | `/api/v1/auth/google` | Initiate Google OAuth |
| GET | `/api/v1/auth/me` | Get current user |

### Health Records Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/health-records` | List user's records |
| POST | `/api/v1/health-records` | Create new record |
| GET | `/api/v1/health-records/:id` | Get record details |
| PATCH | `/api/v1/health-records/:id` | Update record |
| POST | `/api/v1/health-records/:id/submit` | Submit for review |
| POST | `/api/v1/health-records/:id/predict` | Request AI prediction |

### Counselor Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/counselor/patients` | List assigned patients |
| GET | `/api/v1/counselor/pending-reviews` | Get pending reviews |
| POST | `/api/v1/counselor/records/:id/review` | Submit review |

### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/admin/users` | List all users |
| PATCH | `/api/v1/admin/users/:id/status` | Update user status |
| GET | `/api/v1/admin/licenses/pending` | Get pending licenses |
| POST | `/api/v1/admin/licenses/:id/approve` | Approve license |

For complete API documentation, see [docs/API.md](./docs/API.md).

---

## 🤖 ML Model

### Overview

The ImmunoDetect ML system uses an **XGBoost** classifier trained on immunogenomics data to predict primary immunodeficiency diseases.

### Detectable Conditions

- **SCID-X1** (X-linked Severe Combined Immunodeficiency)
- **ADA-SCID** (Adenosine Deaminase Deficiency)
- **Healthy** (No immunodeficiency detected)

### Model Features

The model analyzes:
- **Demographics**: Age, gender, family history
- **Clinical Symptoms**: Infection frequency, thrush, diarrhea, failure to thrive
- **Lab Results**: Absolute lymphocyte count (ALC), IgG levels
- **Gene Expression**: CD3, CD4, CD8, CD19, CD56, immunoglobulins, ADA/PNP enzymes

### Model Performance

| Metric | Value |
|--------|-------|
| Accuracy | 94% |
| Precision | 0.92 |
| Recall | 0.93 |
| F1 Score | 0.92 |

### ML API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/predict` | Make prediction |
| POST | `/predict-from-csv` | Predict with CSV upload |
| GET | `/model-info` | Get model information |
| GET | `/diseases` | List detectable diseases |

For detailed ML documentation, see [docs/ML_MODEL.md](./docs/ML_MODEL.md).

---

## 🔒 Security

### Authentication & Authorization
- **JWT Tokens**: Short-lived access tokens (15 min)
- **Refresh Tokens**: Secure rotation with Redis storage
- **PKCE**: Proof Key for Code Exchange for OAuth
- **Role-Based Access Control**: Granular permissions per role

### Data Protection
- **Encryption at Rest**: MongoDB encryption
- **Encryption in Transit**: HTTPS/TLS for all communications
- **Data Minimization**: Only collect necessary health data
- **Audit Logging**: Complete activity trail for compliance

### Security Headers
- Helmet.js for security headers
- CORS with strict origin policy
- Rate limiting per IP and user
- CSRF protection

For security guidelines, see [docs/SECURITY.md](./docs/SECURITY.md).

---

## 🚢 Deployment

### Docker Deployment

```yaml
# docker-compose.yml
version: '3.8'
services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://api:5000/api/v1
    depends_on:
      - api

  api:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      - MONGODB_URI=mongodb://mongo:27017/immunodetect
      - REDIS_HOST=redis
    depends_on:
      - mongo
      - redis

  ml-service:
    build: ./ai/counselors
    ports:
      - "8000:8000"

  mongo:
    image: mongo:7
    volumes:
      - mongo-data:/data/db

  redis:
    image: redis:7-alpine
    volumes:
      - redis-data:/data

volumes:
  mongo-data:
  redis-data:
```

### Production Considerations

1. Use managed database services (MongoDB Atlas, Redis Cloud)
2. Deploy behind a load balancer with SSL termination
3. Enable request logging and monitoring
4. Set up automated backups
5. Configure alerting for system health

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 📞 Support

- **Documentation**: [docs.immunodetect.io](https://docs.immunodetect.io)
- **Issues**: [GitHub Issues](https://github.com/your-org/immunodetect/issues)
- **Email**: support@immunodetect.io

---

<p align="center">
  <b>🧬 ImmunoDetect</b><br>
  Early Detection for Primary Immunodeficiency
</p>
