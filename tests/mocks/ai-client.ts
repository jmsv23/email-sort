/**
 * Mock AI client for testing classification and summarization
 */

export const mockClassificationResult = {
  categoryId: 'category-123',
  confidence: 0.95,
  reason: 'Email contains newsletter-style content with marketing language',
};

export const mockClassificationResultUncategorized = {
  categoryId: null,
  confidence: 0.4,
  reason: 'No clear match with existing categories',
};

export const mockSummary = 'This is a marketing newsletter from Example Corp promoting their weekly deals and offers. The email includes links to shop and encourages immediate action.';

/**
 * Mock AIClient implementation
 */
export const createMockAIClient = () => ({
  classifyEmail: jest.fn().mockResolvedValue(mockClassificationResult),
  summarizeEmail: jest.fn().mockResolvedValue(mockSummary),
});

/**
 * Mock Gemini API responses
 */
export const mockGeminiClassificationResponse = {
  candidates: [
    {
      content: {
        parts: [
          {
            text: JSON.stringify({
              categoryId: 'category-123',
              confidence: 0.95,
              reason: 'Newsletter content detected',
            }),
          },
        ],
      },
    },
  ],
};

export const mockGeminiSummarizationResponse = {
  candidates: [
    {
      content: {
        parts: [
          {
            text: 'This is a marketing newsletter from Example Corp promoting their weekly deals.',
          },
        ],
      },
    },
  ],
};

/**
 * Mock for @google/generative-ai
 */
export const createMockGeminiModel = () => ({
  generateContent: jest.fn()
    .mockResolvedValueOnce({
      response: {
        text: () => JSON.stringify(mockClassificationResult),
      },
    })
    .mockResolvedValueOnce({
      response: {
        text: () => mockSummary,
      },
    }),
});

/**
 * Helper to mock the entire AI module
 */
export const mockAIModule = {
  classifyEmail: jest.fn().mockResolvedValue(mockClassificationResult),
  summarizeEmail: jest.fn().mockResolvedValue(mockSummary),
};
