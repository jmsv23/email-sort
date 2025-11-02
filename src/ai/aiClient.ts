import { GoogleGenAI } from '@google/genai';
import { categoriesAnalysisSchema } from './responseSchemas';

export interface AIClient {
  classifyEmail(args: {
    subject: string;
    from: string;
    bodyTextVersion: string;
    bodyMarkdownVersion?: string;
    categories: { id: string; name: string; description: string }[];
  }): Promise<{
    categoryId?: string;
    confidence: number;
    reason: string;
    summary: string;
    unsubscribeLink?: string;
  }>;
}

/**
 * Gemini AI Client implementation
 */
export class GeminiAIClient implements AIClient {
  private ai: GoogleGenAI;
  private model: string;

  constructor(apiKey: string, modelName: string) {
    this.ai = new GoogleGenAI({ apiKey });
    this.model = modelName;
  }

  async classifyEmail(args: {
    subject: string;
    from: string;
    bodyTextVersion: string;
    bodyMarkdownVersion?: string;
    categories: { id: string; name: string; description: string }[];
  }): Promise<{
    categoryId?: string;
    confidence: number;
    reason: string;
    summary: string;
    unsubscribeLink?: string;
  }> {
    const categoriesText = args.categories
      .map((cat) => `- ${cat.name} (ID: ${cat.id}): ${cat.description}`)
      .join('\n');

    const systemContent = [
      'You are an email classification and analysis assistant. For the given email:',
      '1. Classify it into one of the provided categories',
      '2. Generate a 2-3 sentence summary (40-80 words) including sender, purpose, and call-to-action',
      '3. Extract any HTTP/HTTPS unsubscribe URL if present in the email content',
      `Categories: ${categoriesText}`
    ];

    const prompt = `
EMAIL:
Subject: ${args.subject}
From: ${args.from}

Body (Plain Text):
${args.bodyTextVersion.substring(0, 2000)}

Body (Markdown from HTML):
${args.bodyMarkdownVersion ? args.bodyMarkdownVersion.substring(0, 2000) : 'N/A'}

Analyze this email and return:
- The best matching category ID (or null if no good match)
- Confidence score (0.0-1.0)
- Reason for classification
- A 2-3 sentence summary
- Any unsubscribe link found in the email body (look for URLs containing "unsubscribe", "opt-out", "preferences", etc.)`;

console.log('AI classification prompt:', prompt);

    const response = await this.ai.models.generateContent({
      model: this.model,
      config: {
        systemInstruction: systemContent,
        responseMimeType: "application/json",
        responseSchema: categoriesAnalysisSchema,
      },
      contents: [{ text: prompt }],
    });

    const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    console.log('AI classification response text:', responseText);

    try {
      // Extract JSON from response (may be wrapped in markdown code blocks)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        categoryId: parsed.categoryId || undefined,
        confidence: parsed.confidence || 0.5,
        reason: parsed.reason || 'No reason provided',
        summary: parsed.summary || 'No summary available',
        unsubscribeLink: parsed.unsubscribeLink || undefined,
      };
    } catch (error) {
      console.error('Failed to parse AI classification response:', error);
      return {
        categoryId: undefined,
        confidence: 0,
        reason: 'Failed to classify',
        summary: 'Failed to generate summary',
        unsubscribeLink: undefined,
      };
    }
  }

}

/**
 * Get the configured AI client
 */
export function getAIClient(): AIClient {
  const provider = process.env.AI_PROVIDER || 'gemini';
  const model = process.env.AI_MODEL || 'gemini-2.5-flash';

  switch (provider) {
    case 'gemini':
      if (!process.env.GOOGLE_AI_API_KEY) {
        throw new Error('GOOGLE_AI_API_KEY not configured');
      }
      return new GeminiAIClient(process.env.GOOGLE_AI_API_KEY, model);

    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}
