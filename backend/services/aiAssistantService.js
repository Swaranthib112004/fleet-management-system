const axios = require('axios');
const logger = require('../utils/logger');
const Vehicle = require('../models/vehicleModel');
const Driver = require('../models/driverModel');
const Route = require('../models/routeModel');
const Trip = require('../models/tripModel');
const Maintenance = require('../models/maintenanceModel');
const Reminder = require('../models/reminderModel');

class AIAssistantService {
  constructor() {
    this.aiKey = process.env.GEMINI_API_KEY;
    this.fallbackAiKey = 'AIzaSyDpRso5ajRYmDRvtgLy11CPjGbe8Olo6B8';
    this.aiBaseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    // Models available as of 2026-03. Updated based on current Gemini API list.
    // If a model is not found for your key, it will try the next one.
    // Only include models confirmed accessible by API key
    this.models = [
      'gemini-2.5-flash',
      'gemini-2.0-flash'
    ];

    // Per-user conversation history (in-memory)
    this.conversationHistory = new Map();
    // Fleet context cache — refreshed at most every 60 seconds
    this._fleetContextCache = null;
    this._fleetContextCachedAt = 0;
    this._fleetContextTTL = 60 * 1000;
  }

  /**
   * Process a user message and return a complete AI-generated response.
   * Always fetches fresh real-time fleet data before calling Gemini.
   */
  async processMessage(userId, message, context = {}) {
    try {
      logger.info('Processing AI assistant message', { userId, messageLength: message.length });

      if (!this.conversationHistory.has(userId)) {
        this.conversationHistory.set(userId, []);
      }
      const history = this.conversationHistory.get(userId);

      // Fetch fleet context — cached for 60 seconds to avoid DB hammering
      const fleetContext = await this.getRealTimeFleetContext();

      // Build the full Gemini message list (last 6 history messages only to save tokens)
      const recentHistory = history.slice(-6);
      const systemPrompt = this.buildSystemPrompt(fleetContext, context.userRole);
      const messages = [
        { role: 'system', content: systemPrompt },
        ...recentHistory,
        { role: 'user', content: message }
      ];

      const response = await this.callAI(messages);
      const assistantMessage = response.content;

      // Save to conversation history (keep last 12 turns = 6 exchanges)
      history.push({ role: 'user', content: message });
      history.push({ role: 'assistant', content: assistantMessage });
      if (history.length > 12) {
        this.conversationHistory.set(userId, history.slice(-12));
      }

      logger.info('AI assistant message processed successfully', { userId });

      return {
        success: true,
        message: assistantMessage,
        recommendations: [],   // No auto-extracted recommendations; answers are self-contained.
        actionSuggestion: null, // Actions disabled — read-only assistant.
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('AI assistant error', { error: error.message, userId });
      throw new Error(`Assistant response failed: ${error.message}`);
    }
  }

  /**
   * Fetches live fleet data from MongoDB.
   * Cached for 60 seconds — returns same object for rapid sequential requests.
   */
  async getRealTimeFleetContext() {
    const now = Date.now();
    if (this._fleetContextCache && (now - this._fleetContextCachedAt) < this._fleetContextTTL) {
      logger.info('Fleet context served from cache');
      return this._fleetContextCache;
    }
    const context = await this._fetchFleetContextFromDB();
    this._fleetContextCache = context;
    this._fleetContextCachedAt = now;
    return context;
  }

  /**
   * Internal: actually hit the DB.
   */
  async _fetchFleetContextFromDB() {
    try {
      const now = new Date();
      const thirtyDays = new Date(now - 30 * 24 * 60 * 60 * 1000);

      const [vehicles, drivers, routes, trips, maintenanceLogs, reminders] = await Promise.all([
        Vehicle.find().lean(),
        Driver.find().lean(),
        Route.find().lean(),
        Trip.find().sort({ createdAt: -1 }).lean().limit(100),
        Maintenance.find().sort({ date: -1 }).lean().limit(100),
        Reminder.find().lean().limit(50),
      ]);

      // ── VEHICLES ──
      const activeVehicles = vehicles.filter(v =>
        ['active', 'in-use', 'on route'].includes(String(v.status || '').toLowerCase())
      );
      const idleVehicles = vehicles.filter(v =>
        ['idle', 'available', 'parked'].includes(String(v.status || '').toLowerCase())
      );
      const maintenanceVehicles = vehicles.filter(v =>
        ['maintenance', 'repair', 'service'].includes(String(v.status || '').toLowerCase())
      );
      const unassignedVehicles = vehicles.filter(v =>
        !v.driver || v.driver === 'Unassigned' || v.driver === 'None' || v.driver === ''
      );

      // ── DRIVERS ──
      const activeDrivers = drivers.filter(d =>
        String(d.status || 'active').toLowerCase() === 'active'
      );
      const unassignedDrivers = drivers.filter(d =>
        !d.assignedVehicle && !d.vehicle
      );
      const now30Days = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30);
      const expiringLicenses = drivers.filter(d => {
        if (!d.licenseExpiry) return false;
        const exp = new Date(d.licenseExpiry);
        return exp >= now && exp <= now30Days;
      });

      // ── ROUTES ──
      const activeRoutes = routes.filter(r =>
        ['active', 'in-progress', 'in progress'].includes(String(r.status || '').toLowerCase())
      );
      const completedRoutes = routes.filter(r =>
        String(r.status || '').toLowerCase() === 'completed'
      );
      const plannedRoutes = routes.filter(r =>
        ['planned', 'pending', 'scheduled'].includes(String(r.status || '').toLowerCase())
      );

      // ── TRIPS ──
      const ongoingTrips = trips.filter(t =>
        ['in-progress', 'ongoing', 'active'].includes(String(t.status || '').toLowerCase())
      );
      const recentTrips = trips.slice(0, 20);
      const totalDistance = recentTrips.reduce((s, t) => s + (t.distance || 0), 0);
      const totalFuel = recentTrips.reduce((s, t) => s + (t.fuelUsed || 0), 0);

      // ── MAINTENANCE ──
      const pendingMaintenance = maintenanceLogs.filter(m =>
        ['pending', 'scheduled', 'due'].includes(String(m.status || '').toLowerCase())
      );
      const completedMaintenance = maintenanceLogs.filter(m =>
        String(m.status || '').toLowerCase() === 'completed'
      );
      const recentMaintenance = maintenanceLogs.slice(0, 10);
      const totalMaintenanceCost = maintenanceLogs.reduce((s, m) => s + (m.cost || 0), 0);

      // ── REMINDERS ──
      const upcomingReminders = reminders.filter(r => {
        if (!r.dueDate) return false;
        const due = new Date(r.dueDate);
        return due >= now;
      });
      const overdueReminders = reminders.filter(r => {
        if (!r.dueDate) return false;
        return new Date(r.dueDate) < now && !r.completed;
      });

      return {
        fetchedAt: now.toISOString(),
        // Vehicles
        vehicleCount: vehicles.length,
        activeVehicleCount: activeVehicles.length,
        idleVehicleCount: idleVehicles.length,
        maintenanceVehicleCount: maintenanceVehicles.length,
        unassignedVehicleCount: unassignedVehicles.length,
        vehicles: vehicles.map(v => ({
          registration: v.registration || 'N/A',
          make: v.make || '',
          model: v.model || '',
          year: v.year || '',
          status: v.status || 'Unknown',
          fuelType: v.fuel || v.fuelType || 'N/A',
          mileage: v.mileage || 0,
          driver: v.driver || 'Unassigned',
          lastService: v.lastService || null,
        })),
        unassignedVehicles: unassignedVehicles.map(v => v.registration),
        // Drivers
        driverCount: drivers.length,
        activeDriverCount: activeDrivers.length,
        unassignedDriverCount: unassignedDrivers.length,
        expiringLicenseCount: expiringLicenses.length,
        drivers: drivers.map(d => ({
          name: d.name || 'Unknown',
          license: d.licenseNumber || d.license || 'N/A',
          licenseExpiry: d.licenseExpiry ? new Date(d.licenseExpiry).toDateString() : 'N/A',
          status: d.status || 'Active',
          vehicle: d.vehicle || d.assignedVehicle?.registration || 'Unassigned',
          phone: d.phone || 'N/A',
        })),
        expiringLicenses: expiringLicenses.map(d => ({
          name: d.name,
          expiry: d.licenseExpiry ? new Date(d.licenseExpiry).toDateString() : 'N/A',
        })),
        // Routes
        routeCount: routes.length,
        activeRouteCount: activeRoutes.length,
        completedRouteCount: completedRoutes.length,
        plannedRouteCount: plannedRoutes.length,
        activeRoutes: activeRoutes.map(r => ({
          code: r.routeCode || r.code || 'N/A',
          from: r.startLocation?.name || r.origin || 'N/A',
          to: r.endLocation?.name || r.destination || 'N/A',
          status: r.status,
          vehicle: r.vehicle || 'N/A',
          driver: r.driver || 'N/A',
        })),
        plannedRoutes: plannedRoutes.map(r => ({
          code: r.routeCode || r.code || 'N/A',
          from: r.startLocation?.name || r.origin || 'N/A',
          to: r.endLocation?.name || r.destination || 'N/A',
        })),
        // Trips
        tripCount: trips.length,
        ongoingTripCount: ongoingTrips.length,
        totalDistanceKm: parseFloat(totalDistance.toFixed(1)),
        totalFuelL: parseFloat(totalFuel.toFixed(1)),
        avgFuelEfficiency: totalFuel > 0 ? parseFloat((totalDistance / totalFuel).toFixed(2)) : null,
        recentTrips: recentTrips.map(t => ({
          status: t.status,
          distance: t.distance || 0,
          fuelUsed: t.fuelUsed || 0,
          vehicle: t.vehicle || 'N/A',
          driver: t.driver || 'N/A',
        })),
        // Maintenance
        maintenanceLogCount: maintenanceLogs.length,
        pendingMaintenanceCount: pendingMaintenance.length,
        completedMaintenanceCount: completedMaintenance.length,
        totalMaintenanceCostINR: parseFloat(totalMaintenanceCost.toFixed(2)),
        pendingMaintenance: pendingMaintenance.map(m => ({
          vehicle: m.vehicle || m.vehicleId || 'N/A',
          type: m.type || m.serviceType || 'N/A',
          date: m.date ? new Date(m.date).toDateString() : 'N/A',
          cost: m.cost || 0,
          status: m.status,
        })),
        recentMaintenance: recentMaintenance.map(m => ({
          vehicle: m.vehicle || 'N/A',
          type: m.type || 'N/A',
          date: m.date ? new Date(m.date).toDateString() : 'N/A',
          cost: m.cost || 0,
          status: m.status || 'N/A',
        })),
        // Reminders
        upcomingReminderCount: upcomingReminders.length,
        overdueReminderCount: overdueReminders.length,
        overdueReminders: overdueReminders.map(r => ({
          title: r.title || r.type || 'Reminder',
          dueDate: r.dueDate ? new Date(r.dueDate).toDateString() : 'N/A',
          vehicle: r.vehicle || 'N/A',
        })),
        upcomingReminders: upcomingReminders.slice(0, 5).map(r => ({
          title: r.title || r.type || 'Reminder',
          dueDate: r.dueDate ? new Date(r.dueDate).toDateString() : 'N/A',
          vehicle: r.vehicle || 'N/A',
        })),
      };
    } catch (error) {
      logger.warn('Error fetching real-time fleet context', { error: error.message });
      return { fetchedAt: new Date().toISOString(), error: 'Could not load fleet data.' };
    }
  }

