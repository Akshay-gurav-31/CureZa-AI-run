import { config } from './config';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

class OpenAIService {
  private apiKey: string;
  private baseUrl: string = 'https://api.openai.com/v1';

  constructor() {
    this.apiKey = config.openaiApiKey || '';
    if (!this.apiKey) {
      console.warn('OpenAI API key not configured');
    }
  }

  async createChatCompletion(messages: ChatMessage[], model: string = 'gpt-3.5-turbo'): Promise<string> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'OpenAI API request failed');
      }

      const data: OpenAIResponse = await response.json();
      return data.choices[0]?.message?.content || 'No response generated';
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw error;
    }
  }

  async generateHypothesis(researchContext: string): Promise<string> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: 'You are a research assistant specialized in generating scientific hypotheses based on research papers and context. Generate clear, testable hypotheses that are relevant to the provided research context.'
      },
      {
        role: 'user',
        content: `Based on the following research context, generate a specific, testable hypothesis:\n\n${researchContext}`
      }
    ];

    return this.createChatCompletion(messages);
  }

  async analyzeResearchPaper(paperContent: string): Promise<string> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: 'You are a research analyst. Analyze the provided research paper and extract key insights, methodology, findings, and potential implications.'
      },
      {
        role: 'user',
        content: `Please analyze this research paper and provide key insights:\n\n${paperContent}`
      }
    ];

    return this.createChatCompletion(messages);
  }

  async chatResponse(userMessage: string, context?: string): Promise<string> {
    const systemMessage = context 
      ? `You are a research assistant. Use the following context to help answer questions: ${context}`
      : 'You are a helpful research assistant specializing in academic research and hypothesis generation.';

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: systemMessage
      },
      {
        role: 'user',
        content: userMessage
      }
    ];

    return this.createChatCompletion(messages);
  }

  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.startsWith('sk-');
  }
}

export const openaiService = new OpenAIService();