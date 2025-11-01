import { Type } from '@google/genai';

/*
Return your response as valid JSON with this structure:
{
  "categoryId": "the category ID that best matches, or null if no good match",
  "confidence": 0.0-1.0,
  "reason": "brief explanation of why this category was chosen"
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
  },
  propertyOrdering: [
    "categoryId",
    "confidence", 
    "reason",
  ],
};
