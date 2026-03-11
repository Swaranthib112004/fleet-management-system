const Audit = require('../models/auditModel');

exports.getAudit = async (req, res, next) => {
  try {
    const logs = await Audit.find()
      .sort({ createdAt: -1 })
      .lean();
    res.json(logs);
  } catch (err) {
    next(err);
  }
};

exports.addAudit = async (req, res, next) => {
  try {
    const { action, target, user: bodyUser } = req.body;
    let user = bodyUser;
    if (bodyUser === 'current' || !bodyUser) {
      if (req.user && req.user.id) {
        try {
          const User = require('../models/userModel');
          const u = await User.findById(req.user.id).select('name email').lean();
          user = u ? (u.name || u.email || String(req.user.id)) : String(req.user.id);
        } catch {
          user = req.user.name || req.user.email || String(req.user.id);
        }
      } else {
        user = 'current';
      }
    }
    const log = await Audit.create({ action, target, user });
    res.status(201).json({ message: 'Audit record added', log });
  } catch (err) {
    next(err);
  }
};
