const Joi = require('../utils/joiWrapper');

const createReminderSchema = Joi.object({}).unknown(true);

module.exports = { createReminderSchema };
