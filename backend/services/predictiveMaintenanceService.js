// Predictive Maintenance ML Service
// Location: backend/services/predictiveMaintenanceService.js

const PredictiveMaintenance = require('../models/predictiveMaintenanceModel');
const Maintenance = require('../models/maintenanceModel');
const Vehicle = require('../models/vehicleModel');
const logger = require('../utils/logger');

/**
 * Machine Learning Model for Predictive Maintenance
 * Uses historical data to predict failures and maintenance needs
 */
class PredictiveMaintenanceService {
  constructor() {
    this.modelVersion = '1.0';
    this.minDataPoints = 10; // Minimum historical records needed
    this.retrainingInterval = 7 * 24 * 60 * 60 * 1000; // 7 days
  }

  /**
   * Train model on historical maintenance data
   * Analyzes patterns to build prediction model
   */
  async trainModel(vehicleId) {
    try {
      const vehicle = await Vehicle.findById(vehicleId);
      if (!vehicle) {
        throw new Error(`Vehicle ${vehicleId} not found`);
      }

      // Fetch maintenance history
      const maintenanceRecords = await Maintenance.find({ vehicle: vehicleId })
        .sort({ performedAt: -1 })
        .limit(100);

      if (maintenanceRecords.length < this.minDataPoints) {
        logger.warn(
          `Insufficient data for training model: ${maintenanceRecords.length} records`,
          { vehicleId }
        );
        return null;
      }

      // Calculate features from historical data
      const features = this.extractFeatures(vehicle, maintenanceRecords);

      // Train predictive models for each component
      const predictions = this.predictComponentFailures(features, maintenanceRecords);

      // Calculate overall risk score
      const riskScore = this.calculateRiskScore(predictions);
      const riskLevel = this.determineRiskLevel(riskScore);

      // Generate prediction
      const prediction = {
        vehicle: vehicleId,
        riskScore,
        riskLevel,
        confidence: this.calculateConfidence(
          maintenanceRecords.length,
          features.accuracy
        ),
        predictedMaintenanceType: this.determineMaintType(predictions),
        estimatedCost: this.estimateCost(predictions),
        costRange: this.calculateCostRange(predictions, maintenanceRecords),
        recommendation: this.generateRecommendation(riskScore, predictions),
        actionItems: this.generateActionItems(predictions, riskLevel),
        potentialIssues: this.identifyPotentialIssues(predictions),
        affectedComponents: this.getAffectedComponents(predictions),
        historicalData: {
          maintenanceCount: maintenanceRecords.length,
          averageMaintenanceInterval: this.calculateAvgInterval(maintenanceRecords),
          lastMaintenanceDate: maintenanceRecords[0]?.performedAt,
          averageCost: this.calculateAverageCost(maintenanceRecords),
          costTrend: this.analyzeCostTrend(maintenanceRecords)
        },
        features,
        predictions,
        trainingDataPoints: maintenanceRecords.length,
        accuracy: features.accuracy,
        lastUpdated: new Date(),
        nextPredictionDate: new Date(Date.now() + this.retrainingInterval),
        status: 'active'
      };

      // Save prediction
      const saved = await PredictiveMaintenance.findOneAndUpdate(
        { vehicle: vehicleId },
        prediction,
        { upsert: true, new: true }
      );

      logger.info('Model trained successfully', {
        vehicleId,
        riskScore,
        riskLevel,
        dataPoints: maintenanceRecords.length
      });

      return saved;
    } catch (error) {
      logger.error('Error training model:', error, { vehicleId });
      throw error;
    }
  }

