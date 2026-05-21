const { sendError } = require('../utils/response');

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    const errors = error.details.map((d) => ({ field: d.context.key, message: d.message.replace(/\"/g, '') }));
    return sendError(res, 400, 'Validation failed', errors);
  }
  next();
};

module.exports = validate;
