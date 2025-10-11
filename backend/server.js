const express = require('express');
const cors = require('cors');
require('dotenv').config();

const leetcodeService = require('./services/leetcodeService');
const aiService = require('./services/aiService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Enhanced logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('Body:', JSON.stringify(req.body).substring(0, 500));
  next();
});

// Simple rate limiting (remove complex limiter for now)
let requestCount = {};
setInterval(() => {
  requestCount = {};
}, 60000);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    groq_key: process.env.GROQ_API_KEY ? 'Set' : 'Missing'
  });
});

// Test endpoint without LeetCode API
app.post('/api/test-hint', async (req, res) => {
  try {
    const { problem_slug, user_code, hint_level } = req.body;

    console.log('Test hint request:', { problem_slug, hint_level });

    // Generate a simple test hint without external APIs
    const testHints = [
      "Try using a hash map to store values you've seen before.",
      "Consider sorting the array first to make the problem easier.",
      "Think about using two pointers to traverse the data."
    ];

    const hint = testHints[hint_level - 1] || testHints[0];

    res.json({ 
      hint,
      type: 'TEST_HINT',
      problem: problem_slug || 'test-problem'
    });

  } catch (error) {
    console.error('Error in test endpoint:', error);
    res.status(500).json({ 
      error: 'Test failed',
      message: error.message 
    });
  }
});

// Main hint generation endpoint
app.post('/api/get-hint', async (req, res) => {
  try {
    const { problem_slug, user_code, hint_level, language } = req.body;

    console.log('Hint request received:', {
      problem_slug,
      hint_level,
      language,
      code_length: user_code?.length
    });

    // Validate input
    if (!problem_slug) {
      return res.status(400).json({ 
        error: 'Problem slug is required',
        received: problem_slug
      });
    }

    // Get problem details from LeetCode
    console.log('Fetching problem details from LeetCode...');
    const problemDetails = await leetcodeService.getProblemDetails(problem_slug);
    
    if (!problemDetails) {
      console.log('LeetCode API failed, using fallback problem data');
      // Use fallback problem data
      const fallbackProblem = {
        title: problem_slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
        content: `Solve the problem: ${problem_slug}`,
        difficulty: 'Medium',
        topicTags: ['Array', 'Hash Table']
      };
      
      // Generate AI hint with fallback data
      const hint = await aiService.generateHint({
        problemTitle: fallbackProblem.title,
        problemDescription: fallbackProblem.content,
        difficulty: fallbackProblem.difficulty,
        tags: fallbackProblem.topicTags,
        userCode: user_code || '// No code written yet',
        hintLevel: hint_level || 1,
        language: language || 'python'
      });

      return res.json({ 
        hint,
        problem: fallbackProblem.title,
        difficulty: fallbackProblem.difficulty,
        hintLevel: hint_level,
        source: 'FALLBACK'
      });
    }

    console.log('Problem details fetched successfully:', problemDetails.title);

    // Generate AI hint
    const hint = await aiService.generateHint({
      problemTitle: problemDetails.title,
      problemDescription: problemDetails.content,
      difficulty: problemDetails.difficulty,
      tags: problemDetails.topicTags,
      userCode: user_code || '// No code written yet',
      hintLevel: hint_level || 1,
      language: language || 'python'
    });

    console.log('Hint generated successfully');

    res.json({ 
      hint,
      problem: problemDetails.title,
      difficulty: problemDetails.difficulty,
      hintLevel: hint_level,
      source: 'GROQ_AI'
    });

  } catch (error) {
    console.error('Error in /api/get-hint:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: error.message 
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    available_endpoints: ['/api/health', '/api/get-hint', '/api/test-hint']
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔍 Test endpoint: http://localhost:${PORT}/api/test-hint`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});