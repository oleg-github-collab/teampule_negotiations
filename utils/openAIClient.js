// utils/openAIClient.js - Enhanced with circuit breaker and monitoring
import OpenAI from 'openai';

// Circuit breaker state
const circuitBreaker = {
  failures: 0,
  nextAttempt: Date.now(),
  state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
  maxFailures: process.env.NODE_ENV === 'production' ? 5 : 3,
  timeout: 60000, // 1 minute
  halfOpenMaxCalls: 3
};

// Create OpenAI client with error handling
let _client = null;
try {
  if (process.env.OPENAI_API_KEY) {
    _client = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 45000, // 45 second timeout
      maxRetries: 0, // We handle retries manually
    });
  }
} catch (initError) {
  console.error('Failed to initialize OpenAI client:', initError.message);
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
  return Math.ceil(str.length / 4); // груба оцінка (≈4 символи/токен)
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
