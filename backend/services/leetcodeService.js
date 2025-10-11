const axios = require('axios');

class LeetCodeService {
  constructor() {
    this.graphQLUrl = 'https://leetcode.com/graphql';
  }

  async getProblemDetails(titleSlug) {
    try {
      console.log(`Fetching LeetCode problem: ${titleSlug}`);
      
      const query = `
        query getQuestionDetail($titleSlug: String!) {
          question(titleSlug: $titleSlug) {
            title
            content
            difficulty
            topicTags {
              name
            }
            codeSnippets {
              lang
              langSlug
              code
            }
          }
        }
      `;

      const variables = { titleSlug };

      const response = await axios.post(this.graphQLUrl, {
        query,
        variables
      }, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
          'Origin': 'https://leetcode.com',
          'Referer': `https://leetcode.com/problems/${titleSlug}/`
        },
        timeout: 10000
      });

      console.log('LeetCode API response status:', response.status);

      if (response.data.errors) {
        console.error('GraphQL errors:', response.data.errors);
        return null;
      }

      const question = response.data.data.question;
      
      if (!question) {
        console.log('No question data found in response');
        return null;
      }

      console.log(`Successfully fetched: ${question.title}`);

      return {
        title: question.title,
        content: this.cleanHtmlContent(question.content),
        difficulty: question.difficulty,
        topicTags: question.topicTags.map(tag => tag.name),
        codeSnippets: question.codeSnippets
      };

    } catch (error) {
      console.error('Error fetching from LeetCode:', {
        message: error.message,
        code: error.code,
        response: error.response?.status
      });
      return null;
    }
  }

  cleanHtmlContent(html) {
    if (!html) return '';
    
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .trim()
      .substring(0, 1500);
  }
}

module.exports = new LeetCodeService();