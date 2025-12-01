const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export interface ApiChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function sendImmunoEducatorMessage(messages: ChatMessage[]): Promise<string> {
  try {
    // Convert frontend messages to API format
    const apiMessages: ApiChatMessage[] = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    const response = await fetch(`${API_BASE}/educator/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages: apiMessages }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to get response from educator');
    }

    return data.reply;
  } catch (error) {
    console.error('Error calling immuno educator API:', error);
    
    if (error instanceof Error) {
      // Return user-friendly error messages
      if (error.message.includes('RATE_LIMITED')) {
        return 'You\'re asking questions too quickly. Please wait a moment before asking again.';
      }
      if (error.message.includes('network') || error.message.includes('fetch')) {
        return 'Unable to connect to the educator service. Please check your internet connection and try again.';
      }
    }
    
    return 'I apologize, but I\'m having trouble processing your question right now. Please try again later or consult with a healthcare professional.';
  }
}

export async function checkEducatorHealth(): Promise<{ available: boolean; message: string }> {
  try {
    const response = await fetch(`${API_BASE}/educator/health`);
    const data = await response.json();
    
    return {
      available: data.status === 'available',
      message: data.message || 'Unknown status'
    };
  } catch (error) {
    return {
      available: false,
      message: 'Unable to check educator service status'
    };
  }
}