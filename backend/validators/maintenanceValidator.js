const Joi = require('../utils/joiWrapper');

const createMaintenanceSchema = Joi.object({}).unknown(true);
const updateMaintenanceSchema = Joi.object({}).unknown(true);

module.exports = { createMaintenanceSchema, updateMaintenanceSchema };
