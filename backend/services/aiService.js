const axios = require('axios');

class AIService {
  constructor() {
    this.groqApiKey = process.env.GROQ_API_KEY;
    this.apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
    this.availableModels = [
      'llama-3.1-8b-instant',  // Fast, efficient model
      'llama-3.1-70b-versatile', // More capable model
      'mixtral-8x7b-32768'    // Larger context window
    ];
  }

  async generateHint(context) {
    // If no Groq API key, use fallback immediately
    if (!this.groqApiKey || this.groqApiKey === 'your_groq_api_key_here') {
      console.log('No Groq API key configured, using fallback hints');
      return this.getFallbackHint(context.difficulty, context.hintLevel);
    }

    try {
      const systemPrompt = this.buildSystemPrompt();
      const userPrompt = this.buildUserPrompt(context);

      console.log('Calling Groq API with model: llama-3.1-8b-instant');
      
      const requestBody = {
        model: "llama-3.1-8b-instant",  // Updated model name
        messages: [
          { 
            role: "system", 
            content: systemPrompt 
          },
          { 
            role: "user", 
            content: userPrompt 
          }
        ],
        max_tokens: 100,
        temperature: 0.7,
        top_p: 0.9,
        stream: false
      };

      console.log('Groq API Request:', JSON.stringify({
        model: requestBody.model,
        message_count: requestBody.messages.length,
        max_tokens: requestBody.max_tokens
      }));

      const response = await axios.post(this.apiUrl, requestBody, {
        headers: {
          'Authorization': `Bearer ${this.groqApiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'LeetCode-AI-Hint-Backend/1.0'
        },
        timeout: 30000
      });

      console.log('Groq API Response status:', response.status);
      
      if (!response.data.choices || !response.data.choices[0]) {
        throw new Error('Invalid response format from Groq API');
      }

      let hint = response.data.choices[0].message.content.trim();
      
      // Clean up the hint
      hint = hint.replace(/^(Hint|Suggestion|Tip|Answer):?\s*/i, '').trim();
      
      // Remove any quotation marks if present
      hint = hint.replace(/^["']|["']$/g, '');
      
      console.log('Groq hint generated successfully:', hint.substring(0, 100) + '...');
      return hint;

    } catch (error) {
      console.error('Groq API error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      
      // More specific error handling
      if (error.response?.status === 400) {
        console.error('Bad Request - check model name and request format');
      } else if (error.response?.status === 401) {
        console.error('Unauthorized - check GROQ_API_KEY');
      } else if (error.response?.status === 429) {
        console.error('Rate limit exceeded');
      }
      
      return this.getFallbackHint(context.difficulty, context.hintLevel);
    }
  }

  buildSystemPrompt() {
    return `You are an expert computer science mentor helping students solve LeetCode problems.

CRITICAL RULES:
1. NEVER provide complete solutions or full code
2. Provide ONLY one short hint (1-2 sentences maximum)  
3. Focus on guiding thinking, not giving answers
4. Be specific to the problem and user's current code level
5. Do not use markdown formatting
6. Do not prefix with "Hint:" or any labels

Hint Levels:
- Level 1: Conceptual approach (what strategy to consider)
- Level 2: More specific guidance (key data structures/algorithms)
- Level 3: Implementation detail (specific considerations)

Respond with ONLY the hint text, nothing else.`;
  }

  buildUserPrompt(context) {
    const { problemTitle, problemDescription, difficulty, tags, userCode, hintLevel, language } = context;

    // Clean and truncate the problem description
    const cleanDescription = problemDescription
      .replace(/[^\w\s.,!?\-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 1000);

    // Clean user code
    const cleanUserCode = (userCode || '// No code written yet')
      .substring(0, 500);

    return `
Problem: ${problemTitle}
Difficulty: ${difficulty}
Tags: ${tags?.join(', ') || 'Not specified'}
Programming Language: ${language}
Hint Level Needed: ${hintLevel}

Problem Description:
${cleanDescription}

Student's Current Code:
${cleanUserCode}

Based on the student's current code and this being hint level ${hintLevel}, provide a brief, helpful hint that guides them toward the solution without giving it away.`;
  }

  getFallbackHint(difficulty, hintLevel) {
    const hints = {
      easy: {
        1: "Try using a dictionary to store numbers you've seen and their indices.",
        2: "For each number, check if its complement (target - number) exists in your dictionary.",
        3: "Remember to return the indices immediately when you find a match."
      },
      medium: {
        1: "Consider using backtracking or DFS to generate all possible combinations.",
        2: "Think about how to map digits to their corresponding letters and build combinations recursively.",
        3: "Handle edge cases like empty input and make sure to backtrack properly."
      },
      hard: {
        1: "Break the problem into smaller subproblems that are easier to solve.",
        2: "Consider using dynamic programming to store solutions to subproblems.",
        3: "Think about the base cases and build up the solution incrementally."
      }
    };

    const level = Math.min(hintLevel, 3);
    const diff = difficulty?.toLowerCase() in hints ? difficulty.toLowerCase() : 'medium';
    
    return hints[diff][level] || "Think about the problem constraints and what data structures might help.";
  }
}

module.exports = new AIService();