const Joi = require('../utils/joiWrapper');

const createVehicleSchema = Joi.object({}).unknown(true);
const updateVehicleSchema = Joi.object({}).unknown(true);

module.exports = { createVehicleSchema, updateVehicleSchema };
