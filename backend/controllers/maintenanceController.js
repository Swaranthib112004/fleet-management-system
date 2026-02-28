const Maintenance = require('../models/maintenanceModel');

exports.createMaintenance = async (req, res, next) => {
  try {
    const data = req.body;
    data.createdBy = req.user ? req.user.id : undefined;
    const m = await Maintenance.create(data);
    res.status(201).json({ message: 'Maintenance logged', maintenance: m });
  } catch (err) { next(err); }
};

exports.getMaintenances = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const search = req.query.search || '';
    const status = req.query.status;
    const filter = {};
    if (req.query.vehicle) filter.vehicle = req.query.vehicle;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { type: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Maintenance.countDocuments(filter);
    const items = await Maintenance.find(filter).skip((page - 1) * limit).limit(limit).sort({ performedAt: -1 });
    res.json({ total, page, pages: Math.ceil(total / limit), items });
  } catch (err) { next(err); }
};

exports.getMaintenance = async (req, res, next) => {
  try { const m = await Maintenance.findById(req.params.id); if (!m) return res.status(404).json({ message: 'Not found' }); res.json(m); } catch (err) { next(err); }
};

exports.updateMaintenance = async (req, res, next) => { try { const update = req.body; update.updatedBy = req.user ? req.user.id : undefined; const m = await Maintenance.findByIdAndUpdate(req.params.id, update, { new: true }); if (!m) return res.status(404).json({ message: 'Not found' }); res.json({ message: 'Updated', maintenance: m }); } catch (err) { next(err); } };

exports.deleteMaintenance = async (req, res, next) => { try { const m = await Maintenance.findByIdAndDelete(req.params.id); if (!m) return res.status(404).json({ message: 'Not found' }); res.json({ message: 'Deleted' }); } catch (err) { next(err); } };
