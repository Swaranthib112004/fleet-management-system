// Predictive Maintenance Database Model
// Location: backend/models/predictiveMaintenanceModel.js

const mongoose = require('mongoose');

const predictiveMaintenanceSchema = new mongoose.Schema(
  {
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true,
      index: true
    },
    riskScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      required: true
    },
    predictedFailureDate: Date,
    daysUntilFailure: Number,
    confidence: {
      type: Number,
      min: 0,
      max: 100
    },
    predictedMaintenanceType: {
      type: String,
      enum: ['inspection', 'repair', 'service', 'replacement', 'overhaul'],
      required: true
    },
    estimatedCost: Number,
    costRange: {
      min: Number,
      max: Number
    },
    urgency: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },
    recommendation: String,
    actionItems: [String],
    potentialIssues: [String],
    affectedComponents: [String],
    historicalData: {
      maintenanceCount: Number,
      averageMaintenanceInterval: Number,
      lastMaintenanceDate: Date,
      averageCost: Number,
      costTrend: {
        type: String,
        enum: ['increasing', 'decreasing', 'stable']
      }
    },
    features: {
      age: Number,
      mileage: Number,
      maintenanceFrequency: Number,
      lastServiceCost: Number,
      seasonalFactor: Number,
      operationalHours: Number
    },
    predictions: {
      engineFailure: {
        probability: Number,
        daysUntil: Number
      },
      transmissionFailure: {
        probability: Number,
        daysUntil: Number
      },
      brakingSystemFailure: {
        probability: Number,
        daysUntil: Number
      },
      electricalFailure: {
        probability: Number,
        daysUntil: Number
      },
      hydraulicFailure: {
        probability: Number,
        daysUntil: Number
      },
      fluidLeakage: {
        probability: Number,
        daysUntil: Number
      },
      wearAndTear: {
        probability: Number,
        daysUntil: Number
      }
    },
    modelVersion: {
      type: String,
      default: '1.0'
    },
    trainingDataPoints: Number,
    accuracy: Number,
    lastUpdated: Date,
    nextPredictionDate: Date,
    predictionFrequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'daily'
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'archived'],
      default: 'active'
    },
    notes: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    acknowledgedAt: Date,
    acknowledgedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true,
    indexes: [
      { vehicle: 1, createdAt: -1 },
      { riskLevel: 1, createdAt: -1 },
      { predictedFailureDate: 1 },
      { vehicle: 1, riskScore: -1 },
      { status: 1, createdAt: -1 }
    ]
  }
);

// Indexes for common queries
predictiveMaintenanceSchema.index({ vehicle: 1, createdAt: -1 });
predictiveMaintenanceSchema.index({ riskLevel: 1, createdAt: -1 });
predictiveMaintenanceSchema.index({ predictedFailureDate: 1 });
predictiveMaintenanceSchema.index({ vehicle: 1, riskScore: -1 });
predictiveMaintenanceSchema.index({ status: 1, createdAt: -1 });

// Virtual for days until prediction refresh
predictiveMaintenanceSchema.virtual('daysUntilNextPrediction').get(function () {
  if (!this.nextPredictionDate) return 0;
  const diff = this.nextPredictionDate.getTime() - new Date().getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
});

module.exports = mongoose.model('PredictiveMaintenance', predictiveMaintenanceSchema);
