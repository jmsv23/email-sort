import { Type } from '@google/genai';

/*
Return your response as valid JSON with this structure:
{
  "categoryId": "the category ID that best matches, or null if no good match",
  "confidence": 0.0-1.0,
  "reason": "brief explanation of why this category was chosen",
  "summary": "2-3 sentence summary of the email (40-80 words)",
  "unsubscribeLink": "unsubscribe URL if found in email content, or null"
}
*/

export const categoriesAnalysisSchema = {
  type: Type.OBJECT,
  properties: {
    categoryId: {
      type: Type.STRING,
      nullable: true,
    },
    confidence: {
      type: Type.NUMBER,
      minimum: 0.0,
      maximum: 1.0,
    },
    reason: {
      type: Type.STRING,
    },
    summary: {
      type: Type.STRING,
      description: "2-3 sentence summary (40-80 words) including sender, purpose, and call-to-action",
    },
    unsubscribeLink: {
      type: Type.STRING,
      nullable: true,
      description: "HTTP/HTTPS unsubscribe URL if found in email body/links, otherwise null",
    },
  },
  propertyOrdering: [
    "categoryId",
    "confidence",
    "reason",
    "summary",
    "unsubscribeLink",
  ],
};
