import { Router, Request, Response } from 'express';
import { validateSession } from '../middleware/oauth';
import { enhanceContent } from '../services/ai-enhancement';

const router = Router();

interface FormatRequest {
  text: string;
  options?: {
    targetFormat?: 'blog' | 'page';
    seoKeywords?: string[];
    targetLanguage?: string;
    merchantOpenAIKey?: string;
  };
}

/**
 * @route   POST /api/format
 * @desc    Format text using AI enhancement
 * @access  Private
 */
router.post('/', validateSession, async (req: Request, res: Response) => {
  try {
    const { text, options } = req.body as FormatRequest;
    
    if (!text) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TEXT',
          message: 'No text was provided for formatting'
        }
      });
    }
    
    // Get shop ID and plan from the request (added by oauth middleware)
    const shopId = req.shopify?.shop.shopDomain || 'unknown';
    const planTier = req.shopify?.shop.plan || 'basic';
    
    // Character limit check based on plan
    const charLimit = planTier === 'free' ? 2000 : 
                      planTier === 'basic' ? 10000 : 
                      planTier === 'pro' ? 20000 : 50000;
    
    if (text.length > charLimit) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'TEXT_TOO_LONG',
          message: `Text exceeds the ${charLimit} character limit for your plan`,
          suggestion: `Please reduce the text length or upgrade your plan`
        }
      });
    }
    
    // Call the AI enhancement service
    const result = await enhanceContent(text, shopId, planTier, options);
    
    // Return the enhanced content
    return res.status(200).json({
      success: true,
      content: {
        title: result.title,
        bodyHtml: result.bodyHtml,
        tags: result.tags,
        seoDescription: result.seoDescription
      },
      usage: {
        model: result.model,
        tokensUsed: result.tokensUsed,
        estimatedCost: calculateCost(result.model, result.tokensUsed)
      }
    });
    
  } catch (error: any) {
    console.error('Format error:', error);
    
    // Determine the appropriate error code
    let errorCode = 'AI_ENHANCEMENT_FAILED';
    let statusCode = 500;
    let message = 'Failed to enhance content';
    
    if (error.message?.includes('API key')) {
      errorCode = 'INVALID_API_KEY';
      statusCode = 401;
      message = 'Invalid OpenAI API key';
    } else if (error.message?.includes('rate limit')) {
      errorCode = 'RATE_LIMIT_EXCEEDED';
      statusCode = 429;
      message = 'OpenAI rate limit exceeded';
    }
    
    return res.status(statusCode).json({
      success: false,
      error: {
        code: errorCode,
        message,
        original: error.message
      }
    });
  }
});

/**
 * Calculate estimated cost based on model and tokens used
 */
function calculateCost(model: string, tokens: number): number {
  // Pricing per 1000 tokens (approximated)
  const pricing: Record<string, { input: number; output: number }> = {
    'gpt-4o': { input: 0.01, output: 0.03 },
    'gpt-4-turbo': { input: 0.01, output: 0.03 },
    'gpt-4': { input: 0.03, output: 0.06 },
    'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
    'gpt-3.5-turbo-instruct': { input: 0.0015, output: 0.002 }
  };
  
  // Default to gpt-3.5-turbo pricing if model not found
  const { input, output } = pricing[model] || pricing['gpt-3.5-turbo'];
  
  // Rough estimate: assume 30% input tokens, 70% output tokens
  const inputTokens = tokens * 0.3;
  const outputTokens = tokens * 0.7;
  
  // Calculate cost
  return (inputTokens / 1000 * input) + (outputTokens / 1000 * output);
}

export default router;