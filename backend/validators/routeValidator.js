const Joi = require('joi');

const createRouteValidator = Joi.object({}).unknown(true);
const updateRouteValidator = Joi.object({}).unknown(true);
const optimizeRouteValidator = Joi.object({}).unknown(true);
const createOptimizationValidator = Joi.object({}).unknown(true);
const acceptOptimizationValidator = Joi.object({}).unknown(true);

module.exports = {
  createRouteValidator,
  updateRouteValidator,
  optimizeRouteValidator,
  createOptimizationValidator,
  acceptOptimizationValidator
};
