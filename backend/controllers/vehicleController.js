const Vehicle = require('../models/vehicleModel');

// Create vehicle
exports.createVehicle = async (req, res, next) => {
  try {
    const data = req.body;
    data.createdBy = req.user ? req.user.id : undefined;
    const vehicle = await Vehicle.create(data);
    res.status(201).json({ message: 'Vehicle created', vehicle });
  } catch (error) {
    next(error);
  }
};

// Get vehicles (with pagination & filters)
exports.getVehicles = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const search = req.query.search || '';
    const status = req.query.status;

    const filter = {};
    if (search) {
      filter.$or = [
        { registration: { $regex: search, $options: 'i' } },
        { make: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } }
      ];
    }
    if (status) filter.status = new RegExp('^' + status + '$', 'i');

    const total = await Vehicle.countDocuments(filter);
    const vehicles = await Vehicle.find(filter)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    const totalCount = await Vehicle.countDocuments();
    const activeCount = await Vehicle.countDocuments({ status: new RegExp('^active$', 'i') });
    const maintenanceCount = await Vehicle.countDocuments({ status: new RegExp('^maintenance$', 'i') });
    const inactiveCount = await Vehicle.countDocuments({ status: new RegExp('^inactive$', 'i') });

    res.json({
      total,
      page,
      pages: Math.ceil(total / limit),
      vehicles,
      globalStats: {
        total: totalCount,
        active: activeCount,
        maintenance: maintenanceCount,
        inactive: inactiveCount
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get single vehicle
exports.getVehicle = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
    res.json(vehicle);
  } catch (error) {
    next(error);
  }
};

// Update
exports.updateVehicle = async (req, res, next) => {
  try {
    const update = req.body;
    update.updatedBy = req.user ? req.user.id : undefined;
    const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
    res.json({ message: 'Vehicle updated', vehicle });
  } catch (error) {
    next(error);
  }
};

// Delete
exports.deleteVehicle = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findByIdAndDelete(req.params.id);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
    res.json({ message: 'Vehicle deleted' });
  } catch (error) {
    next(error);
  }
};