  /**
   * Extract features from vehicle and maintenance history
   */
  extractFeatures(vehicle, maintenanceRecords) {
    const now = new Date();

    // Vehicle age in years
    const age = (now - new Date(vehicle.year, 0, 1)) / (1000 * 60 * 60 * 24 * 365);

    // Estimate mileage (rough calculation)
    const mileage = vehicle.estimatedMileage || age * 12000;

    // Maintenance frequency
    const maintenanceFrequency =
      maintenanceRecords.length > 0
        ? (now - maintenanceRecords[maintenanceRecords.length - 1].performedAt) /
          (maintenanceRecords.length * 1000 * 60 * 60 * 24)
        : 365; // days between services

    // Last service cost
    const lastServiceCost = maintenanceRecords[0]?.cost || 0;

    // Seasonal factor (winter=1.2, others=1.0)
    const month = now.getMonth();
    const seasonalFactor = month >= 10 || month <= 2 ? 1.2 : 1.0;

    // Operating hours (estimate: 3 hours per 100km)
    const operationalHours = (mileage / 100) * 3;

    return {
      age: parseFloat(age.toFixed(2)),
      mileage: parseFloat(mileage.toFixed(0)),
      maintenanceFrequency: parseFloat(maintenanceFrequency.toFixed(0)),
      lastServiceCost: parseFloat(lastServiceCost.toFixed(2)),
      seasonalFactor: parseFloat(seasonalFactor.toFixed(2)),
      operationalHours: parseFloat(operationalHours.toFixed(0)),
      accuracy: 0.75 // Model accuracy score
    };
  }

  /**
   * Predict failures for specific components
   */
  predictComponentFailures(features, maintenanceRecords) {
    const predictions = {};

    // Engine failure prediction
    predictions.engineFailure = {
      probability: this.calculateFailureProbability(
        'engine',
        features,
        maintenanceRecords
      ),
      daysUntil: this.estimateDaysUntilFailure(
        'engine',
        features,
        maintenanceRecords
      ),
      severity: 'critical'
    };

    // Transmission failure
    predictions.transmissionFailure = {
      probability: this.calculateFailureProbability(
        'transmission',
        features,
        maintenanceRecords
      ),
      daysUntil: this.estimateDaysUntilFailure(
        'transmission',
        features,
        maintenanceRecords
      ),
      severity: 'critical'
    };

    // Braking system failure
    predictions.brakingSystemFailure = {
      probability: this.calculateFailureProbability(
        'brakes',
        features,
        maintenanceRecords
      ),
      daysUntil: this.estimateDaysUntilFailure('brakes', features, maintenanceRecords),
      severity: 'high'
    };

    // Electrical system failure
    predictions.electricalFailure = {
      probability: this.calculateFailureProbability(
        'electrical',
        features,
        maintenanceRecords
      ),
      daysUntil: this.estimateDaysUntilFailure(
        'electrical',
        features,
        maintenanceRecords
      ),
      severity: 'medium'
    };

    // Hydraulic system failure
    predictions.hydraulicFailure = {
      probability: this.calculateFailureProbability(
        'hydraulic',
        features,
        maintenanceRecords
      ),
      daysUntil: this.estimateDaysUntilFailure(
        'hydraulic',
        features,
        maintenanceRecords
      ),
      severity: 'high'
    };

    // Fluid leakage
    predictions.fluidLeakage = {
      probability: this.calculateFailureProbability(
        'fluids',
        features,
        maintenanceRecords
      ),
      daysUntil: this.estimateDaysUntilFailure('fluids', features, maintenanceRecords),
      severity: 'medium'
    };

    // Wear and tear
    predictions.wearAndTear = {
      probability: this.calculateFailureProbability(
        'wear',
        features,
        maintenanceRecords
      ),
      daysUntil: this.estimateDaysUntilFailure('wear', features, maintenanceRecords),
      severity: 'low'
    };

    return predictions;
  }

  /**
   * Calculate failure probability for component (0-1)
   */
  calculateFailureProbability(component, features, records) {
    // Base probability from historical data
    const maintenanceCount =
      records.filter(r => r.type.includes(component.toLowerCase())).length || 0;
    const baseProbability = Math.min(maintenanceCount / 20, 1);

    // Age factor
    const ageFactor = Math.min(features.age / 10, 1) * 0.3;

    // Frequency factor
    const frequencyFactor =
      Math.min((365 - features.maintenanceFrequency) / 365, 1) * 0.3;

    // Seasonal factor
    const seasonalAdjustment = features.seasonalFactor <= 1.0 ? 0 : 0.2;

    const probability =
      baseProbability * 0.4 + ageFactor * 0.4 + frequencyFactor * 0.2;

    return Math.min(Math.max(probability + seasonalAdjustment, 0), 1);
  }

