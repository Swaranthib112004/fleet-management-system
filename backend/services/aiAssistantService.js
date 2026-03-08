const axios = require('axios');
const logger = require('../utils/logger');
const Vehicle = require('../models/vehicleModel');
const Driver = require('../models/driverModel');
const Route = require('../models/routeModel');
const Trip = require('../models/tripModel');

class AIAssistantService {
  constructor() {
    // Check for Gemini API key first, fallback to OpenAI if not present
    this.aiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
    this.aiModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
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

      // Build messages for GPT-4
      const systemPrompt = this.buildSystemPrompt(fleetContext, context.userRole);
      const messages = [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: message }
      ];

      // Get response from AI
      const response = await this.callAI(messages);
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

      const response = await this.callAI([
        {
          role: 'system',
          content: `You are a fleet data analyst. Answer questions about the fleet data provided.
Be concise and provide specific numbers. Format responses clearly.`
        },
        {
          role: 'user',
          content: queryPrompt
        }
      ]);

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

      const response = await this.callAI([
        {
          role: 'system',
          content: 'You are a fleet management consultant. Provide specific, actionable recommendations with quantified benefits.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]);

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
          status: v.status || (v.mileage > 0 ? 'Active' : 'Idle'),
          fuelType: v.fuel || 'Diesel',
          mileage: v.mileage || 0,
          driver: v.driver || 'Unassigned'
        })),
        driverCount: drivers.length,
        drivers: drivers.map(d => ({
          id: d._id,
          name: d.name,
          licenseNumber: d.licenseNumber || d.license || 'N/A',
          status: d.status || 'Active',
          vehicle: d.assignedVehicle || d.vehicle || 'None'
        })),
        routeCount: routes.length,
        activeRoutesCount: routes.filter(r => ['active', 'in-progress'].includes(r.status?.toLowerCase())).length,
        activeRoutes: routes.filter(r => ['active', 'in-progress'].includes(r.status?.toLowerCase())).map(r => ({
          id: r._id,
          code: r.routeCode,
          start: r.startLocation?.name,
          end: r.endLocation?.name,
          status: r.status
        })),
        tripCount: trips.length,
        recentTrips: trips.slice(0, 10).map(t => ({
          id: t._id,
          status: t.status,
          distance: t.distance || 0,
          duration: t.duration || 0,
          fuelUsed: t.fuelUsed || 0
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
    const detailSummary = this.formatFleetDataForPrompt(fleetData);

    return `You are a helpful Fleet Management AI Assistant for "FleetPro" system.
    
Current Fleet Status:
${detailSummary}

Fleet Overview Stats:
- Total Vehicles: ${fleetData.vehicleCount || 0}
- Total Drivers: ${fleetData.driverCount || 0}
- Active Routes: ${fleetData.activeRoutesCount || 0}
- Recent Trips Logged: ${fleetData.tripCount || 0}

You help users with:
1. Fleet management questions and guidance
2. Data queries (asking about vehicles, drivers, routes, trips)
3. Performance recommendations
4. Troubleshooting and help
5. Best practices for fleet operations

Guidelines:
- Be concise and practical. Use specific numbers and names from the provided data.
- If a user asks about moving vehicles, check the active routes and vehicle statuses.
- If a user asks for driver info, provide names, license numbers, and assigned vehicles.
- Suggest actionable improvements based on the real data provided.
- Default to a helpful, professional tone.

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
      fleetData.vehicles.slice(0, 15).forEach(v => {
        formatted += `- ${v.registration} (${v.make} ${v.model}): Status ${v.status}, Driver: ${v.driver}\n`;
      });
      if (fleetData.vehicleCount > 15) formatted += `- ... and ${fleetData.vehicleCount - 15} more.\n`;
    }

    if (fleetData.drivers?.length) {
      formatted += `\nDRIVERS (${fleetData.driverCount}):\n`;
      fleetData.drivers.slice(0, 15).forEach(d => {
        formatted += `- ${d.name}: Status ${d.status}, Lic: ${d.licenseNumber}, Vehicle: ${d.vehicle}\n`;
      });
      if (fleetData.driverCount > 15) formatted += `- ... and ${fleetData.driverCount - 15} more.\n`;
    }

    if (fleetData.activeRoutes?.length) {
      formatted += `\nACTIVE ROUTES (${fleetData.activeRoutesCount}):\n`;
      fleetData.activeRoutes.forEach(r => {
        formatted += `- ${r.code}: ${r.start} to ${r.end} (${r.status})\n`;
      });
    }

    if (fleetData.recentTrips?.length) {
      formatted += `\nRECENT TRIP STATS:\n`;
      const totalDistance = fleetData.recentTrips.reduce((sum, t) => sum + (t.distance || 0), 0);
      const totalFuel = fleetData.recentTrips.reduce((sum, t) => sum + (t.fuelUsed || 0), 0);
      formatted += `- Total Distance (last 10): ${totalDistance.toFixed(1)}km\n`;
      if (totalFuel > 0) {
        formatted += `- Avg Efficiency: ${(totalDistance / totalFuel).toFixed(2)} km/L\n`;
      }
    }

    return formatted;
  }

  /**
   * Check if message is a data query
   * @param {String} message - User message
   * @returns {Boolean} Is query or conversation
   */
  isDataQuery(message) {
    const queryKeywords = ['show', 'how many', 'which', 'what', 'total', 'list', 'compare', 'average', 'highest', 'lowest', 'best', 'worst', 'current', 'who'];
    const lower = message.toLowerCase();
    // Also consider it a query if it contains vehicle/driver/route terms
    const fleetTerms = ['vehicle', 'driver', 'route', 'trip', 'moving', 'active'];
    const hasKeyword = queryKeywords.some(keyword => lower.includes(keyword));
    const hasTerm = fleetTerms.some(term => lower.includes(term));
    return (hasKeyword || hasTerm) && (message.includes('?') || lower.length < 50);
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
   * Call AI API (Gemini) with retry logic and fallback if it fails or API key is missing
   * @param {Array} messages - Messages array
   * @returns {Promise<Object>} Response
   */
  async callAI(messages) {
    if (!this.aiKey || String(this.aiKey).trim() === '') {
      logger.info('No AI Key set, using mock AI assistant response.');
      return this._mockAIResponse(messages);
    }
    const maxRetries = 3;
    let lastError = null;

    let systemInstruction = null;
    const contents = [];
    let currentRole = null;
    let currentParts = [];

    messages.forEach(msg => {
      if (msg.role === 'system') {
        systemInstruction = { parts: [{ text: msg.content }] };
      } else {
        const role = msg.role === 'assistant' ? 'model' : 'user';
        if (currentRole !== role) {
          if (currentRole !== null) {
            contents.push({ role: currentRole, parts: currentParts });
          }
          currentRole = role;
          currentParts = [{ text: msg.content }];
        } else {
          currentParts.push({ text: '\n\n' + msg.content });
        }
      }
    });

    if (currentRole !== null) {
      contents.push({ role: currentRole, parts: currentParts });
    }

    const payload = {
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000
      }
    };
    if (systemInstruction) {
      payload.systemInstruction = systemInstruction;
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await axios.post(
          `${this.baseUrl}/models/${this.aiModel}:generateContent?key=${this.aiKey}`,
          payload,
          {
            headers: {
              'Content-Type': 'application/json'
            },
            timeout: 40000
          }
        );

        const contentText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!contentText) {
          throw new Error('Invalid API response structure');
        }

        return {
          content: contentText.trim(),
          tokens: 0
        };
      } catch (error) {
        lastError = error;
        logger.warn(`AI call attempt ${attempt} failed`, { error: error.message });

        if (error.response?.status === 401 || error.response?.status === 403) {
          logger.warn('Authentication failed with AI API, falling back to mock response');
          return this._mockAIResponse(messages);
        }

        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
        }
      }
    }

    logger.warn(`AI API call failed after ${maxRetries} attempts, falling back to mock response`, { error: lastError?.message });
    return this._mockAIResponse(messages);
  }

  /**
   * Mock response to gracefully handle missing / failed API key 
   */
  _mockAIResponse(messages) {
    // Try to find the system prompt to extract current data
    const systemMsg = messages.find(m => m.role === 'system')?.content || '';
    const lastMessage = messages[messages.length - 1]?.content || '';
    const lowerMsg = lastMessage.toLowerCase();

    // extract counts from system message if possible
    const vMatch = systemMsg.match(/Total Vehicles: (\d+)/);
    const dMatch = systemMsg.match(/Total Drivers: (\d+)/);
    const rMatch = systemMsg.match(/Active Routes: (\d+)/);

    const vCount = vMatch ? vMatch[1] : '?';
    const dCount = dMatch ? dMatch[1] : '?';
    const rCount = rMatch ? rMatch[1] : '?';

    let content = `Hello! I'm your FleetPro Assistant. Currently, I see ${vCount} vehicles, ${dCount} drivers, and ${rCount} active routes in your system.`;

    if (lowerMsg.includes('vehicle') || lowerMsg.includes('moving')) {
      if (rCount === '0' || rCount === 0) {
        content = `There are currently no vehicles actively on a moving trip. Our records show ${vCount} vehicles in total, but none are assigned to an 'active' route right now.`;
      } else {
        content = `I see ${rCount} active route(s) in progress. You can check the real-time map to see the exact locations of your moving vehicles.`;
      }
    } else if (lowerMsg.includes('driver')) {
      content = `You have ${dCount} drivers registered in your fleet. You can see their full details and performance ratings in the Drivers section.`;
    }

    return {
      content: content + "\n\n(Note: I'm currently running in low-power mode but accessing your real-time stats.)",
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
