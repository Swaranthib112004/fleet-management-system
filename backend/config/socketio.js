// Real-Time WebSocket Server Configuration
// Location: backend/config/socketio.js

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

class SocketIOManager {
  constructor(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      pingInterval: 25000,
      pingTimeout: 60000,
      maxHttpBufferSize: 1e6
    });

    this.setupMiddleware();
    this.setupConnectionHandlers();
    this.setupNamespaces();
  }

  setupMiddleware() {
    // Authenticate WebSocket connections
    this.io.use((socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication failed: No token provided'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.id;
        socket.userRole = decoded.role;
        socket.userEmail = decoded.email;
        next();
      } catch (error) {
        logger.error('WebSocket authentication failed:', error.message);
        next(new Error('Authentication failed: Invalid token'));
      }
    });
  }

  setupConnectionHandlers() {
    this.io.on('connection', (socket) => {
      logger.info(`User ${socket.userId} connected via WebSocket`, {
        socketId: socket.id,
        role: socket.userRole
      });

      // Track active connections
      this.trackConnection(socket);

      // Handle disconnection
      socket.on('disconnect', () => {
        logger.info(`User ${socket.userId} disconnected`, {
          socketId: socket.id
        });
        this.removeConnection(socket.userId);
      });

      // Handle errors
      socket.on('error', (error) => {
        logger.error('WebSocket error:', error, {
          userId: socket.userId,
          socketId: socket.id
        });
      });

      // Keep-alive ping
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: new Date() });
      });
    });
  }

  setupNamespaces() {
    // GPS Tracking Namespace
    const gpsNamespace = this.io.of('/gps');
    gpsNamespace.on('connection', (socket) => {
      logger.info(`Connected to GPS namespace: ${socket.userId}`);

      socket.on('subscribe-vehicle', (vehicleId) => {
        socket.join(`vehicle-${vehicleId}`);
        logger.info(`User subscribed to vehicle: ${vehicleId}`);
      });

      socket.on('unsubscribe-vehicle', (vehicleId) => {
        socket.leave(`vehicle-${vehicleId}`);
        logger.info(`User unsubscribed from vehicle: ${vehicleId}`);
      });

      socket.on('subscribe-fleet', () => {
        socket.join('fleet');
        logger.info(`User subscribed to fleet updates`);
      });

      socket.on('unsubscribe-fleet', () => {
        socket.leave('fleet');
        logger.info(`User unsubscribed from fleet updates`);
      });

      socket.on('request-location', (vehicleId) => {
        socket.emit('location-request-ack', {
          vehicleId,
          timestamp: new Date()
        });
      });

      socket.on('disconnect', () => {
        logger.info(`Disconnected from GPS namespace: ${socket.userId}`);
      });
    });

    // Analytics Namespace
    const analyticsNamespace = this.io.of('/analytics');
    analyticsNamespace.on('connection', (socket) => {
      logger.info(`Connected to Analytics namespace: ${socket.userId}`);

      socket.on('subscribe-analytics', () => {
        socket.join(`analytics-${socket.userRole}`);
        logger.info(`User subscribed to analytics updates`);
      });

      socket.on('disconnect', () => {
        logger.info(`Disconnected from Analytics namespace: ${socket.userId}`);
      });
    });

    // Maintenance Namespace
    const maintenanceNamespace = this.io.of('/maintenance');
    maintenanceNamespace.on('connection', (socket) => {
      logger.info(`Connected to Maintenance namespace: ${socket.userId}`);

      socket.on('subscribe-alerts', () => {
        socket.join('maintenance-alerts');
        logger.info(`User subscribed to maintenance alerts`);
      });

      socket.on('disconnect', () => {
        logger.info(`Disconnected from Maintenance namespace: ${socket.userId}`);
      });
    });
  }

  // Helper methods
  trackConnection(socket) {
    if (!this.connections) this.connections = new Map();
    this.connections.set(socket.userId, socket.id);
  }

  removeConnection(userId) {
    if (this.connections) {
      this.connections.delete(userId);
    }
  }

  // Emit to specific user
  emitToUser(userId, event, data) {
    const socketId = this.connections?.get(userId);
    if (socketId) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.emit(event, data);
      }
    }
  }

  // Emit to vehicle subscribers
  emitToVehicle(vehicleId, event, data) {
    this.io.of('/gps').to(`vehicle-${vehicleId}`).emit(event, data);
  }

  // Emit to fleet
  emitToFleet(event, data) {
    this.io.of('/gps').to('fleet').emit(event, data);
  }

  // Emit to analytics subscribers
  emitToAnalytics(event, data) {
    this.io.of('/analytics').to(`analytics-manager`).emit(event, data);
    this.io.of('/analytics').to(`analytics-admin`).emit(event, data);
  }

  // Broadcast to all connected clients
  broadcastToAll(event, data) {
    this.io.emit(event, data);
  }

  // Get active connections count
  getActiveConnections() {
    return this.connections?.size || 0;
  }

  // Get socket instance
  getIO() {
    return this.io;
  }
}

module.exports = SocketIOManager;