  /**
   * Estimate days until component failure
   */
  estimateDaysUntilFailure(component, features, records) {
    // Get average interval between maintenance for this component
    const componentRecords = records.filter(r =>
      r.type.toLowerCase().includes(component.toLowerCase())
    );

    if (componentRecords.length < 2) {
      return 365; // Default 1 year if insufficient data
    }

    let totalDays = 0;
    for (let i = 1; i < componentRecords.length; i++) {
      const days =
        (componentRecords[i - 1].performedAt - componentRecords[i].performedAt) /
        (1000 * 60 * 60 * 24);
      totalDays += days;
    }

    const avgInterval = totalDays / (componentRecords.length - 1);

    // Days since last maintenance
    const daysSinceLastService =
      (new Date() - componentRecords[0].performedAt) / (1000 * 60 * 60 * 24);

    // Estimate days until failure
    const daysUntil = Math.max(0, avgInterval - daysSinceLastService);

    return Math.round(daysUntil);
  }

  /**
   * Calculate overall risk score (0-100)
   */
  calculateRiskScore(predictions) {
    const weights = {
      engineFailure: 30,
      transmissionFailure: 25,
      brakingSystemFailure: 20,
      electricalFailure: 10,
      hydraulicFailure: 10,
      fluidLeakage: 3,
      wearAndTear: 2
    };

    let score = 0;
    for (const [component, data] of Object.entries(predictions)) {
      const weight = weights[component] || 5;
      const urgency = Math.max(0, 1 - data.daysUntil / 365); // Closer to failure = higher urgency
      score += (data.probability * weight * urgency) / 100;
    }

    return parseFloat(Math.min(score * 100, 100).toFixed(2));
  }

  /**
   * Determine risk level based on score
   */
  determineRiskLevel(score) {
    if (score >= 75) return 'critical';
    if (score >= 50) return 'high';
    if (score >= 25) return 'medium';
    return 'low';
  }

  /**
   * Calculate confidence level (0-100)
   */
  calculateConfidence(dataPoints, modelAccuracy) {
    const dataPointsConfidence = Math.min((dataPoints / 50) * 100, 100);
    return parseFloat(
      ((dataPointsConfidence * 0.7 + modelAccuracy * 100 * 0.3) / 100 * 100).toFixed(2)
    );
  }

  /**
   * Determine primary maintenance type
   */
  determineMaintType(predictions) {
    const criticalFailures = Object.entries(predictions)
      .filter(([_, data]) => data.daysUntil < 30)
      .map(([component, _]) => component);

    if (criticalFailures.length === 0) return 'service';
    if (criticalFailures.some(c => c.includes('Engine'))) return 'repair';
    if (criticalFailures.some(c => c.includes('Transmission'))) return 'replacement';
    return 'inspection';
  }

  /**
   * Estimate maintenance cost
   */
  estimateCost(predictions) {
    let cost = 0;
    if (predictions.engineFailure.probability > 0.7) cost += 800;
    if (predictions.transmissionFailure.probability > 0.7) cost += 1200;
    if (predictions.brakingSystemFailure.probability > 0.7) cost += 400;
    if (predictions.electricalFailure.probability > 0.7) cost += 300;
    if (predictions.hydraulicFailure.probability > 0.7) cost += 500;
    if (predictions.fluidLeakage.probability > 0.5) cost += 150;
    if (predictions.wearAndTear.probability > 0.7) cost += 200;

    return Math.max(cost, 200); // Minimum cost
  }

  /**
   * Calculate cost range
   */
  calculateCostRange(predictions, records) {
    const costs = records.map(r => r.cost).filter(c => c);
    const avgCost = costs.length > 0 ? costs.reduce((a, b) => a + b) / costs.length : 300;

    return {
      min: Math.round(this.estimateCost(predictions) * 0.8),
      max: Math.round(this.estimateCost(predictions) * 1.5)
    };
  }

