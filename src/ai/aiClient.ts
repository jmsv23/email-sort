import { GoogleGenAI } from '@google/genai';
import { PlaywrightClient } from '@/lib/playwrightClient';
import { categoriesAnalysisSchema, playwrightInstructionsSchema, unsubscribeResponseSchema } from './responseSchemas';

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

  unsubscribeFrom(args: {
    url: string;
    email: string;
  }): Promise<{
    success: boolean;
    reason: string;
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

  async unsubscribeFrom(args: {
    url: string;
    email: string;
  }): Promise<{
    success: boolean;
    reason: string;
  }> {

    const client = new PlaywrightClient();
    await client.initialize({ headless: true });
    try {
      await client.openPage(args.url);
    } catch (error) {
      console.error('Failed to load unsubscribe page:', error);
      await client.close();
      return {
        success: false,
        reason: 'Failed to load unsubscribe page',
      };
    }

    const content = await client.getPageContent();
    const screenshotBase64 = await client.getScreenshot();

    const systemContent = [
      'You are an unsubscribe automation assistant.',
      'Given an unsubscribe URL and email address, analyze the page and determine the best strategy for unsubscribing.',
      'Provide guidance on form fields to fill, buttons to click, and expected success indicators.',
      'Return your response as a JSON array of instructions for automated unsubscribe using Playwright.',
      'Each instruction should specify the action (fill, click, check, selectOption), the target element (by label text or role), and any necessary values. keep the instructions concise, ordered and focused on the unsubscribe process.',
    ];
    // Unsubscribe URL: ${args.url}
    const prompt = `
Email: ${args.email}
Page Content (dom):
${content.substring(0, 4000)}

Analyze this unsubscribe link and provide instructions for automated unsubscribe.
note: prompt provide page content and screenshot only for analysis, do not include them in the instructions.`;

    const response = await this.ai.models.generateContent({
      model: this.model,
      config: {
        systemInstruction: systemContent,
        responseMimeType: "application/json",
        responseSchema: playwrightInstructionsSchema,
      },
      contents: [
        { 
          text: prompt,
        },
        {
          inlineData: {
            mimeType: "image/png",
            data: screenshotBase64,
          }
        }
      ],
    });

    const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    try {
      // Extract JSON from response (may be wrapped in markdown code blocks)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      const parsed = JSON.parse(jsonMatch[0]);
      const { instructions } = parsed;

      console.log('Executing unsubscribe instructions:', instructions);

      for (const instruction of instructions) {
        try {
          switch (instruction.action) {
            case 'fill':
              await client.fill(
                instruction.locatorType,
                instruction.locatorValue,
                instruction.value,
                instruction.roleOptions,
                10000 // 10 seconds timeout
              );
              break;
            case 'click':
              await client.click(
                instruction.locatorType,
                instruction.locatorValue,
                instruction.roleOptions,
                10000 // 10 seconds timeout
              );
              break;
            case 'check':
              await client.check(
                instruction.locatorType,
                instruction.locatorValue,
                instruction.roleOptions,
                10000 // 10 seconds timeout
              );
              break;
            case 'selectOption':
              await client.selectOption(
                instruction.locatorType,
                instruction.locatorValue,
                instruction.value,
                instruction.roleOptions,
                10000 // 10 seconds timeout
              );
              break;
            default:
              console.warn('Unknown instruction action:', instruction.action);
          }
        } catch (error) {
          console.error('Error executing unsubscribe instructions:', error);
        }
      }
      

      const afterScreenshot = await client.getScreenshot(); // Capture final state screenshot

      const validateResponse = await this.ai.models.generateContent({
        model: this.model,
        config: {
          systemInstruction: [
            'You are an unsubscribe verification assistant.',
            'Analyze the final state of the unsubscribe page after performing the actions and determine if the unsubscribe was likely successful or if there were errors.',
            'Return your response as a JSON object indicating success (true/false) and reason.',
          ],
          responseMimeType: "application/json",
          responseSchema: unsubscribeResponseSchema,
        },
        contents: [
          { 
            text: 'Please analyze the final state of the unsubscribe page after performing the actions. Indicate whether the unsubscribe was likely successful or if there were errors.',
          },
          {
            inlineData: {
              mimeType: "image/png",
              data: afterScreenshot,
            }
          }
        ],
      });

      const validateResponseText = validateResponse.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

      let res = {
        success: false,
        reason: 'Unsubscribe verification failed',
      }
      try {
        const validationJsonMatch = validateResponseText.match(/\{[\s\S]*\}/);
        if (!validationJsonMatch) {
          throw new Error('No JSON found in response');
        }
        const validationResult = JSON.parse(validationJsonMatch[0]);
        res = {
          ...validationResult,
        };
      } catch (error) {
        console.error('Failed to parse unsubscribe validation response:', error);
      }

      await client.close();
      return res;
    } catch (error) {
      console.error('Failed to parse unsubscribe instructions:', error);
      await client.close();
      return {
        success: false,
        reason: 'Something went wrong during unsubscribe process',
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
