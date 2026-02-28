const Joi = require('../utils/joiWrapper');

const createDriverSchema = Joi.object({
  name: Joi.any().optional(),
  licenseNumber: Joi.any().optional(),
  licenseExpiry: Joi.any().optional(),
  contact: Joi.any().optional(),
  assignedVehicle: Joi.any().optional()
}).unknown(true);

const updateDriverSchema = Joi.object({
  name: Joi.any().optional(),
  licenseNumber: Joi.any().optional(),
  licenseExpiry: Joi.any().optional(),
  contact: Joi.any().optional(),
  assignedVehicle: Joi.any().optional()
}).unknown(true);

module.exports = { createDriverSchema, updateDriverSchema };
