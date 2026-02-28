const Driver = require('../models/driverModel');

exports.createDriver = async (req, res, next) => {
  try {
    const data = req.body;
    data.createdBy = req.user ? req.user.id : undefined;
    const driver = await Driver.create(data);
    res.status(201).json({ message: 'Driver created', driver });
  } catch (err) { next(err); }
};

exports.getDrivers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const search = req.query.search || '';
    const status = req.query.status;

    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { license: { $regex: search, $options: 'i' } },
        { vehicle: { $regex: search, $options: 'i' } },
      ];
    }
    if (status) filter.status = status;

    const total = await Driver.countDocuments(filter);
    const drivers = await Driver.find(filter)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });
    res.json({ total, page, pages: Math.ceil(total / limit), drivers });
  } catch (err) { next(err); }
};

exports.getDriver = async (req, res, next) => {
  try {
    const d = await Driver.findById(req.params.id);
    if (!d) return res.status(404).json({ message: 'Driver not found' });
    res.json(d);
  } catch (err) { next(err); }
};

exports.updateDriver = async (req, res, next) => {
  try {
    const update = req.body;
    update.updatedBy = req.user ? req.user.id : undefined;
    const d = await Driver.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!d) return res.status(404).json({ message: 'Driver not found' });
    res.json({ message: 'Driver updated', driver: d });
  } catch (err) { next(err); }
};

exports.deleteDriver = async (req, res, next) => {
  try {
    const d = await Driver.findByIdAndDelete(req.params.id);
    if (!d) return res.status(404).json({ message: 'Driver not found' });
    res.json({ message: 'Driver deleted' });
  } catch (err) { next(err); }
};