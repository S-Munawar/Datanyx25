# AI Immunodeficiency Educator Setup

## Overview
The AI Immunodeficiency Educator is now implemented and integrated into the ImmunoDetect platform. It uses Google's Gemini API to provide educational information about immunodeficiencies to all users.

## Features Implemented

### Backend
- ✅ Gemini API client configuration (`backend/src/config/geminiClient.ts`)
- ✅ Educator API routes (`backend/src/routes/educator.routes.ts`)
- ✅ Rate limiting (10 requests per minute)
- ✅ Error handling and safety measures
- ✅ System prompt for medical safety

### Frontend
- ✅ Chat interface (`frontend/app/educator/page.tsx`)
- ✅ API helper functions (`frontend/lib/immunoEducator.ts`)
- ✅ Navigation integration for all user roles
- ✅ Mobile-responsive design
- ✅ Service status indicator
- ✅ Prominent medical disclaimers

## Setup Instructions

### 1. Install Dependencies
```bash
cd backend
npm install node-fetch@2.7.0 @types/node-fetch@2.6.11
```

### 2. Get Gemini API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the API key

### 3. Configure Environment
Add to `backend/.env`:
```env
GEMINI_API_KEY=your-actual-gemini-api-key-here
```

### 4. Start Services
```bash
# Backend
cd backend
npm run dev

# Frontend (in another terminal)
cd frontend
npm run dev
```

## API Endpoints

### Chat Endpoint
- **POST** `/api/v1/educator/chat`
- **Body**: `{ messages: [{ role: 'user', content: 'question' }] }`
- **Response**: `{ success: true, reply: 'AI response' }`

### Legacy Endpoint (Backward Compatibility)
- **POST** `/api/v1/educator/ask`
- **Body**: `{ question: 'What is SCID?' }`
- **Response**: `{ success: true, data: { answer: 'AI response' } }`

### Health Check
- **GET** `/api/v1/educator/health`
- **Response**: `{ success: true, status: 'available', message: '...' }`

## Access Levels

### Public Access (No Authentication Required)
- ✅ Anyone can access `/educator` page
- ✅ Full chat functionality available
- ✅ Educational content accessible to all

### Authenticated Users
- ✅ "AI Educator" appears in dashboard navigation
- ✅ Available to all roles: Patient, Counselor, Researcher, Admin
- ✅ Same functionality as public access

## Safety Features

### Medical Safety
- ✅ System prompt prevents diagnosis/treatment advice
- ✅ Always redirects medical questions to healthcare professionals
- ✅ Prominent disclaimers on every response
- ✅ Educational focus only

### Technical Safety
- ✅ Rate limiting (10 requests/minute)
- ✅ Input validation
- ✅ Error handling with safe fallbacks
- ✅ Content filtering via Gemini safety settings

## Usage Examples

### Sample Questions the AI Can Handle:
- "What is a primary immunodeficiency?"
- "What are common symptoms to watch for?"
- "What lab tests check immune function?"
- "How can someone with weak immunity stay healthy?"
- "What is SCID in simple terms?"

### Questions the AI Will Redirect:
- "Do I have an immunodeficiency?"
- "What medication should I take?"
- "Can you diagnose my condition?"
- "Should I stop my current treatment?"

## Testing

### Manual Testing
1. Visit `/educator` (works without login)
2. Try sample questions from above
3. Verify disclaimers appear
4. Test rate limiting (send >10 requests quickly)
5. Test mobile responsiveness

### API Testing
```bash
# Test health endpoint
curl http://localhost:5000/api/v1/educator/health

# Test chat endpoint
curl -X POST http://localhost:5000/api/v1/educator/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"What is SCID?"}]}'
```

## Troubleshooting

### Common Issues

1. **"Gemini API key not configured"**
   - Check `.env` file has `GEMINI_API_KEY=...`
   - Restart backend server after adding key

2. **"Service unavailable"**
   - Verify API key is valid
   - Check internet connection
   - Check Gemini API quotas/limits

3. **Rate limiting errors**
   - Wait 1 minute between test sessions
   - Normal behavior for abuse prevention

4. **Navigation not showing**
   - Clear browser cache
   - Check if user is logged in for dashboard access

## Next Steps

### Potential Enhancements
- [ ] Conversation history persistence
- [ ] User feedback system
- [ ] Multi-language support
- [ ] Voice input/output
- [ ] Integration with assessment results
- [ ] Counselor review of AI responses

### Monitoring
- [ ] Add analytics for usage patterns
- [ ] Monitor API costs
- [ ] Track user satisfaction
- [ ] Log common questions for improvement

## Security Notes

- API key is server-side only (not exposed to frontend)
- Rate limiting prevents abuse
- No PHI is logged or stored
- All responses include medical disclaimers
- Content filtering prevents harmful responses