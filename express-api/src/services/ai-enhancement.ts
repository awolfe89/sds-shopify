import { Configuration, OpenAIApi, CreateChatCompletionRequest } from 'openai';
import { logger  } from '../utils/logger';
import config from '../config';

interface EnhancementOptions {
  targetFormat?: 'blog' | 'page';
  seoKeywords?: string[];
  targetLanguage?: string;
  maxTokens?: number;
  temperature?: number;
  merchantOpenAIKey?: string;
}

interface EnhancementResult {
  title: string;
  bodyHtml: string;
  tags: string[];
  seoDescription: string;
  model: string;
  tokensUsed: number;
}

/**
 * Generates system prompt based on target format and language
 */
function getSystemPrompt(
  format: 'blog' | 'page', 
  language: string,
  seoKeywords?: string[]
): string {
  const keywordString = seoKeywords?.length 
    ? `Optimize for these SEO keywords: ${seoKeywords.join(', ')}.` 
    : '';
  
  // Different prompts for blogs vs pages
  if (format === 'blog') {
    return `
You are an expert content formatter specializing in blog articles. 
Format the following raw text into a well-structured blog article in ${language}.

Your task is to:
1. Create an engaging, SEO-friendly title
2. Format the content with proper HTML (h1, h2, p, ul, etc.)
3. Suggest 5-8 relevant tags
4. Create a compelling meta description of 150-160 characters
${keywordString}

Ensure the HTML is properly formatted and semantic. Use headers logically.

Respond with JSON in this format:
{
  "title": "The engaging title",
  "bodyHtml": "The formatted HTML content",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "seoDescription": "A compelling meta description of 150-160 characters"
}
    `.trim();
  } else {
    return `
You are an expert content formatter specializing in web pages.
Format the following raw text into a well-structured page in ${language}.

Your task is to:
1. Create a clear, SEO-friendly title
2. Format the content with proper HTML (h1, h2, p, ul, etc.)
3. Suggest 3-5 relevant tags
4. Create a concise meta description of 150-160 characters
${keywordString}

Ensure the HTML is properly formatted, accessible, and semantic. Use headers logically.

Respond with JSON in this format:
{
  "title": "The clear title",
  "bodyHtml": "The formatted HTML content",
  "tags": ["tag1", "tag2", "tag3"],
  "seoDescription": "A concise meta description of 150-160 characters"
}
    `.trim();
  }
}

/**
 * Creates an OpenAI client using the appropriate API key
 */
function createOpenAIClient(merchantKey?: string): OpenAIApi {
  // Try using merchant key first, fall back to managed key
  const apiKey = merchantKey || config.openai.apiKey;
  
  if (!apiKey) {
    throw new Error('No OpenAI API key available');
  }
  
  const configuration = new Configuration({ apiKey });
  return new OpenAIApi(configuration);
}

/**
 * Get appropriate model based on plan tier and availability
 */
function getModel(planTier: string, merchantKey?: string): string {
  // If using merchant key, they can use any model they have access to
  if (merchantKey) {
    return 'gpt-4o'; // Default to GPT-4o
  }
  
  // For managed keys, use model based on plan tier
  switch (planTier) {
    case 'enterprise':
    case 'pro':
      return 'gpt-4o';
    case 'basic':
    default:
      return 'gpt-3.5-turbo';
  }
}

/**
 * Fallback to a different model if the primary model is unavailable
 */
function getFallbackModel(model: string): string | null {
  const fallbacks: Record<string, string> = {
    'gpt-4o': 'gpt-4-turbo',
    'gpt-4-turbo': 'gpt-4',
    'gpt-4': 'gpt-3.5-turbo',
    'gpt-3.5-turbo': 'gpt-3.5-turbo-instruct'
  };
  
  return fallbacks[model] || null;
}

/**
 * Enhances document text using OpenAI API
 */
