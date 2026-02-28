const Upload = require('../models/uploadModel');
const path = require('path');
const fs = require('fs');
const { UPLOAD_DIR } = require('../middleware/uploadMiddleware');

exports.uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      if (req.body.name) {
        const doc = await Upload.create({
          filename: req.body.name,
          url: req.body.url || 'manual_entry',
          mimetype: req.body.type || 'unknown',
          size: req.body.size || 'Unknown',
          category: req.body.category || 'Other',
          isManual: true,
          uploadedBy: req.user ? req.user.id : undefined
        });
        return res.status(201).json({ message: 'Record added', document: doc });
      }
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const savedPath = path.join(UPLOAD_DIR, req.file.filename);
    if (!fs.existsSync(savedPath)) {
      const err = new Error('Uploaded file not found on disk');
      err.statusCode = 500;
      throw err;
    }

    const url = `/uploads/${req.file.filename}`; // local URL; in prod replace with S3 url

    const doc = await Upload.create({
      filename: req.file.originalname,
      url,
      mimetype: req.file.mimetype,
      size: req.file.size,
      category: req.body.category || 'Other',
      relatedTo: req.body.relatedTo ? JSON.parse(req.body.relatedTo) : { kind: 'Other' },
      uploadedBy: req.user ? req.user.id : undefined
    });

    res.status(201).json({ message: 'File uploaded', document: doc });
  } catch (error) {
    next(error);
  }
};

exports.getDocument = async (req, res, next) => {
  try {
    const doc = await Upload.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json(doc);
  } catch (error) {
    next(error);
  }
};

// List documents with optional filters and pagination
exports.listDocuments = async (req, res, next) => {
  try {
    const { kind, item, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (kind) filter['relatedTo.kind'] = kind;
    if (item) filter['relatedTo.item'] = item;

    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(100, parseInt(limit, 10) || 20);

    const total = await Upload.countDocuments(filter);
    const docs = await Upload.find(filter)
      .sort({ createdAt: -1 })
      .skip((p - 1) * l)
      .limit(l)
      .lean();

    res.json({ data: docs, total, page: p, limit: l });
  } catch (error) {
    next(error);
  }
};

exports.deleteDocument = async (req, res, next) => {
  try {
    const doc = await Upload.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (error) {
    next(error);
  }
};