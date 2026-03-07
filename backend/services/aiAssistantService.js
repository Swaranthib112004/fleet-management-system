const axios = require('axios');
const logger = require('../utils/logger');
const Vehicle = require('../models/vehicleModel');
const Driver = require('../models/driverModel');
const Route = require('../models/routeModel');
const Trip = require('../models/tripModel');

class AIAssistantService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.model = process.env.GEMINI_MODEL || 'gemini-1.5-flash-latest';
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    this.conversationHistory = new Map(); // Store per-user conversation history
  }

  /**
   * Process user message and generate response with recommendations
   * @param {String} userId - User ID for conversation context
   * @param {String} message - User message
   * @param {Object} context - Additional context (user role, fleet data)
   * @returns {Promise<Object>} Response with message and recommendations
   */
  async processMessage(userId, message, context = {}) {
    try {
      logger.info('Processing AI assistant message', { userId, messageLength: message.length });

      // Get or create conversation history for user
      if (!this.conversationHistory.has(userId)) {
        this.conversationHistory.set(userId, []);
      }

      const history = this.conversationHistory.get(userId);

      // Collect fleet context for better responses
      const fleetContext = await this.getFleetContext(context);

      // Build messages for Gemini
      const systemPrompt = this.buildSystemPrompt(fleetContext, context.userRole);

      // Gemini expects a single prompt or a specific history format. 
      // We'll combine system prompt and history into a structured prompt.
      const prompt = `System Instructions: ${systemPrompt}\n\nConversation History:\n${history.map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`).join('\n')}\n\nUser: ${message}\n\nAssistant:`;

      // Get response from Gemini
      const response = await this.callGemini(prompt);
      const assistantMessage = response.content;

      // Update conversation history
      history.push({ role: 'user', content: message });
      history.push({ role: 'assistant', content: assistantMessage });

      // Keep only last 10 messages for context efficiency
      if (history.length > 20) {
        this.conversationHistory.set(userId, history.slice(-20));
      }

      // Extract recommendations from response
      const recommendations = await this.extractRecommendations(assistantMessage, fleetContext);

      logger.info('AI assistant message processed', { userId, recommendations: recommendations.length });

      return {
        success: true,
        message: assistantMessage,
        recommendations,
        timestamp: new Date(),
        isQuery: this.isDataQuery(message),
        isRecommendation: recommendations.length > 0
      };
    } catch (error) {
      logger.error('AI assistant error', { error: error.message, userId });
      throw new Error(`Assistant response failed: ${error.message}`);
    }
  }

  /**
   * Process specific data queries (SQL-like natural language queries)
   * @param {String} query - Natural language query
   * @param {Object} context - Fleet context
   * @returns {Promise<Object>} Query result with data and explanation
   */
  async processQuery(query, context = {}) {
    try {
      logger.info('Processing data query', { queryLength: query.length });

      const fleetData = await this.getFleetContext(context);
      const queryPrompt = this.buildQueryPrompt(query, fleetData);

      const response = await this.callGemini(`
You are a fleet data analyst. Answer questions about the fleet data provided.
Be concise and provide specific numbers. Format responses clearly.

Data Context:
${queryPrompt}`);

      // Try to extract structured data from response
      const result = {
        success: true,
        query,
        answer: response.content,
        dataUsed: this.summarizeDataUsed(fleetData),
        timestamp: new Date()
      };

      logger.info('Query processed successfully', { query: query.substring(0, 50) });
      return result;
    } catch (error) {
      logger.error('Query processing error', { error: error.message });
      throw error;
    }
  }

  /**
   * Get smart recommendations based on fleet data
   * @param {Object} context - Fleet context
   * @returns {Promise<Array>} Array of recommendations
   */
  async getRecommendations(context = {}) {
    try {
      const fleetData = await this.getFleetContext(context);

      const prompt = `Based on this fleet data, provide 3-5 specific, actionable recommendations:
${this.formatFleetDataForPrompt(fleetData)}

Format as:
1. [RECOMMENDATION_TYPE]: Specific recommendation with expected benefit
2. ...

Types: COST_SAVING, SAFETY, EFFICIENCY, MAINTENANCE, PERFORMANCE`;

      const response = await this.callGemini(`
You are a fleet management consultant. Provide specific, actionable recommendations with quantified benefits based on this data:

${prompt}`);

      const recommendations = this.parseRecommendations(response.content);

      logger.info('Generated recommendations', { count: recommendations.length });
      return recommendations;
    } catch (error) {
      logger.error('Recommendation generation error', { error: error.message });
      return [];
    }
  }

  /**
   * Collect real fleet data for context
   * @param {Object} context - Context options
   * @returns {Promise<Object>} Fleet data summary
   */
  async getFleetContext(context = {}) {
    try {
      const [vehicles, drivers, routes, trips] = await Promise.all([
        Vehicle.find().lean().limit(100),
        Driver.find().lean().limit(100),
        Route.find().lean().limit(50),
        Trip.find().sort({ createdAt: -1 }).lean().limit(50)
      ]);

      return {
        vehicleCount: vehicles.length,
        vehicles: vehicles.map(v => ({
          id: v._id,
          registration: v.registration,
          make: v.make,
          model: v.model,
          status: v.status,
          fuelType: v.fuelType,
          mileage: v.odometer
        })),
        driverCount: drivers.length,
        drivers: drivers.map(d => ({
          id: d._id,
          name: d.name,
          licenseStatus: d.licenseStatus,
          yearsExperience: d.yearsExperience,
          safetyRating: d.safetyRating || 0
        })),
        routeCount: routes.length,
        activeRoutes: routes.filter(r => r.status === 'active').length,
        tripCount: trips.length,
        recentTrips: trips.slice(0, 10).map(t => ({
          id: t._id,
          status: t.status,
          distance: t.distance,
          duration: t.duration,
          fuelUsed: t.fuelUsed
        }))
      };
    } catch (error) {
      logger.warn('Error collecting fleet context', { error: error.message });
      return {};
    }
  }

  /**
   * Build system prompt for general conversation
   * @param {Object} fleetData - Fleet context data
   * @param {String} userRole - User role
   * @returns {String} System prompt
   */
  buildSystemPrompt(fleetData, userRole = 'manager') {
    return `You are a helpful Fleet Management AI Assistant for "FleetPro" system.

Current Fleet Data:
- Total Vehicles: ${fleetData.vehicleCount || 0}
- Total Drivers: ${fleetData.driverCount || 0}
- Active Routes: ${fleetData.activeRoutes || 0}
- Total Trips: ${fleetData.tripCount || 0}

You help users with:
1. Fleet management questions and guidance
2. Data queries (asking about vehicles, drivers, routes, trips)
3. Performance recommendations
4. Troubleshooting and help
5. Best practices for fleet operations

Guidelines:
- Be concise and practical
- Provide specific numbers when available
- Suggest actionable improvements
- Recommend relevant actions in the app
- Use role-appropriate language for ${userRole} users
- Default to helpful, friendly tone

When users ask data questions, provide specific insights from the fleet data.
When something isn't working, offer step-by-step solutions.
When possible, include expected benefits or cost savings.`;
  }

  /**
   * Build prompt for data queries
   * @param {String} query - User query
   * @param {Object} fleetData - Fleet data
   * @returns {String} Query prompt
   */
  buildQueryPrompt(query, fleetData) {
    return `Fleet Data Summary:
${this.formatFleetDataForPrompt(fleetData)}

User Question: "${query}"