  /**
   * Build a compact system prompt with live fleet data.
   * Uses concise single-line format per record to minimise input tokens
   * and avoid Gemini rate-limit (429) errors.
   */
  buildSystemPrompt(data, userRole = 'manager') {
    const d = data;
    const ts = d.fetchedAt ? new Date(d.fetchedAt).toLocaleTimeString() : 'now';

    // One short line per vehicle
    const vehicleLines = (d.vehicles || []).slice(0, 10).map(v =>
      `${v.registration}: ${v.make} ${v.model}, status=${v.status}, driver=${v.driver}, ${v.mileage}km, ${v.fuelType}`
    ).join('; ');

    // One short line per driver
    const driverLines = (d.drivers || []).slice(0, 5).map(dr =>
      `${dr.name}: lic=${dr.license} exp=${dr.licenseExpiry}, ${dr.status}, vehicle=${dr.vehicle}`
    ).join('; ');

    const activeRouteLines = (d.activeRoutes || []).map(r =>
      `${r.code}:${r.from}->${r.to},v=${r.vehicle},d=${r.driver}`
    ).join('; ') || 'none';

    const plannedRouteLines = (d.plannedRoutes || []).map(r =>
      `${r.code}:${r.from}->${r.to}`
    ).join('; ') || 'none';

    const pendingMainLines = (d.pendingMaintenance || []).slice(0, 10).map(m =>
      `${m.vehicle}:${m.type},due=${m.date},cost=Rs${m.cost}`
    ).join('; ') || 'none';

    const overdueLines = (d.overdueReminders || []).slice(0, 5).map(r =>
      `${r.title}(${r.vehicle}),was-due=${r.dueDate}`
    ).join('; ') || 'none';

    const upcomingLines = (d.upcomingReminders || []).slice(0, 5).map(r =>
      `${r.title}(${r.vehicle}),due=${r.dueDate}`
    ).join('; ') || 'none';

    return `You are FleetPro AI, an intelligent, enterprise-grade fleet management assistant. Data as of: ${ts}.

RULES:
- You are a powerful, helpful AI. You can answer questions about the fleet data provided below, but you can also answer general questions, chat naturally, and provide broader industry advice if the user asks.
- Give comprehensive, well-thought-out answers. Do not act robotic; act like a top-tier consultant.
- Use only plain text. Do not use Markdown (no **, no ###, no *bullets).
- If asked to perform an action (assign, delete, update) in the system, politely explain you are an advisory AI and direct them to the appropriate portal.
- Try to keep your responses highly professional.

--- LIVE FLEET DATA ---
VEHICLES: total=${d.vehicleCount || 0} | active=${d.activeVehicleCount || 0} | idle=${d.idleVehicleCount || 0} | in-maintenance=${d.maintenanceVehicleCount || 0} | unassigned=${d.unassignedVehicleCount || 0}
Unassigned registrations: ${(d.unassignedVehicles || []).join(', ') || 'none'}
Vehicle details: ${vehicleLines || 'none'}

DRIVERS: total=${d.driverCount || 0} | active=${d.activeDriverCount || 0} | no-vehicle=${d.unassignedDriverCount || 0} | licenses-expiring-30d=${d.expiringLicenseCount || 0}
Driver details: ${driverLines || 'none'}

ROUTES: total=${d.routeCount || 0} | active=${d.activeRouteCount || 0} | planned=${d.plannedRouteCount || 0} | completed=${d.completedRouteCount || 0}
Active routes: ${activeRouteLines}
Planned routes: ${plannedRouteLines}

TRIPS: total=${d.tripCount || 0} | ongoing=${d.ongoingTripCount || 0} | dist-last20=${d.totalDistanceKm || 0}km | fuel-last20=${d.totalFuelL || 0}L | avg-efficiency=${d.avgFuelEfficiency || 'N/A'}km/L

MAINTENANCE: logs=${d.maintenanceLogCount || 0} | pending=${d.pendingMaintenanceCount || 0} | completed=${d.completedMaintenanceCount || 0} | total-cost=Rs${d.totalMaintenanceCostINR || 0}
Pending maintenance: ${pendingMainLines}

REMINDERS: overdue=${d.overdueReminderCount || 0} | upcoming-30d=${d.upcomingReminderCount || 0}
Overdue: ${overdueLines}
Upcoming: ${upcomingLines}
--- END OF DATA ---

Provide a full, complete response to the user's input:`;
  }

