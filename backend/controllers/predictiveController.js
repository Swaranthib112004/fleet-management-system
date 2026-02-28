// Predictive Maintenance Controller
// Location: backend/controllers/predictiveController.js

const predictiveMaintenanceService = require('../services/predictiveMaintenanceService');
const PredictiveMaintenance = require('../models/predictiveMaintenanceModel');
const Vehicle = require('../models/vehicleModel');
const logger = require('../utils/logger');

/**
 * Train predictive model for vehicle
 * POST /api/predictive/vehicles/:vehicleId/train
 */
exports.trainModel = async (req, res) => {
  try {
    const { vehicleId } = req.params;

    // Check vehicle exists
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    // Train model
    const prediction = await predictiveMaintenanceService.trainModel(vehicleId);

    if (!prediction) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient maintenance data to train model. Need at least 10 records.'
      });
    }

    res.json({
      success: true,
      message: 'Model trained successfully',
      data: prediction
    });
  } catch (error) {
    logger.error('Train model error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to train model',
      error: error.message
    });
  }
};

/**
 * Get predictions for vehicle
 * GET /api/predictive/vehicles/:vehicleId/predictions
 */
exports.getVehiclePredictions = async (req, res) => {
  try {
    const { vehicleId } = req.params;

    const prediction = await PredictiveMaintenance.findOne({
      vehicle: vehicleId,
      status: 'active'
    })
      .populate('vehicle', 'licensePlate make model year')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!prediction) {
      return res.status(404).json({
        success: false,
        message: 'No predictions found for this vehicle'
      });
    }

    res.json({
      success: true,
      data: prediction
    });
  } catch (error) {
    logger.error('Get predictions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get predictions',
      error: error.message
    });
  }
};

/**
 * Get all predictions with filtering and pagination
 * GET /api/predictive/predictions?riskLevel=high&limit=10&skip=0
 */
exports.getAllPredictions = async (req, res) => {
  try {
    const { riskLevel, limit = 50, skip = 0, sortBy = '-riskScore' } = req.query;

    // Build filter
    const filter = { status: 'active' };
    if (riskLevel) {
      filter.riskLevel = riskLevel;
    }

    // Build sort
    const sortObj = {};
    sortBy.split(',').forEach(field => {
      const [key, order] = field.startsWith('-')
        ? [field.slice(1), -1]
        : [field, 1];
      sortObj[key] = order;
    });

    const predictions = await PredictiveMaintenance.find(filter)
      .sort(sortObj)
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .populate('vehicle', 'licensePlate make model')
      .lean();

    const total = await PredictiveMaintenance.countDocuments(filter);

    res.json({
      success: true,
      data: predictions,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Get all predictions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get predictions',
      error: error.message
    });
  }
};

/**
 * Get high-risk vehicles
 * GET /api/predictive/high-risk-vehicles?threshold=50
 */
exports.getHighRiskVehicles = async (req, res) => {
  try {
    const { threshold = 50 } = req.query;

    const highRiskVehicles = await predictiveMaintenanceService.getHighRiskVehicles(
      parseInt(threshold)
    );

    res.json({
      success: true,
      data: highRiskVehicles,
      count: highRiskVehicles.length,
      threshold: parseInt(threshold)
    });
  } catch (error) {
    logger.error('Get high-risk vehicles error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get high-risk vehicles',
      error: error.message
    });
  }
};

/**
 * Get predictions summary (dashboard)
 * GET /api/predictive/summary
 */
exports.getPredictionsSummary = async (req, res) => {
  try {
    const predictions = await PredictiveMaintenance.find({ status: 'active' }).lean();

    const summary = {
      totalVehicles: predictions.length,
      riskDistribution: {
        critical: predictions.filter(p => p.riskLevel === 'critical').length,
        high: predictions.filter(p => p.riskLevel === 'high').length,
        medium: predictions.filter(p => p.riskLevel === 'medium').length,
        low: predictions.filter(p => p.riskLevel === 'low').length
      },
      averageRiskScore:
        predictions.length > 0
          ? parseFloat(
              (predictions.reduce((sum, p) => sum + p.riskScore, 0) / predictions.length).toFixed(
                2
              )
            )
          : 0,
      potentialCosts: {
        critical: predictions
          .filter(p => p.riskLevel === 'critical')
          .reduce((sum, p) => sum + (p.estimatedCost || 0), 0),
        totalEstimate: predictions.reduce((sum, p) => sum + (p.estimatedCost || 0), 0)
      },
      criticalVehicles: predictions
        .filter(p => p.riskLevel === 'critical')
        .map(p => ({
          vehicleId: p.vehicle,
          riskScore: p.riskScore,
          recommendation: p.recommendation
        }))
    };

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    logger.error('Get summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get predictions summary',
      error: error.message
    });
  }
};

/**
 * Acknowledge/dismiss prediction
 * PUT /api/predictive/predictions/:predictionId/acknowledge
 */
