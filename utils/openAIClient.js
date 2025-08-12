// utils/openAIClient.js - Enhanced with circuit breaker and monitoring
import dotenv from 'dotenv';
dotenv.config();

import OpenAI from 'openai';

// Circuit breaker state
const circuitBreaker = {
  failures: 0,
  nextAttempt: Date.now(),
  state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
  maxFailures: process.env.NODE_ENV === 'production' ? 5 : 3,
  timeout: 60000, // 1 minute
  halfOpenMaxCalls: 3,
  halfOpenCalls: 0
};

// Create OpenAI client with error handling
let _client = null;
try {
  const apiKey = process.env.OPENAI_API_KEY;
  console.log(`🔑 Initializing OpenAI client with API key: ${apiKey ? apiKey.substring(0, 8) + '...' : 'MISSING'}`);
  
  if (apiKey && apiKey !== 'demo' && apiKey.startsWith('sk-')) {
    _client = new OpenAI({ 
      apiKey: apiKey,
      timeout: 45000, // 45 second timeout
      maxRetries: 0, // We handle retries manually
    });
    console.log('✅ OpenAI client initialized successfully');
  } else {
    console.error('❌ Invalid or missing OpenAI API key. Expected format: sk-..., got:', apiKey || 'undefined');
    throw new Error('OpenAI client not configured - invalid or missing API key');
  }
} catch (initError) {
  console.error('❌ Failed to initialize OpenAI client:', initError.message);
}

// Circuit breaker wrapper
export const client = _client ? {
  chat: {
    completions: {
      create: async (options) => {
        // Check circuit breaker state
        if (circuitBreaker.state === 'OPEN') {
          if (Date.now() < circuitBreaker.nextAttempt) {
            throw new Error('Circuit breaker is OPEN - OpenAI API temporarily unavailable');
          } else {
            circuitBreaker.state = 'HALF_OPEN';
            circuitBreaker.halfOpenCalls = 0;
          }
        }
        
        try {
          const result = await _client.chat.completions.create(options);
          
          // Reset circuit breaker on success
          if (circuitBreaker.state === 'HALF_OPEN') {
            circuitBreaker.halfOpenCalls++;
            if (circuitBreaker.halfOpenCalls >= circuitBreaker.halfOpenMaxCalls) {
              circuitBreaker.state = 'CLOSED';
              circuitBreaker.failures = 0;
            }
          } else if (circuitBreaker.state === 'CLOSED') {
            circuitBreaker.failures = Math.max(0, circuitBreaker.failures - 1);
          }
          
          return result;
        } catch (error) {
          // Record failure
          circuitBreaker.failures++;
          
          // Open circuit breaker if too many failures
          if (circuitBreaker.failures >= circuitBreaker.maxFailures) {
            circuitBreaker.state = 'OPEN';
            circuitBreaker.nextAttempt = Date.now() + circuitBreaker.timeout;
            console.warn(`Circuit breaker OPENED after ${circuitBreaker.failures} failures`);
          } else if (circuitBreaker.state === 'HALF_OPEN') {
            circuitBreaker.state = 'OPEN';
            circuitBreaker.nextAttempt = Date.now() + circuitBreaker.timeout;
          }
          
          throw error;
        }
      }
    }
  }
} : null;

export function estimateTokens(str) {
  if (!str) return 0;
  
  // More accurate token estimation for GPT models
  // Based on OpenAI's tokenization patterns
  
  // Remove extra whitespace and normalize
  const normalizedText = str.replace(/\s+/g, ' ').trim();
  
  // Count words (splits on whitespace and punctuation)
  const words = normalizedText.match(/\b\w+\b/g) || [];
  const punctuation = normalizedText.match(/[^\w\s]/g) || [];
  
  // Estimate tokens more accurately:
  // - Most English words are 1 token
  // - Longer words (>6 chars) might be 2+ tokens  
  // - Punctuation is usually 1 token each
  // - Ukrainian/Cyrillic text tends to use more tokens
  
  let tokenCount = 0;
  
  // Word tokens
  words.forEach(word => {
    if (word.length <= 4) {
      tokenCount += 1;
    } else if (word.length <= 8) {
      tokenCount += 1.5;
    } else {
      tokenCount += 2;
    }
  });
  
  // Punctuation tokens
  tokenCount += punctuation.length * 0.5;
  
  // Add buffer for system prompts and structure
  tokenCount += Math.ceil(normalizedText.length * 0.1);
  
  // Cyrillic text adjustment (Ukrainian uses more tokens)
  if (/[\u0400-\u04FF]/.test(normalizedText)) {
    tokenCount *= 1.3;
  }
  
  return Math.max(1, Math.ceil(tokenCount));
}

// Get circuit breaker status for monitoring
export function getCircuitBreakerStatus() {
  return {
    state: circuitBreaker.state,
    failures: circuitBreaker.failures,
    nextAttempt: circuitBreaker.nextAttempt,
    isOpen: circuitBreaker.state === 'OPEN',
    timeUntilRetry: circuitBreaker.state === 'OPEN' ? Math.max(0, circuitBreaker.nextAttempt - Date.now()) : 0
  };
}
