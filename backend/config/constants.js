module.exports = {
  LEETCODE_GRAPHQL_URL: 'https://leetcode.com/graphql',
  GROQ_API_URL: 'https://api.groq.com/openai/v1/chat/completions',
  GROQ_MODELS: [
    'llama-3.1-8b-instant',
    'llama-3.1-70b-versatile',
    'mixtral-8x7b-32768'
  ],
  DEFAULT_GROQ_MODEL: 'llama-3.1-8b-instant',
  MAX_HINTS_PER_PROBLEM: 3,
  RATE_LIMIT: {
    points: 20,
    duration: 60
  },
  AI_CONFIG: {
    maxTokens: 100,
    temperature: 0.7
  },
  FALLBACK_HINTS: {
    ENABLED: true,
    CACHE_DURATION: 24 * 60 * 60 * 1000
  }
};