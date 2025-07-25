import OpenAI from 'openai';
import { config } from 'dotenv';

config();

let openai;

/**
 * Initialize OpenAI client with API key
 * @param {string} apiKey - OpenAI API key
 */
export function initializeOpenAI(apiKey) {
  try {
    openai = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY
    });
  } catch (error) {
    console.warn(`⚠️ Failed to initialize OpenAI client: ${error.message}`);
  }
}

// Initialize on module load
try {
  initializeOpenAI();
} catch (error) {
  console.warn(`⚠️ Failed to initialize OpenAI client: ${error.message}`);
}

/**
 * Extract JSON from markdown code blocks
 * @param {string} markdownText - Text containing markdown code blocks
 * @returns {Object|null} Parsed JSON or null if invalid
 */
function extractJSONFromMarkdown(markdownText) {
  if (!markdownText) {
    if (global.verbose) {
      console.warn('⚠️ Empty response from LLM');
    }
    return null;
  }

  try {
    // First try to find JSON in code blocks
    const codeBlockMatches = markdownText.match(/```(?:json)?\s*\n([\s\S]*?)\n```/g);
    if (codeBlockMatches) {
      // Try each code block until we find valid JSON
      for (const block of codeBlockMatches) {
        try {
          const content = block.replace(/```(?:json)?\s*\n/, '').replace(/\n```$/, '').trim();
          return JSON.parse(content);
        } catch (e) {
          if (global.verbose) {
            console.warn(`⚠️ Failed to parse code block: ${e.message}`);
          }
          continue;
        }
      }
    }

    // If no valid JSON in code blocks, try to find JSON-like content
    const jsonPattern = /\{[\s\S]*\}/;
    const jsonMatch = markdownText.match(jsonPattern);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e) {
        if (global.verbose) {
          console.warn(`⚠️ Failed to parse JSON-like content: ${e.message}`);
        }
      }
    }

    // Last resort: try to parse the entire text
    return JSON.parse(markdownText.trim());
  } catch (error) {
    if (global.verbose) {
      console.warn(`⚠️ Failed to parse LLM response: ${error.message}`);
      console.warn('Response text:', markdownText);
    }
    return null;
  }
}

/**
 * Validate enrichment data structure
 * @param {Object} data - The enrichment data to validate
 * @param {string} type - The type of enrichment ('component' or 'token')
 * @returns {Object} Validated and sanitized data
 */
function validateEnrichmentData(data, type) {
  if (!data || typeof data !== 'object') {
    throw new Error(`Invalid enrichment data: expected object, got ${typeof data}`);
  }

  const requiredFields = {
    component: ['description', 'category', 'status'],
    token: ['description', 'category', 'status', 'usage']
  }[type];

  const missingFields = requiredFields.filter(field => !(field in data));
  if (missingFields.length > 0) {
    throw new Error(`Missing required fields in enrichment data: ${missingFields.join(', ')}`);
  }

  // Sanitize and validate field types
  const sanitized = { ...data };
  
  // Ensure string fields are strings
  ['description', 'category', 'status'].forEach(field => {
    if (field in sanitized) {
      sanitized[field] = String(sanitized[field]);
    }
  });

  // Ensure array fields are arrays
  ['usage', 'bestPractices', 'examples', 'alternatives'].forEach(field => {
    if (field in sanitized && !Array.isArray(sanitized[field])) {
      sanitized[field] = [sanitized[field]];
    }
  });

  return sanitized;
}

/**
 * Enrich a component with LLM-generated metadata
 * @param {Object} component - The component to enrich
 * @returns {Object} Enriched component
 */
export async function enrichComponent(component) {
  if (!openai) {
    if (global.verbose) {
      console.warn(`⚠️ Skipping LLM enrichment for ${component?.name} - No API key available`);
    }
    return component;
  }

  try {
    const prompt = `Analyze this React component and provide metadata in JSON format:
Component name: ${component.name}
Props: ${JSON.stringify(component.props || {}, null, 2)}
Description: ${component.description || 'No description available'}

Please return a JSON object with the following fields:
- description: A clear, concise description of the component's purpose
- category: The component's category (e.g., 'Input', 'Layout', 'Navigation')
- status: Component status ('stable', 'beta', 'deprecated')
- accessibility: WCAG compliance notes
- bestPractices: Array of usage best practices
- examples: Array of example use cases

Return ONLY the JSON object, wrapped in a code block.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 500
    });

    const enrichment = extractJSONFromMarkdown(completion.choices[0].message.content);
    if (!enrichment) {
      throw new Error('Failed to parse LLM response');
    }

    const validatedEnrichment = validateEnrichmentData(enrichment, 'component');

    return {
      ...component,
      ...validatedEnrichment,
      metadata: {
        ...component.metadata,
        llmEnriched: true,
        enrichedAt: new Date().toISOString()
      }
    };
  } catch (error) {
    if (global.verbose) {
      console.warn(`⚠️ LLM enrichment failed for component ${component?.name}:`, error.message);
    }
    return component;
  }
}

/**
 * Enrich a design token with LLM-generated metadata
 * @param {Object} token - The token to enrich
 * @returns {Object} Enriched token
 */
export async function enrichToken(token) {
  if (!openai) {
    if (global.verbose) {
      console.warn(`⚠️ Skipping LLM enrichment for token - No API key available`);
    }
    return token;
  }

  try {
    const prompt = `Analyze this design token and provide metadata in JSON format:
Token: ${JSON.stringify(token, null, 2)}

Please return a JSON object with the following fields:
- description: A clear description of the token's purpose and usage
- category: The token's category (e.g., 'color', 'spacing', 'typography')
- status: Token status ('active', 'deprecated')
- usage: Array of recommended usage contexts
- alternatives: Array of alternative tokens that could be used

Return ONLY the JSON object, wrapped in a code block.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 300
    });

    const enrichment = extractJSONFromMarkdown(completion.choices[0].message.content);
    if (!enrichment) {
      throw new Error('Failed to parse LLM response');
    }

    const validatedEnrichment = validateEnrichmentData(enrichment, 'token');

    return {
      ...token,
      metadata: {
        ...token.metadata,
        ...validatedEnrichment,
        llmEnriched: true,
        enrichedAt: new Date().toISOString()
      }
    };
  } catch (error) {
    if (global.verbose) {
      console.warn(`⚠️ LLM enrichment failed for token:`, error.message);
    }
    return token;
  }
}