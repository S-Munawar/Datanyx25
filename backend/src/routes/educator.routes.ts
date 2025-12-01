import { Router, Request, Response } from 'express';
import { generateImmunoEducatorResponse } from '../config/geminiClient';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting for educator endpoints - more restrictive to prevent abuse
const educatorLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: {
    success: false,
    error: 'RATE_LIMITED',
    message: 'Too many questions asked. Please wait a moment before asking again.',
  },
});

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  messages?: ChatMessage[];
  question?: string; // For backward compatibility with existing frontend
}

// POST /api/v1/educator/chat - Main chat endpoint
router.post('/chat', educatorLimiter, async (req: Request, res: Response) => {
  try {
    const { messages }: { messages: ChatMessage[] } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_REQUEST',
        message: 'Messages array is required and cannot be empty',
      });
    }

    // Validate message format
    for (const message of messages) {
      if (!message.role || !message.content || typeof message.content !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'INVALID_MESSAGE_FORMAT',
          message: 'Each message must have role and content fields',
        });
      }
    }

    const reply = await generateImmunoEducatorResponse(messages);

    res.json({
      success: true,
      reply,
    });

  } catch (error) {
    console.error('Error in educator chat:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to process your question. Please try again.',
    });
  }
});

// POST /api/v1/educator/ask - Backward compatibility endpoint
router.post('/ask', educatorLimiter, async (req: Request, res: Response) => {
  try {
    const { question }: { question: string } = req.body;

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_REQUEST',
        message: 'Question is required and cannot be empty',
      });
    }

    // Convert single question to messages format
    const messages: ChatMessage[] = [
      { role: 'user', content: question.trim() }
    ];

    const reply = await generateImmunoEducatorResponse(messages);

    res.json({
      success: true,
      data: {
        answer: reply,
      },
    });

  } catch (error) {
    console.error('Error in educator ask:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to process your question. Please try again.',
    });
  }
});

// GET /api/v1/educator/health - Health check for educator service
router.get('/health', (req: Request, res: Response) => {
  const hasApiKey = !!process.env.GEMINI_API_KEY;
  
  res.json({
    success: true,
    status: hasApiKey ? 'available' : 'unavailable',
    message: hasApiKey 
      ? 'AI Immunodeficiency Educator is ready' 
      : 'Gemini API key not configured',
  });
});

export default router;