  /**
   * Also expose getFleetContext as an alias (used by controller for /context endpoint).
   */
  async getFleetContext() {
    return this.getRealTimeFleetContext();
  }

  /**
   * Process specific data queries (used by /query endpoint).
   */
  async processQuery(query, context = {}) {
    try {
      logger.info('Processing data query', { queryLength: query.length });
      const fleetData = await this.getRealTimeFleetContext();
      const systemPrompt = this.buildSystemPrompt(fleetData, context.userRole);

      const response = await this.callAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ]);

      return {
        success: true,
        query,
        answer: response.content,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Query processing error', { error: error.message });
      throw error;
    }
  }

  /**
   * Get smart recommendations (used by /recommendations endpoint).
   */
  async getRecommendations() {
    try {
      const fleetData = await this.getRealTimeFleetContext();
      const systemPrompt = this.buildSystemPrompt(fleetData);

      const response = await this.callAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Based on the current fleet data, give me 3 to 5 specific, actionable recommendations to improve efficiency, reduce costs, or address urgent issues. Number each one clearly.' }
      ]);

      // Parse numbered lines into recommendation objects
      const lines = response.content.split('\n').filter(l => /^\d+[.)]/i.test(l.trim()));
      return lines.map(line => ({
        text: line.replace(/^\d+[.)]\s*/, '').trim(),
        type: 'suggestion',
        priority: 'medium',
      }));
    } catch (error) {
      logger.error('Recommendation generation error', { error: error.message });
      return [];
    }
  }

  /**
   * Clear conversation history for a user.
   */
  /**
   * Call Gemini API — single stable model with retries.
   */
  async callAI(messages) {
    if (!this.aiKey || String(this.aiKey).trim() === '') {
      throw new Error('GEMINI_API_KEY is not configured. Add it to your .env to use the AI assistant.');
    }

    const systemInstruction = messages.find(m => m.role === 'system');
    const userAndAssistant = messages.filter(m => m.role !== 'system');

    // Build Gemini payload
    const contents = [];
    let curRole = null;
    let curParts = [];
    userAndAssistant.forEach(msg => {
      const role = msg.role === 'assistant' ? 'model' : 'user';
      if (curRole !== role) {
        if (curRole) contents.push({ role: curRole, parts: curParts });
        curRole = role;
        curParts = [{ text: msg.content }];
      } else {
        curParts.push({ text: '\n\n' + msg.content });
      }
    });
    if (curRole) contents.push({ role: curRole, parts: curParts });

    const payload = { contents, generationConfig: { temperature: 0.5 } };
    if (systemInstruction) {
      payload.systemInstruction = { parts: [{ text: systemInstruction.content }] };
    }

    // Try each model until one succeeds (most likely to be available first)
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    let lastError = null;

    for (const model of this.models) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          logger.info(`Gemini [${model}] attempt ${attempt}`);
          let usedKey = this.aiKey;
          let resp;
          try {
            resp = await axios.post(
              `${this.aiBaseUrl}/models/${model}:generateContent?key=${usedKey}`,
              payload,
              { headers: { 'Content-Type': 'application/json' }, timeout: 30000 }
            );
          } catch (err) {
            const status = err?.response?.status;
            if (status === 429) {
              logger.warn('Primary Gemini API key rate-limited, retrying with fallback key.');
              usedKey = this.fallbackAiKey;
              resp = await axios.post(
                `${this.aiBaseUrl}/models/${model}:generateContent?key=${usedKey}`,
                payload,
                { headers: { 'Content-Type': 'application/json' }, timeout: 30000 }
              );
            } else {
              throw err;
            }
          }
          const text = resp.data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!text) throw new Error('Empty response from Gemini');
          logger.info(`Gemini success [${model}]`);
          return { content: String(text).trim() };
        } catch (err) {
          lastError = err;
          const status = err?.response?.status;
          const msg = err?.response?.data?.error?.message || err.message || 'Unknown error';
          logger.warn(`Gemini [${model}] failed — HTTP ${status}: ${msg}`);

          if (status === 400) throw new Error(`API Error (400): ${msg}`);
          if (status === 401 || status === 403) throw new Error(`API Key Rejected (${status}): ${msg}`);
          if (status === 404) break; // try next model
          if (status === 429) break; // rate limited, try next model
          if (attempt < 2) await sleep(1000);
        }
      }
    }

    // Robust fallback: always return a user-friendly error if AI fails
    const status = lastError?.response?.status;
    if (status === 404 || status === 429) {
      logger.warn('All Gemini models failed, returning fallback response');
      return { content: 'AI service is temporarily unavailable. Please try again later or use manual options.' };
    }
    const msg = lastError?.message || 'Unknown';
    throw new Error(`AI Service Unavailable: ${msg}. (Status: ${status}). If this is a 429, your free quota may be exhausted. Please check Google Cloud quotas or try again later.`);
  }

  /**
   * Clear conversation history for a user.
   * Also invalidates the fleet context cache so next message gets fresh data.
   */
  clearHistory(userId) {
    this.conversationHistory.delete(userId);
    this._fleetContextCache = null;
    this._fleetContextCachedAt = 0;
    logger.info('Conversation history cleared', { userId });
  }
}

module.exports = new AIAssistantService();
