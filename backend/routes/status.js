const express = require('express');
const Status = require('../models/Status');
const User = require('../models/User');
const router = express.Router();

// Create a new status
router.post('/', async (req, res) => {
    try {
        const { userId, type, content, backgroundColor } = req.body;
        if (!userId || !content) return res.status(400).json({ error: 'userId and content required' });
        const status = new Status({ user: userId, type, content, backgroundColor });
        await status.save();
        const populated = await status.populate('user', 'username email');
        res.status(201).json(populated);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create status' });
    }
});

// Get all active statuses (not expired, all users)
router.get('/', async (req, res) => {
    try {
        const statuses = await Status.find({ expiresAt: { $gt: new Date() } })
            .populate('user', 'username email')
            .sort({ createdAt: -1 });
        res.status(200).json(statuses);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch statuses' });
    }
});

// Mark status as viewed
router.post('/:statusId/view', async (req, res) => {
    try {
        const { userId } = req.body;
        await Status.findByIdAndUpdate(
            req.params.statusId,
            { $addToSet: { views: userId } }
        );
        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to mark view' });
    }
});

// Delete a status
router.delete('/:statusId', async (req, res) => {
    try {
        await Status.findByIdAndDelete(req.params.statusId);
        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete status' });
    }
});

module.exports = router;
