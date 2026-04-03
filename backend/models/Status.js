const mongoose = require('mongoose');

const statusSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['text', 'image'],
        default: 'text'
    },
    content: {
        type: String,  // text or base64 image
        required: true
    },
    backgroundColor: {
        type: String,
        default: '#008069'
    },
    views: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    }
}, { timestamps: true });

module.exports = mongoose.model('Status', statusSchema);
