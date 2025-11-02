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


export const playwrightInstructionsSchema = {
  type: Type.OBJECT,
  properties: {
    instructions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          action: {
            type: Type.STRING,
            enum: ["fill", "check", "selectOption", "click"],
            description: "The Playwright action to perform"
          },
          locatorType: {
            type: Type.STRING,
            enum: ["label", "role"],
            description: "Type of locator to use (getByLabel or getByRole)"
          },
          locatorValue: {
            type: Type.STRING,
            description: "The actual label text or role name to locate the element"
          },
          value: {
            type: Type.STRING,
            nullable: true,
            description: "Value to fill or option to select (required for fill and selectOption actions)"
          },
          roleOptions: {
            type: Type.OBJECT,
            nullable: true,
            properties: {
              name: {
                type: Type.STRING,
                nullable: true,
                description: "Accessible name for role-based locators"
              }
            },
            description: "Additional options for getByRole locators"
          }
        },
        required: ["action", "locatorType", "locatorValue"]
      }
    }
  },
  required: ["instructions"]
};

export const unsubscribeResponseSchema = {
  type: Type.OBJECT,
  properties: {
    success: {
      type: Type.BOOLEAN,
      description: "Whether the unsubscribe action was successful"
    },
    reason: {
      type: Type.STRING,
      description: "Reason for the unsubscribe action's success or failure"
    },
  },
};