export async function enhanceContent(
  rawText: string, 
  shopId: string,
  planTier: string = 'basic',
  options: EnhancementOptions = {}
): Promise<EnhancementResult> {
  // Configure OpenAI client
  const openai = createOpenAIClient(options.merchantOpenAIKey);
  
  // Set default options
  const format = options.targetFormat || 'blog';
  const language = options.targetLanguage || 'en-US';
  const maxTokens = options.maxTokens || 2048;
  const temperature = options.temperature || 0.7;
  
  // Choose model based on plan tier
  let model = getModel(planTier, options.merchantOpenAIKey);
  let usesFallback = false;

  // Get system prompt
  const systemMessage = getSystemPrompt(format, language, options.seoKeywords);
  
  // Truncate input text if it's too long (to avoid token limit issues)
  const truncatedText = rawText.length > 15000 ? 
    rawText.substring(0, 15000) + "\n\n[Content truncated due to length...]" : 
    rawText;

  try {
    // Try with primary model
    return await makeEnhancementRequest(
      openai, 
      model, 
      systemMessage, 
      truncatedText, 
      maxTokens, 
      temperature
    );
  } catch (error: any) {
    // Handle model overloaded or unavailable errors
    if (
      error.message?.includes('overloaded') || 
      error.message?.includes('unavailable') ||
      error.message?.includes('currently processing')
    ) {
      logger.warn(`Model ${model} unavailable, attempting fallback`);
      
      const fallbackModel = getFallbackModel(model);
      if (!fallbackModel) {
        throw error; // No fallback available
      }
      
      // Try with fallback model
      usesFallback = true;
      model = fallbackModel;
      return await makeEnhancementRequest(
        openai, 
        fallbackModel, 
        systemMessage, 
        truncatedText, 
        maxTokens, 
        temperature
      );
    }
    
    // For other errors, just rethrow
    throw error;
  }
}

/**
 * Makes an actual request to OpenAI API
 */
async function makeEnhancementRequest(
  openai: OpenAIApi,
  model: string,
  systemMessage: string,
  content: string,
  maxTokens: number,
  temperature: number
): Promise<EnhancementResult> {
  const startTime = Date.now();
  
  // Create request payload - handle version differences
  const requestPayload: CreateChatCompletionRequest = {
    model,
    messages: [
      { role: 'system', content: systemMessage },
      { role: 'user', content }
    ],
    max_tokens: maxTokens,
    temperature,
    n: 1,
    frequency_penalty: 0.5,
    presence_penalty: 0.5,
    // Use type assertion if response_format is not in the types
    // This is for OpenAI API v3.3.0+
  };
  
  // For newer OpenAI API versions that support response_format
  // Add this property only for API versions that support it
  try {
    // @ts-ignore - Add response_format for newer versions of the API
    requestPayload.response_format = { type: 'json_object' };
  } catch (error) {
    // If this property causes an error, we'll just continue without it
    console.warn('response_format not supported in this OpenAI API version');
  }
  
  const response = await openai.createChatCompletion(requestPayload);
  
  const duration = Date.now() - startTime;
  
  logger.info(`OpenAI API call completed in ${duration}ms`, {
    model,
    contentLength: content.length,
    tokensUsed: response.data.usage?.total_tokens || 0
  });

  try {
    // Parse the response as JSON
    const completion = response.data.choices[0]?.message?.content || '{}';
    const enhancedContent = JSON.parse(completion) as Partial<EnhancementResult>;
    
    // Ensure all required fields are present
    if (!enhancedContent.title || !enhancedContent.bodyHtml) {
      throw new Error('API response missing required fields');
    }
    
    return {
      title: enhancedContent.title,
      bodyHtml: enhancedContent.bodyHtml,
      tags: enhancedContent.tags || [],
      seoDescription: enhancedContent.seoDescription || '',
      model,
      tokensUsed: response.data.usage?.total_tokens || 0
    };
  } catch (error) {
    logger.error('Failed to parse OpenAI response', error);
    throw new Error('Failed to process AI enhancement response');
  }
}