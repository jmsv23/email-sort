import { GoogleGenAI } from '@google/genai';
import { categoriesAnalysisSchema } from './responseSchemas';

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
  private ai: GoogleGenAI;
  private model: string;

  constructor(apiKey: string, modelName: string) {
    this.ai = new GoogleGenAI({ apiKey });
    this.model = modelName;
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

    const systemContent = [
      'You are an email classification assistant. Classify the following email into one of the provided categories.',
      `Categories: ${categoriesText}`
    ];

    const prompt = `
EMAIL:
Subject: ${args.subject}
From: ${args.from}
Body: ${args.text.substring(0, 1000)}`;

/*
Return your response as valid JSON with this structure:
{
  "categoryId": "the category ID that best matches, or null if no good match",
  "confidence": 0.0-1.0,
  "reason": "brief explanation of why this category was chosen"
}
*/

    const response = await this.ai.models.generateContent({
      model: this.model,
      config: {
        systemInstruction: systemContent,
        responseMimeType: "application/json",
        responseSchema: categoriesAnalysisSchema,
      },
      contents: [{ text: prompt }],
    });

    console.log('AI classification response:', response);

    const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

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

    const systemContent = [
      'You are an email summarization assistant. Summarize the following email in 2-3 sentences (40-80 words). Include the sender, main purpose, and any call-to-action.',
    ];
    const prompt = `
EMAIL:
Subject: ${args.subject}
From: ${args.from}
Body: ${args.text.substring(0, 2000)}

Return only the summary text, no additional formatting.`;

    const response = await this.ai.models.generateContent({
      model: this.model,
      config: {
        systemInstruction: systemContent,
      },
      contents: [{ text: prompt }],
    });

    console.log('AI summarization response:', response);

    const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const summary = responseText.trim();
    return summary;
  }
}

/**
 * Get the configured AI client
 */
export function getAIClient(): AIClient {
  const provider = process.env.AI_PROVIDER || 'gemini';
  const model = process.env.AI_MODEL || 'gemini-2.0-flash-exp';

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
