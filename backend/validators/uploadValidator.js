const Joi = require('../utils/joiWrapper');

const uploadSchema = Joi.object({}).unknown(true);

module.exports = { uploadSchema };
