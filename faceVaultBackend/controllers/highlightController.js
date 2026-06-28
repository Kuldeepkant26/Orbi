const Highlight = require('../models/Highlight');

// POST /api/highlights — create a highlight. Body: { title, items?: [{imageUrl, caption}] }
const createHighlight = async (req, res) => {
  try {
    const { title, items = [] } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Give your highlight a title.' });
    }
    const highlight = await Highlight.create({
      owner: req.userId,
      title: title.trim(),
      coverUrl: items[0]?.imageUrl || '',
      items,
    });
    res.status(201).json(highlight);
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

// POST /api/highlights/:id/items — add a story snapshot to a highlight.
// Body: { imageUrl, caption? }
const addToHighlight = async (req, res) => {
  try {
    const { imageUrl, caption = '' } = req.body;
    if (!imageUrl) return res.status(400).json({ message: 'Missing image.' });

    const highlight = await Highlight.findOne({
      _id: req.params.id,
      owner: req.userId,
    });
    if (!highlight) return res.status(404).json({ message: 'Highlight not found' });

    highlight.items.push({ imageUrl, caption });
    if (!highlight.coverUrl) highlight.coverUrl = imageUrl;
    await highlight.save();
    res.json(highlight);
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

// GET /api/highlights/user/:userId — a user's highlights (circles on the profile).
const getUserHighlights = async (req, res) => {
  try {
    const highlights = await Highlight.find({ owner: req.params.userId }).sort({
      createdAt: -1,
    });
    res.json(highlights);
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

// DELETE /api/highlights/:id — delete my highlight.
const deleteHighlight = async (req, res) => {
  try {
    const h = await Highlight.findOneAndDelete({
      _id: req.params.id,
      owner: req.userId,
    });
    if (!h) return res.status(404).json({ message: 'Highlight not found' });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

module.exports = {
  createHighlight,
  addToHighlight,
  getUserHighlights,
  deleteHighlight,
};
