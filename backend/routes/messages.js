const express = require('express');
const Message = require('../models/Message');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

const router = express.Router();

// Get message history between two users
router.get('/:userId/:otherUserId', async (req, res) => {
    try {
        const { userId, otherUserId } = req.params;
        const userObjectId = ObjectId(userId);
        const otherObjectId = ObjectId(otherUserId);

        const messages = await Message.find({
            $or: [
                { sender: userObjectId, receiver: otherObjectId },
                { sender: otherObjectId, receiver: userObjectId }
            ],
            deletedBy: { $ne: userObjectId }
        }).sort({ timestamp: 1 });

        res.status(200).json(messages);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// Get last message for all conversations of a user
router.get('/last/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        // Find all messages involving this user and get last one per conversation.
        // Exclude messages that user has deleted in their own view.
        const userObjectId = require('mongoose').Types.ObjectId.createFromHexString(userId);
        const messages = await Message.aggregate([
            {
                $match: {
                    $or: [{ sender: userObjectId }, { receiver: userObjectId }],
                    deletedBy: { $ne: userObjectId }
                }
            },
            { $sort: { timestamp: -1 } },
            {
                $group: {
                    _id: {
                        $cond: [
                            { $eq: ['$sender', require('mongoose').Types.ObjectId.createFromHexString(userId)] },
                            '$receiver',
                            '$sender'
                        ]
                    },
                    lastMessage: { $first: '$$ROOT' }
                }
            }
        ]);

        res.status(200).json(messages);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch last messages' });
    }
});

// Delete message
router.post('/:messageId/delete', async (req, res) => {
    try {
        const { messageId } = req.params;
        const { userId, type } = req.body; // type: 'me' or 'everyone'

        const message = await Message.findById(messageId);
        if (!message) return res.status(404).json({ error: 'Message not found' });

        if (type === 'me') {
            await Message.findByIdAndUpdate(messageId, { $addToSet: { deletedBy: userId } });
            return res.status(200).json({ success: true, type: 'me' });
        }

        if (type === 'everyone') {
            // Check 48 hour window
            const now = new Date();
            const msgTime = new Date(message.timestamp);
            const hoursDiff = (now - msgTime) / (1000 * 60 * 60);

            if (hoursDiff > 48) {
                return res.status(400).json({ error: 'Cannot delete for everyone after 48 hours' });
            }

            // Update message
            message.isDeletedForEveryone = true;
            message.content = '🚫 This message was deleted';
            message.type = 'text'; // Reset type for placeholder
            await message.save();

            return res.status(200).json({ success: true, type: 'everyone', message });
        }

        res.status(400).json({ error: 'Invalid delete type' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete message' });
    }
});

// Edit message
router.post('/:messageId/edit', async (req, res) => {
    try {
        const { messageId } = req.params;
        const { content } = req.body;

        const message = await Message.findById(messageId);
        if (!message) return res.status(404).json({ error: 'Message not found' });

        // Check if within 15-minute window for edits
        const now = new Date();
        const msgTime = new Date(message.timestamp);
        const diffMs = now - msgTime;
        if (diffMs > 15 * 60 * 1000) {
            return res.status(400).json({ error: 'Editing window (15 mins) has expired' });
        }

        message.content = content;
        message.isEdited = true;
        await message.save();

        res.status(200).json(message);
    } catch (err) {
        res.status(500).json({ error: 'Failed to edit message' });
    }
});

// Star/Unstar message
router.post('/:messageId/star', async (req, res) => {
    try {
        const { messageId } = req.params;
        const message = await Message.findById(messageId);
        if (!message) return res.status(404).json({ error: 'Message not found' });

        message.isStarred = !message.isStarred;
        await message.save();

        res.status(200).json(message);
    } catch (err) {
        res.status(500).json({ error: 'Failed to star message' });
    }
});

// Forward message
router.post('/forward', async (req, res) => {
    try {
        const { sender, receiver, content, type } = req.body;
        const newMessage = new Message({
            sender,
            receiver,
            content,
            type,
            isForwarded: true
        });
        await newMessage.save();
        res.status(201).json(newMessage);
    } catch (err) {
        res.status(500).json({ error: 'Failed to forward message' });
    }
});

// Delete all messages between two users (for one user only)
router.delete('/chat/:userId/:otherUserId', async (req, res) => {
    try {
        const { userId, otherUserId } = req.params;
        const userObjectId = ObjectId(userId);
        const user2ObjectId = ObjectId(otherUserId);

        await Message.updateMany(
            {
                $or: [
                    { sender: userObjectId, receiver: user2ObjectId },
                    { sender: user2ObjectId, receiver: userObjectId }
                ]
            },
            { $addToSet: { deletedBy: userObjectId } }
        );
        res.status(200).json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete chat history' });
    }
});

module.exports = router;
