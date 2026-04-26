require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const messageRoutes = require('./routes/messages');
const statusRoutes = require('./routes/status');
const User = require('./models/User');
const Message = require('./models/Message');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: 'http://localhost:5173', // Vite default port
        methods: ['GET', 'POST']
    },
    maxHttpBufferSize: 50e6 // 50MB limit for voice messages/files
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/status', statusRoutes);

// Socket.IO logic
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('join', (userId) => {
        socket.join(userId);
        console.log(`User ${userId} joined their personal room`);
    });

    socket.on('sendMessage', async ({ sender, receiver, content, type = 'text', fileName = null, tempId = null }) => {
        try {
            const newMessage = new Message({ sender, receiver, content, type, fileName });
            await newMessage.save();

            // Send to receiver only
            io.to(receiver).emit('receiveMessage', newMessage.toObject());
            // Echo back to sender with tempId so they can replace the optimistic message
            socket.emit('messageSent', { ...newMessage.toObject(), tempId });
        } catch (err) {
            console.error('Error sending message:', err);
        }
    });

    socket.on('deleteMessage', ({ messageId, receiver, sender, type }) => {
        if (type === 'everyone') {
            io.to(receiver).emit('messageDeleted', { messageId, type: 'everyone' });
            io.to(sender).emit('messageDeleted', { messageId, type: 'everyone' });
        }
    });

    socket.on('editMessage', (updatedMessage) => {
        io.to(updatedMessage.receiver).emit('messageEdited', updatedMessage);
        io.to(updatedMessage.sender).emit('messageEdited', updatedMessage);
    });

    socket.on('forwardMessage', (newMessage) => {
        io.to(newMessage.receiver).emit('receiveMessage', newMessage);
    });

    // ── WebRTC Signaling ──────────────────────────────────────────
    socket.on('callUser', ({ to, from, fromName, signal, callType }) => {
        io.to(to).emit('incomingCall', { from, fromName, signal, callType });
    });

    socket.on('answerCall', ({ to, signal }) => {
        io.to(to).emit('callAccepted', { signal });
    });

    socket.on('iceCandidate', ({ to, candidate }) => {
        io.to(to).emit('iceCandidate', { candidate });
    });

    socket.on('endCall', ({ to }) => {
        io.to(to).emit('callEnded');
    });

    socket.on('rejectCall', ({ to }) => {
        io.to(to).emit('callRejected');
    });
    // ─────────────────────────────────────────────────────────────

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// Database connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('Connected to MongoDB');
        const PORT = process.env.PORT || 5000;
        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch(err => {
        console.error('MongoDB connection error:', err);
    });
