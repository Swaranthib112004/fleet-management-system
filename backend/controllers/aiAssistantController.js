const aiAssistantService = require('../services/aiAssistantService');
const logger = require('../utils/logger');

// Minimal in-memory cooldown to avoid hammering Gemini (which triggers 429s).
// Keyed per-user; resets on server restart (good enough for dev/small deployments).
const CHAT_COOLDOWN_MS = parseInt(process.env.AI_CHAT_COOLDOWN_MS || '0', 10);
const lastChatAtByUser = new Map();

class AIAssistantController {
  /**
   * Send message to AI assistant
   */
  async sendMessage(req, res) {
    try {
      const { message } = req.body;
      const userId = req.user?.id || req.user?._id;
      const userRole = req.user?.role || 'manager';

      if (!message || message.trim().length === 0) {
        return res.status(400).json({ error: 'Message cannot be empty' });
      }

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Simple per-user cooldown to reduce Gemini 429s.
      const now = Date.now();
      const lastAt = lastChatAtByUser.get(String(userId)) || 0;
      const since = now - lastAt;
      if (since >= 0 && since < CHAT_COOLDOWN_MS) {
        const retryAfterMs = CHAT_COOLDOWN_MS - since;
        res.set('Retry-After', String(Math.max(1, Math.ceil(retryAfterMs / 1000))));
        return res.status(429).json({
          error: 'Too many requests',
          details: `Please wait ${Math.ceil(retryAfterMs / 1000)}s and try again.`
        });
      }
      lastChatAtByUser.set(String(userId), now);

      const response = await aiAssistantService.processMessage(userId, message, {
        userRole,
        userId
      });

      logger.info('Chat message sent', { userId, messageLength: message.length });

      return res.json({
        success: true,
        data: response
      });
    } catch (error) {
      logger.error('Error sending message', { error: error.message });
      return res.status(500).json({
        error: 'Failed to process message',
        details: error.message
      });
    }
  }

  /**
   * Process data query
   */
  async queryData(req, res) {
    try {
      const { query } = req.body;
      const userId = req.user?.id || req.user?._id;

      if (!query || query.trim().length === 0) {
        return res.status(400).json({ error: 'Query cannot be empty' });
      }

      const result = await aiAssistantService.processQuery(query, { userId });

      logger.info('Data query processed', { userId, query: query.substring(0, 50) });

      return res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error processing query', { error: error.message });
      return res.status(500).json({
        error: 'Failed to process query',
        details: error.message
      });
    }
  }

  /**
   * Get recommendations
   */
  async getRecommendations(req, res) {
    try {
      const userId = req.user?.id || req.user?._id;

      const recommendations = await aiAssistantService.getRecommendations({ userId });

      logger.info('Recommendations generated', { userId, count: recommendations.length });

      return res.json({
        success: true,
        data: {
          recommendations,
          count: recommendations.length,
          timestamp: new Date()
        }
      });
    } catch (error) {
      logger.error('Error getting recommendations', { error: error.message });
      return res.status(500).json({
        error: 'Failed to get recommendations',
        details: error.message
      });
    }
  }

  /**
   * Clear conversation history
   */
  async clearHistory(req, res) {
    try {
      const userId = req.user?.id || req.user?._id;

      aiAssistantService.clearHistory(userId);

      logger.info('Chat history cleared', { userId });

      return res.json({
        success: true,
        message: 'Chat history cleared'
      });
    } catch (error) {
      logger.error('Error clearing history', { error: error.message });
      return res.status(500).json({
        error: 'Failed to clear history',
        details: error.message
      });
    }
  }

  /**
   * Get fleet context for frontend display
   */
  async getFleetContext(req, res) {
    try {
      const context = await aiAssistantService.getFleetContext();

      return res.json({
        success: true,
        data: context
      });
    } catch (error) {
      logger.error('Error getting fleet context', { error: error.message });
      return res.status(500).json({
        error: 'Failed to get fleet context',
        details: error.message
      });
    }
  }

  /**
   * Execute a safe AI-suggested action (e.g., assign driver, generate report)
   */
  async executeAction(req, res) {
    try {
      const user = req.user;
      const { action } = req.body || {};

      if (!user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      if (!action) {
        return res.status(400).json({ error: 'Action payload is required' });
      }

      const result = await aiAssistantService.executeAction(user, action);

      logger.info('AI action executed', { userId: user.id || user._id, type: action.type });

      return res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error executing AI action', { error: error.message });
      return res.status(500).json({
        error: 'Failed to execute action',
        details: error.message
      });
    }
  }
}

module.exports = new AIAssistantController();
