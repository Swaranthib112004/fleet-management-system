const fs = require('fs');

// Try to require real Joi; if not available, provide a minimal fallback for tests/environments
try {
  module.exports = require('joi');
} catch (e) {
  // Minimal compatible shim: supports Joi.string().required() and Joi.object({ ... }) with validate()
  const makeType = (type) => ({
    _type: type,
    _flags: {},
    required() { this._flags.presence = 'required'; return this; },
    optional() { delete this._flags.presence; return this; }
  });

  const JoiShim = {
    string: () => makeType('string'),
    number: () => makeType('number'),
    date: () => makeType('date'),
    object: (schema) => ({
      validate(obj) {
        const errors = [];
        for (const [k, v] of Object.entries(schema)) {
          if (v && v._flags && v._flags.presence === 'required') {
            if (obj[k] === undefined || obj[k] === null) {
              errors.push({ message: `${k} is required` });
            }
          }
        }
        return { error: errors.length ? { details: errors } : null };
      }
    })
  };

  module.exports = JoiShim;
}