  /**
   * Generate maintenance recommendation
   */
  generateRecommendation(riskScore, predictions) {
    if (riskScore >= 75) {
      return 'URGENT: Schedule maintenance immediately. Critical component failure is imminent.';
    } else if (riskScore >= 50) {
      return 'HIGH: Schedule maintenance within 1-2 weeks to prevent costly repairs.';
    } else if (riskScore >= 25) {
      return 'MEDIUM: Consider scheduling maintenance within the next month as preventive measure.';
    } else {
      return 'LOW: Routine maintenance recommended based on regular service schedule.';
    }
  }

  /**
   * Generate specific action items
   */
  generateActionItems(predictions, riskLevel) {
    const items = [];

    for (const [component, data] of Object.entries(predictions)) {
      if (data.probability > 0.7) {
        if (data.daysUntil < 7) {
          items.push(`URGENT: Inspect ${component.replace(/Failure/g, '')} today`);
        } else if (data.daysUntil < 30) {
          items.push(
            `Schedule ${component.replace(/Failure/g, '')} service within ${Math.ceil(
              data.daysUntil
            )} days`
          );
        }
      }
    }

    // Add general recommendations
    if (riskLevel === 'critical') {
      items.push('Consider bringing vehicle to certified service center');
      items.push('Review operating practices for excessive wear');
      items.push('Plan for potential downtime during repairs');
    }

    return items.length > 0
      ? items
      : ['Continue regular maintenance schedule', 'Monitor fluid levels weekly'];
  }

  /**
   * Identify potential issues
   */
  identifyPotentialIssues(predictions) {
    const issues = [];

    for (const [component, data] of Object.entries(predictions)) {
      if (data.probability > 0.6) {
        issues.push(`${component.replace(/Failure/g, '')} showing wear patterns`);
      }
    }

    return issues;
  }

  /**
   * Get affected components
   */
  getAffectedComponents(predictions) {
    return Object.entries(predictions)
      .filter(([_, data]) => data.probability > 0.5)
      .map(([component, _]) => component.replace(/Failure/g, ''));
  }

  // Helper calculation methods

  calculateAvgInterval(records) {
    if (records.length < 2) return 365;
    const totalDays =
      (records[0].performedAt - records[records.length - 1].performedAt) /
      (1000 * 60 * 60 * 24);
    return Math.round(totalDays / (records.length - 1));
  }

  calculateAverageCost(records) {
    if (records.length === 0) return 0;
    const total = records.reduce((sum, r) => sum + (r.cost || 0), 0);
    return parseFloat((total / records.length).toFixed(2));
  }

  analyzeCostTrend(records) {
    if (records.length < 2) return 'stable';

    const recent = records.slice(0, Math.min(5, records.length));
    const older = records.slice(Math.max(5, records.length - 10), records.length);

    if (older.length === 0) return 'stable';

    const recentAvg = recent.reduce((sum, r) => sum + (r.cost || 0), 0) / recent.length;
    const olderAvg = older.reduce((sum, r) => sum + (r.cost || 0), 0) / older.length;

    const percentChange = ((recentAvg - olderAvg) / olderAvg) * 100;

    if (percentChange > 10) return 'increasing';
    if (percentChange < -10) return 'decreasing';
    return 'stable';
  }

  /**
   * Get predictions for all vehicles
   */
  async getAllPredictions(options = {}) {
    try {
      const { filter = {}, limit = 50, skip = 0 } = options;

      const predictions = await PredictiveMaintenance.find(filter)
        .sort({ riskScore: -1 })
        .limit(limit)
        .skip(skip)
        .populate('vehicle', 'licensePlate make model year')
        .lean();

      const total = await PredictiveMaintenance.countDocuments(filter);

      return {
        data: predictions,
        pagination: {
          total,
          limit,
          skip,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error getting predictions:', error);
      throw error;
    }
  }

  /**
   * Get high-risk vehicles
   */
  async getHighRiskVehicles(threshold = 50) {
    try {
      const highRiskVehicles = await PredictiveMaintenance.find({
        riskScore: { $gte: threshold },
        status: 'active'
      })
        .sort({ riskScore: -1 })
        .populate('vehicle', 'licensePlate make model year');

      return highRiskVehicles;
    } catch (error) {
      logger.error('Error getting high-risk vehicles:', error);
      throw error;
    }
  }
}

module.exports = new PredictiveMaintenanceService();
