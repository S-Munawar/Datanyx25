import fetch from 'node-fetch';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface GeminiMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

interface GeminiResponse {
  candidates: {
    content: {
      parts: { text: string }[];
    };
  }[];
}

const GEMINI_API_KEY=process.env.GEMINI_API_KEY!;
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const SYSTEM_PROMPT = `You are an AI Immunodeficiency Educator. You explain concepts about immunodeficiencies, immune system basics, lab tests, and general lifestyle/precaution guidance in simple patient-friendly language. 

IMPORTANT GUIDELINES:
- You do NOT diagnose, do NOT suggest or adjust medications, and do NOT tell users what exact disease they have
- Always encourage consulting a qualified doctor or immunologist
- If a question requires diagnosis, treatment decisions, medication choice, or emergency guidance, tell the user to contact a healthcare professional or emergency services
- Focus on education about immune system function, types of immunodeficiencies, general symptoms to watch for, and lifestyle precautions
- Use simple, non-medical language that patients can understand
- Always include appropriate disclaimers about seeking professional medical advice

You can discuss:
- What immunodeficiencies are in general terms
- How the immune system works
- Types of lab tests used to evaluate immune function
- General lifestyle precautions for people with weakened immunity
- When to seek medical attention
- General information about treatments (without recommending specific ones)

Remember: You are an educator, not a doctor. Always emphasize the importance of professional medical care.`;

export async function generateImmunoEducatorResponse(messages: ChatMessage[]): Promise<string> {
  if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY is not configured');
    return 'I apologize, but the AI educator service is currently unavailable. Please consult with a healthcare professional for information about immunodeficiencies.';
  }

  try {
    // Convert chat messages to Gemini format
    const geminiMessages: GeminiMessage[] = [];
    
    // Add system prompt as first user message (Gemini doesn't have system role)
    geminiMessages.push({
      role: 'user',
      parts: [{ text: SYSTEM_PROMPT }]
    });
    
    geminiMessages.push({
      role: 'model',
      parts: [{ text: 'I understand. I am an AI Immunodeficiency Educator focused on providing educational information while always emphasizing the importance of professional medical care. How can I help educate you about immunodeficiencies today?' }]
    });

    // Add conversation history
    for (const message of messages) {
      if (message.role === 'system') continue; // Skip system messages as we handle them above
      
      geminiMessages.push({
        role: message.role === 'user' ? 'user' : 'model',
        parts: [{ text: message.content }]
      });
    }

    const requestBody = {
      contents: geminiMessages,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        }
      ]
    };

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      return 'I apologize, but I\'m having trouble processing your question right now. Please try again later or consult with a healthcare professional.';
    }

    const data = await response.json() as GeminiResponse;
    
    if (!data.candidates || data.candidates.length === 0) {
      return 'I apologize, but I couldn\'t generate a response to your question. Please rephrase your question or consult with a healthcare professional.';
    }

    const reply = data.candidates[0].content.parts[0].text;
    
    // Add disclaimer to every response
    const disclaimer = '\n\n⚠️ **Important Disclaimer**: This information is for educational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment. Always consult your doctor or a qualified healthcare professional for medical concerns.';
    
    return reply + disclaimer;

  } catch (error) {
    console.error('Error calling Gemini API:', error);
    return 'I apologize, but I\'m experiencing technical difficulties. Please try again later or consult with a healthcare professional for information about immunodeficiencies.';
  }
}