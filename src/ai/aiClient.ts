import { GoogleGenerativeAI } from '@google/generative-ai';

export interface AIClient {
  classifyEmail(args: {
    subject: string;
    from: string;
    text: string;
    categories: { id: string; name: string; description: string }[];
  }): Promise<{ categoryId?: string; confidence: number; reason: string }>;

  summarizeEmail(args: {
    subject: string;
    from: string;
    text: string;
  }): Promise<string>;
}

/**
 * Gemini AI Client implementation
 */
export class GeminiAIClient implements AIClient {
  private client: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
    this.model = this.client.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  }

  async classifyEmail(args: {
    subject: string;
    from: string;
    text: string;
    categories: { id: string; name: string; description: string }[];
  }): Promise<{ categoryId?: string; confidence: number; reason: string }> {
    const categoriesText = args.categories
      .map((cat) => `- ${cat.name} (ID: ${cat.id}): ${cat.description}`)
      .join('\n');

    const prompt = `You are an email classification assistant. Classify the following email into one of the provided categories.

Email:
Subject: ${args.subject}
From: ${args.from}
Body: ${args.text.substring(0, 1000)}

Categories:
${categoriesText}

Return your response as valid JSON with this structure:
{
  "categoryId": "the category ID that best matches, or null if no good match",
  "confidence": 0.0-1.0,
  "reason": "brief explanation of why this category was chosen"
}`;

    const result = await this.model.generateContent(prompt);
    const response = result.response.text();

    try {
      // Extract JSON from response (may be wrapped in markdown code blocks)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        categoryId: parsed.categoryId || undefined,
        confidence: parsed.confidence || 0.5,
        reason: parsed.reason || 'No reason provided',
      };
    } catch (error) {
      console.error('Failed to parse AI classification response:', error);
      return {
        categoryId: undefined,
        confidence: 0,
        reason: 'Failed to classify',
      };
    }
  }

  async summarizeEmail(args: {
    subject: string;
    from: string;
    text: string;
  }): Promise<string> {
    const prompt = `Summarize the following email in 2-3 sentences (40-80 words). Include the sender, main purpose, and any call-to-action.

Email:
Subject: ${args.subject}
From: ${args.from}
Body: ${args.text.substring(0, 2000)}

Return only the summary text, no additional formatting.`;

    const result = await this.model.generateContent(prompt);
    const summary = result.response.text().trim();
    return summary;
  }
}

/**
 * Get the configured AI client
 */
export function getAIClient(): AIClient {
  const provider = process.env.AI_PROVIDER || 'gemini';

  switch (provider) {
    case 'gemini':
      if (!process.env.GOOGLE_AI_API_KEY) {
        throw new Error('GOOGLE_AI_API_KEY not configured');
      }
      return new GeminiAIClient(process.env.GOOGLE_AI_API_KEY);

    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}
