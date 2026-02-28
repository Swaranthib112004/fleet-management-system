const Audit = require('../models/auditModel');

exports.getAudit = async (req, res, next) => {
  try {
    const logs = await Audit.find()
      .sort({ createdAt: -1 })
      .populate('user', 'name email role');
    res.json(logs);
  } catch (err) {
    next(err);
  }
};

exports.addAudit = async (req, res, next) => {
  try {
    const data = req.body;
    const log = await Audit.create(data);
    res.status(201).json({ message: 'Audit record added', log });
  } catch (err) {
    next(err);
  }
};
