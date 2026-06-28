const Report = require('../models/Report');

// ── User-facing report handlers ───────────────────────────────────────────────

// POST /api/reports — submit an issue or suggestion.
const createReport = async (req, res) => {
  try {
    const { category = 'other', message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Please describe your issue.' });
    }
    const report = await Report.create({
      reporter: req.userId,
      category,
      message: message.trim(),
    });
    res.status(201).json(report);
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

// GET /api/reports/mine — the current user's reports (with any admin replies).
const getMyReports = async (req, res) => {
  try {
    const reports = await Report.find({ reporter: req.userId }).sort({
      createdAt: -1,
    });
    // Mark replies as seen now that the user is viewing them.
    await Report.updateMany(
      { reporter: req.userId, adminReply: { $ne: '' }, replySeen: false },
      { replySeen: true }
    );
    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

// ── Admin handlers (mounted under /api/admin, superadmin-only) ─────────────────

// GET /api/admin/reports — all reports, newest first, with reporter info.
const adminListReports = async (req, res) => {
  try {
    const reports = await Report.find({})
      .sort({ createdAt: -1 })
      .populate('reporter', 'firstName lastName name username email avatarUrl');
    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

// POST /api/admin/reports/:reportId/reply — reply to a report (marks resolved).
const adminReplyReport = async (req, res) => {
  try {
    const { reply } = req.body;
    if (!reply || !reply.trim()) {
      return res.status(400).json({ message: 'Reply cannot be empty.' });
    }
    const report = await Report.findByIdAndUpdate(
      req.params.reportId,
      { adminReply: reply.trim(), status: 'resolved', replySeen: false },
      { new: true }
    );
    if (!report) return res.status(404).json({ message: 'Report not found' });
    res.json(report);
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

module.exports = {
  createReport,
  getMyReports,
  adminListReports,
  adminReplyReport,
};
