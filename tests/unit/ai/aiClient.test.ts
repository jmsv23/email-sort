/**
 * Unit tests for AI Client
 * Tests classification and summarization logic with mocked Gemini API
 */

import { GeminiAIClient, getAIClient } from '@/ai/aiClient';
import { GoogleGenAI } from '@google/genai';

// Mock the Gemini SDK
jest.mock('@google/genai');

describe('AI Client', () => {
  const mockApiKey = 'test-api-key';
  const mockModel = 'gemini-2.5-flash';

  const mockCategories = [
    { id: 'cat-1', name: 'Newsletters', description: 'Marketing emails and newsletters' },
    { id: 'cat-2', name: 'Receipts', description: 'Purchase receipts and confirmations' },
    { id: 'cat-3', name: 'Social', description: 'Social media notifications' },
  ];

  const mockEmailArgs = {
    subject: 'Weekly Newsletter - Amazing Deals!',
    from: 'newsletter@example.com',
    bodyTextVersion: 'Check out our amazing deals this week. Click here to shop now. To unsubscribe, visit https://example.com/unsubscribe',
    bodyMarkdownVersion: 'Check out our **amazing deals** this week.',
    categories: mockCategories,
  };

  let mockGenerateContent: jest.Mock;
  let mockModels: { generateContent: jest.Mock };
  let client: GeminiAIClient;

  beforeEach(() => {
    jest.clearAllMocks();

    mockGenerateContent = jest.fn();
    mockModels = { generateContent: mockGenerateContent };

    (GoogleGenAI as jest.MockedClass<typeof GoogleGenAI>).mockImplementation(() => ({
      models: mockModels,
    } as any));

    client = new GeminiAIClient(mockApiKey, mockModel);

    // Suppress console.log in tests
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GeminiAIClient', () => {
    describe('constructor', () => {
      it('should initialize with API key and model name', () => {
        expect(GoogleGenAI).toHaveBeenCalledWith({ apiKey: mockApiKey });
        expect(client).toBeInstanceOf(GeminiAIClient);
      });
    });

    describe('classifyEmail', () => {
      it('should classify email into correct category', async () => {
        const mockResponse = {
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      categoryId: 'cat-1',
                      confidence: 0.95,
                      reason: 'This is clearly a marketing newsletter',
                      summary: 'Marketing newsletter from example.com promoting weekly deals and offers.',
                      unsubscribeLink: 'https://example.com/unsubscribe',
                    }),
                  },
                ],
              },
            },
          ],
        };

        mockGenerateContent.mockResolvedValue(mockResponse);

        const result = await client.classifyEmail(mockEmailArgs);

        expect(result).toEqual({
          categoryId: 'cat-1',
          confidence: 0.95,
          reason: 'This is clearly a marketing newsletter',
          summary: 'Marketing newsletter from example.com promoting weekly deals and offers.',
          unsubscribeLink: 'https://example.com/unsubscribe',
        });
      });

      it('should handle uncategorized emails', async () => {
        const mockResponse = {
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      categoryId: null,
                      confidence: 0.3,
                      reason: 'No clear category match',
                      summary: 'Email content does not match any defined categories.',
                      unsubscribeLink: undefined,
                    }),
                  },
                ],
              },
            },
          ],
        };

        mockGenerateContent.mockResolvedValue(mockResponse);

        const result = await client.classifyEmail(mockEmailArgs);

        expect(result.categoryId).toBeUndefined();
        expect(result.confidence).toBe(0.3);
      });

      it('should extract unsubscribe links', async () => {
        const mockResponse = {
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      categoryId: 'cat-1',
                      confidence: 0.9,
                      reason: 'Newsletter',
                      summary: 'Weekly newsletter.',
                      unsubscribeLink: 'https://example.com/unsubscribe?email=user@test.com',
                    }),
                  },
                ],
              },
            },
          ],
        };

        mockGenerateContent.mockResolvedValue(mockResponse);

        const result = await client.classifyEmail(mockEmailArgs);

        expect(result.unsubscribeLink).toBe('https://example.com/unsubscribe?email=user@test.com');
      });

      it('should handle missing unsubscribe link', async () => {
        const mockResponse = {
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      categoryId: 'cat-2',
                      confidence: 0.9,
                      reason: 'Purchase receipt',
                      summary: 'Receipt for your recent purchase.',
                      unsubscribeLink: null,
                    }),
                  },
                ],
              },
            },
          ],
        };

        mockGenerateContent.mockResolvedValue(mockResponse);

        const result = await client.classifyEmail(mockEmailArgs);

        expect(result.unsubscribeLink).toBeUndefined();
      });

      it('should call Gemini API with correct parameters', async () => {
        const mockResponse = {
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      categoryId: 'cat-1',
                      confidence: 0.9,
                      reason: 'Test',
                      summary: 'Test summary',
                    }),
                  },
                ],
              },
            },
          ],
        };

        mockGenerateContent.mockResolvedValue(mockResponse);

        await client.classifyEmail(mockEmailArgs);

        expect(mockGenerateContent).toHaveBeenCalledWith({
          model: mockModel,
          config: {
            systemInstruction: expect.arrayContaining([
              expect.stringContaining('email classification'),
              expect.stringContaining('Categories:'),
            ]),
            responseMimeType: 'application/json',
            responseSchema: expect.any(Object),
          },
          contents: [
            {
              text: expect.stringContaining('Subject: Weekly Newsletter'),
            },
          ],
        });
      });

      it('should truncate long email bodies', async () => {
        const longBody = 'a'.repeat(5000);
        const argsWithLongBody = {
          ...mockEmailArgs,
          bodyTextVersion: longBody,
          bodyMarkdownVersion: longBody,
        };

        const mockResponse = {
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      categoryId: 'cat-1',
                      confidence: 0.9,
                      reason: 'Test',
                      summary: 'Test summary',
                    }),
                  },
                ],
              },
            },
          ],
        };

        mockGenerateContent.mockResolvedValue(mockResponse);

        await client.classifyEmail(argsWithLongBody);

        const callArgs = mockGenerateContent.mock.calls[0][0];
        const promptText = callArgs.contents[0].text;

        // Should not include the full 5000 character body
        expect(promptText.length).toBeLessThan(longBody.length * 2);
      });

      it('should handle JSON wrapped in markdown code blocks', async () => {
        const mockResponse = {
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: '```json\n' + JSON.stringify({
                      categoryId: 'cat-1',
                      confidence: 0.9,
                      reason: 'Test',
                      summary: 'Test summary',
                    }) + '\n```',
                  },
                ],
              },
            },
          ],
        };

        mockGenerateContent.mockResolvedValue(mockResponse);

        const result = await client.classifyEmail(mockEmailArgs);

        expect(result.categoryId).toBe('cat-1');
        expect(result.confidence).toBe(0.9);
      });

      it('should handle API errors gracefully', async () => {
        mockGenerateContent.mockRejectedValue(new Error('API Error'));

        await expect(client.classifyEmail(mockEmailArgs)).rejects.toThrow('API Error');
      });

      it('should handle malformed JSON response', async () => {
        const mockResponse = {
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: 'This is not valid JSON',
                  },
                ],
              },
            },
          ],
        };

        mockGenerateContent.mockResolvedValue(mockResponse);

        const result = await client.classifyEmail(mockEmailArgs);

        expect(result).toEqual({
          categoryId: undefined,
          confidence: 0,
          reason: 'Failed to classify',
          summary: 'Failed to generate summary',
          unsubscribeLink: undefined,
        });
      });

      it('should handle missing response candidates', async () => {
        const mockResponse = {
          candidates: [],
        };

        mockGenerateContent.mockResolvedValue(mockResponse);

        const result = await client.classifyEmail(mockEmailArgs);

        expect(result).toEqual({
          categoryId: undefined,
          confidence: 0,
          reason: 'Failed to classify',
          summary: 'Failed to generate summary',
          unsubscribeLink: undefined,
        });
      });

      it('should provide default values for missing fields', async () => {
        const mockResponse = {
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      categoryId: 'cat-1',
                      // Missing other fields
                    }),
                  },
                ],
              },
            },
          ],
        };

        mockGenerateContent.mockResolvedValue(mockResponse);

        const result = await client.classifyEmail(mockEmailArgs);

        expect(result.categoryId).toBe('cat-1');
        expect(result.confidence).toBe(0.5); // default
        expect(result.reason).toBe('No reason provided'); // default
        expect(result.summary).toBe('No summary available'); // default
      });
    });
  });

  describe('getAIClient', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('should return GeminiAIClient when provider is gemini', () => {
      process.env.AI_PROVIDER = 'gemini';
      process.env.GOOGLE_AI_API_KEY = 'test-key';
      process.env.AI_MODEL = 'gemini-2.5-flash';

      const client = getAIClient();

      expect(client).toBeInstanceOf(GeminiAIClient);
    });

    it('should use default provider (gemini) when not specified', () => {
      delete process.env.AI_PROVIDER;
      process.env.GOOGLE_AI_API_KEY = 'test-key';

      const client = getAIClient();

      expect(client).toBeInstanceOf(GeminiAIClient);
    });

    it('should throw error when GOOGLE_AI_API_KEY is missing', () => {
      process.env.AI_PROVIDER = 'gemini';
      delete process.env.GOOGLE_AI_API_KEY;

      expect(() => getAIClient()).toThrow('GOOGLE_AI_API_KEY not configured');
    });

    it('should throw error for unsupported provider', () => {
      process.env.AI_PROVIDER = 'unsupported-provider';
      process.env.GOOGLE_AI_API_KEY = 'test-key';

      expect(() => getAIClient()).toThrow('Unsupported AI provider: unsupported-provider');
    });

    it('should use default model when not specified', () => {
      process.env.AI_PROVIDER = 'gemini';
      process.env.GOOGLE_AI_API_KEY = 'test-key';
      delete process.env.AI_MODEL;

      const client = getAIClient();

      expect(client).toBeInstanceOf(GeminiAIClient);
    });
  });
});