exports.acknowledgePrediction = async (req, res) => {
  try {
    const { predictionId } = req.params;
    const { notes = '' } = req.body;

    const prediction = await PredictiveMaintenance.findByIdAndUpdate(
      predictionId,
      {
        acknowledgedAt: new Date(),
        acknowledgedBy: req.user.id,
        notes: notes || null
      },
      { new: true }
    );

    if (!prediction) {
      return res.status(404).json({
        success: false,
        message: 'Prediction not found'
      });
    }

    res.json({
      success: true,
      message: 'Prediction acknowledged',
      data: prediction
    });
  } catch (error) {
    logger.error('Acknowledge prediction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to acknowledge prediction',
      error: error.message
    });
  }
};

/**
 * Get component failure risks
 * GET /api/predictive/vehicles/:vehicleId/component-risks
 */
exports.getComponentRisks = async (req, res) => {
  try {
    const { vehicleId } = req.params;

    const prediction = await PredictiveMaintenance.findOne({
      vehicle: vehicleId,
      status: 'active'
    });

    if (!prediction) {
      return res.status(404).json({
        success: false,
        message: 'No predictions found'
      });
    }

    const componentRisks = Object.entries(prediction.predictions).map(
      ([component, data]) => ({
        component: component.replace(/Failure/g, ''),
        probability: parseFloat((data.probability * 100).toFixed(2)),
        daysUntilFailure: data.daysUntil,
        severity: data.severity,
        recommendation:
          data.probability > 0.7
            ? `Schedule inspection for ${component}`
            : 'Monitor condition'
      })
    );

    res.json({
      success: true,
      data: componentRisks.sort(
        (a, b) => b.probability - a.probability
      )
    });
  } catch (error) {
    logger.error('Get component risks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get component risks',
      error: error.message
    });
  }
};

/**
 * Get cost savings projection
 * GET /api/predictive/vehicles/:vehicleId/cost-savings
 */
exports.getCostSavingsProjection = async (req, res) => {
  try {
    const { vehicleId } = req.params;

    const prediction = await PredictiveMaintenance.findOne({
      vehicle: vehicleId,
      status: 'active'
    }).populate('vehicle');

    if (!prediction) {
      return res.status(404).json({
        success: false,
        message: 'No predictions found'
      });
    }

    // Calculate potential savings by proactive maintenance
    const preventiveMaintenanceCost = prediction.estimatedCost || 0;
    const emergencyRepairMultiplier = 3.5; // Emergency repairs cost 3.5x more
    const emergencyRepairCost = preventiveMaintenanceCost * emergencyRepairMultiplier;
    const potentialSavings = emergencyRepairCost - preventiveMaintenanceCost;
    const savingsPercentage = ((potentialSavings / emergencyRepairCost) * 100).toFixed(2);

    const downtime = {
      planned: 4, // hours for planned maintenance
      emergency: 24 // hours for emergency repair
    };

    const downtimeCost = {
      planned: downtime.planned * 50, // $50/hour operational cost
      emergency: downtime.emergency * 150 // $150/hour for emergency
    };

    const totalDowntimeSavings = downtimeCost.emergency - downtimeCost.planned;

    res.json({
      success: true,
      data: {
        riskLevel: prediction.riskLevel,
        riskScore: prediction.riskScore,
        recommendedAction: prediction.recommendation,
        costAnalysis: {
          preventiveMaintenanceCost,
          estimatedEmergencyRepairCost: emergencyRepairCost,
          potentialMoneySavings: parseFloat(potentialSavings.toFixed(2)),
          savingsPercentage: parseFloat(savingsPercentage)
        },
        downtimeAnalysis: {
          plannedDowntimeHours: downtime.planned,
          emergencyDowntimeHours: downtime.emergency,
          plannedDowntimeCost: downtimeCost.planned,
          emergencyDowntimeCost: downtimeCost.emergency,
          downtimeSavings: totalDowntimeSavings
        },
        totalProjectedSavings: parseFloat(
          (potentialSavings + totalDowntimeSavings).toFixed(2)
        ),
        urgency:
          prediction.riskLevel === 'critical'
            ? 'IMMEDIATE'
            : prediction.riskLevel === 'high'
            ? 'URGENT (within 1-2 weeks)'
            : 'SOON (within 1 month)'
      }
    });
  } catch (error) {
    logger.error('Get cost savings projection error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get cost savings projection',
      error: error.message
    });
  }
};

/**
 * Retrain all models
 * POST /api/predictive/retrain-all
 */
exports.retrainAllModels = async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ status: 'active' }).select('_id');

    const results = {
      successful: 0,
      failed: 0,
      errors: []
    };

    for (const vehicle of vehicles) {
      try {
        await predictiveMaintenanceService.trainModel(vehicle._id);
        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          vehicleId: vehicle._id,
          error: error.message
        });
      }
    }

    logger.info('Retraining completed', results);

    res.json({
      success: true,
      message: 'Model retraining completed',
      data: {
        totalVehicles: vehicles.length,
        successfullyRetrained: results.successful,
        failedToRetrain: results.failed,
        errors: results.errors.slice(0, 10) // Return first 10 errors
      }
    });
  } catch (error) {
    logger.error('Retrain all error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrain models',
      error: error.message
    });
  }
};
