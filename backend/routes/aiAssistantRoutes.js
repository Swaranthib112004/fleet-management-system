const express = require('express');
const router = express.Router();
const aiAssistantController = require('../controllers/aiAssistantController');
const { verifyToken } = require('../middleware/authMiddleware');

/**
 * AI Assistant Routes
 * All routes require authentication
 */

/**
 * @route POST /api/ai/chat
 * @description Send message to AI assistant and get response
 * @requires Authentication
 * @body {String} message - User message
 */
router.post('/chat', verifyToken, (req, res) => aiAssistantController.sendMessage(req, res));

/**
 * @route POST /api/ai/query
 * @description Process natural language data query
 * @requires Authentication
 * @body {String} query - Natural language query about fleet data
 */
router.post('/query', verifyToken, (req, res) => aiAssistantController.queryData(req, res));

/**
 * @route GET /api/ai/recommendations
 * @description Get smart recommendations for the fleet
 * @requires Authentication
 */
router.get('/recommendations', verifyToken, (req, res) => aiAssistantController.getRecommendations(req, res));

/**
 * @route POST /api/ai/clear-history
 * @description Clear conversation history for current user
 * @requires Authentication
 */
router.post('/clear-history', verifyToken, (req, res) => aiAssistantController.clearHistory(req, res));

/**
 * @route GET /api/ai/context
 * @description Get current fleet context (for chat display)
 * @requires Authentication
 */
router.get('/context', verifyToken, (req, res) => aiAssistantController.getFleetContext(req, res));

/**
 * @route POST /api/ai/action
 * @description Execute a safe AI-suggested action (assign driver, generate report, etc.)
 * @requires Authentication
 * @body {Object} action - Parsed action payload from assistantSuggestion
 */
router.post('/action', verifyToken, (req, res) => aiAssistantController.executeAction(req, res));

module.exports = router;