Answer this question based on the fleet data above. Be specific with numbers and percentages.
If you can't answer from the data provided, say so clearly.`;
  }

  /**
   * Format fleet data for LLM prompt
   * @param {Object} fleetData - Fleet data
   * @returns {String} Formatted text
   */
  formatFleetDataForPrompt(fleetData) {
    let formatted = '';

    if (fleetData.vehicles?.length) {
      formatted += `VEHICLES (${fleetData.vehicleCount}):\n`;
      const statuses = {};
      fleetData.vehicles.forEach(v => {
        statuses[v.status] = (statuses[v.status] || 0) + 1;
      });
      Object.entries(statuses).forEach(([status, count]) => {
        formatted += `- ${status}: ${count} vehicles\n`;
      });
    }

    if (fleetData.drivers?.length) {
      formatted += `\nDRIVERS (${fleetData.driverCount}):\n`;
      const avgSafety = (fleetData.drivers.reduce((sum, d) => sum + (d.safetyRating || 0), 0) / fleetData.driverCount).toFixed(1);
      formatted += `- Average Safety Rating: ${avgSafety}/10\n`;
      formatted += `- Average Experience: ${(fleetData.drivers.reduce((sum, d) => sum + (d.yearsExperience || 0), 0) / fleetData.driverCount).toFixed(1)} years\n`;
    }

    if (fleetData.recentTrips?.length) {
      formatted += `\nRECENT TRIPS (Last 10):\n`;
      const totalDistance = fleetData.recentTrips.reduce((sum, t) => sum + (t.distance || 0), 0);
      const totalFuel = fleetData.recentTrips.reduce((sum, t) => sum + (t.fuelUsed || 0), 0);
      formatted += `- Total Distance: ${totalDistance}km\n`;
      formatted += `- Average Fuel Used: ${(totalFuel / fleetData.recentTrips.length).toFixed(2)}L\n`;
      formatted += `- Fuel Efficiency: ${((totalDistance / totalFuel) || 0).toFixed(2)} km/L\n`;
    }

    return formatted;
  }

  /**
   * Check if message is a data query
   * @param {String} message - User message
   * @returns {Boolean} Is query or conversation
   */
  isDataQuery(message) {
    const queryKeywords = ['show', 'how many', 'which', 'what', 'total', 'list', 'compare', 'average', 'highest', 'lowest', 'best', 'worst'];
    const lower = message.toLowerCase();
    return queryKeywords.some(keyword => lower.includes(keyword)) && message.includes('?');
  }

  /**
   * Extract recommendations from response
   * @param {String} response - Assistant response
   * @param {Object} fleetData - Fleet context
   * @returns {Promise<Array>} Recommendations
   */
  async extractRecommendations(response, fleetData) {
    const recommendations = [];

    // Look for recommendation patterns in response
    const patterns = [
      /(?:recommend|recommend|should|could|consider|suggest):\s*([^.,!?\n]+)/gi,
      /recommendation:?\s*([^.,!?\n]+)/gi
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(response)) !== null) {
        recommendations.push({
          text: match[1].trim(),
          type: 'suggestion',
          priority: 'medium'
        });
      }
    });

    return recommendations.slice(0, 3); // Return top 3
  }

  /**
   * Parse recommendations from formatted response
   * @param {String} response - Response content
   * @returns {Array} Parsed recommendations
   */
  parseRecommendations(response) {
    const recommendations = [];
    const lines = response.split('\n').filter(line => line.trim());

    lines.forEach(line => {
      if (line.match(/^\d+\./)) {
        const [type, ...rest] = line.replace(/^\d+\.\s*/, '').split(':');
        recommendations.push({
          type: type.trim().replace(/[\[\]]/g, ''),
          text: rest.join(':').trim(),
          priority: 'medium',
          timestamp: new Date()
        });
      }
    });

    return recommendations;
  }

  /**
   * Summarize what data was used
   * @param {Object} fleetData - Fleet data
   * @returns {Array} Data summary
   */
  summarizeDataUsed(fleetData) {
    const used = [];
    if (fleetData.vehicleCount) used.push(`${fleetData.vehicleCount} vehicles`);
    if (fleetData.driverCount) used.push(`${fleetData.driverCount} drivers`);
    if (fleetData.routeCount) used.push(`${fleetData.routeCount} routes`);
    if (fleetData.tripCount) used.push(`${fleetData.tripCount} trips`);
    return used;
  }

  /**
   * Call Gemini API with retry logic and fallback
   * @param {String} prompt - Prompt string
   * @returns {Promise<Object>} Response
   */
  async callGemini(prompt) {
    if (!this.apiKey || String(this.apiKey).trim() === '') {
      logger.info('No Gemini Key set, using mock AI assistant response.');
      return this._mockGeminiResponse(prompt);
    }
    const maxRetries = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await axios.post(
          `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`,
          {
            contents: [{
              parts: [{ text: prompt }]
            }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1000,
            }
          },
          {
            headers: {
              'Content-Type': 'application/json'
            },
            timeout: 40000
          }
        );

        const content = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!content) {
          throw new Error('Invalid Gemini API response structure');
        }

        return {
          content: content.trim(),
          tokens: 0 // Gemini usage info is in a different format, skipping for now
        };
      } catch (error) {
        lastError = error;
        logger.warn(`Gemini call attempt ${attempt} failed`, { error: error.message, details: error.response?.data });

        if (error.response?.status === 401 || error.response?.status === 403 || error.response?.status === 400) {
          logger.warn('Auth or Request error with Gemini API, falling back to mock response');
          return this._mockGeminiResponse(prompt);
        }

        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
        }
      }
    }

    logger.warn(`Gemini API call failed after ${maxRetries} attempts, falling back to mock response`, { error: lastError.message });
    return this._mockGeminiResponse(prompt);
  }

  /**
   * Mock response to gracefully handle missing / failed API key 
   */
  _mockGeminiResponse(prompt) {
    const isQuery = prompt.toLowerCase().includes('?') || prompt.toLowerCase().includes('show') || prompt.toLowerCase().includes('how many');
    let content = isQuery
      ? 'Based on the fleet data, your vehicles are operating normally with stable fuel consumption.'
      : 'Hello! I am your AI Fleet Assistant powered by Gemini. How can I help you today?';

    // Add mock recommendations if requested
    if (prompt.toLowerCase().includes('recommend')) {
      content += '\n\n1. COST_SAVING: Review idle times for fleet vehicles to reduce fuel waste.\n2. SAFETY: Schedule standard maintenance for older vehicles.\n3. EFFICIENCY: Opt for earlier dispatch times in heavy traffic zones.';
    }

    return {
      content,
      tokens: 0
    };
  }

  /**
   * Clear conversation history for user
   * @param {String} userId - User ID
   */
  clearHistory(userId) {
    this.conversationHistory.delete(userId);
    logger.info('Conversation history cleared', { userId });
  }
}

module.exports = new AIAssistantService();
