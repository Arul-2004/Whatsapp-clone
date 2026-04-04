import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import io from 'socket.io-client';
import EmojiPicker from 'emoji-picker-react';
import {
    Search, MoreVertical, MessageSquare, Paperclip, Smile,
    Send, LogOut, CheckCheck, Shield, X, File, Plus, Circle,
    Mic, Square, Trash2, Volume2, ChevronDown, Forward, Info, Star, Copy, Edit,
    Phone, Video
} from 'lucide-react';
import { IncomingCallOverlay, ActiveCallOverlay } from '../components/CallOverlay';

const socket = io('http://localhost:5000');
const getAvatar = (name) =>
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=008069&color=fff&size=128&bold=true`;
const formatTime = (ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const compressImage = (dataUrl, maxWidth = 1280, quality = 0.7) => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = dataUrl;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            if (width > maxWidth) {
                height = (maxWidth / width) * height;
                width = maxWidth;
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
    });
};

const Chat = () => {
    const { user, logout } = useContext(AuthContext);
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [attachPreview, setAttachPreview] = useState(null);
    // lastMessages: { [userId]: { content, timestamp } }
    const [lastMessages, setLastMessages] = useState({});
    const [unreadCounts, setUnreadCounts] = useState({}); // { [userId]: count }
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const emojiPickerRef = useRef(null);
    const selectedUserRef = useRef(null);

    // Status related states
    const [allStatuses, setAllStatuses] = useState([]);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [isStatusPosting, setIsStatusPosting] = useState(false);
    const [statusType, setStatusType] = useState('text'); // 'text' or 'image'
    const [statusContent, setStatusContent] = useState('');
    const [statusBg, setStatusBg] = useState('#008069');
    const [viewingStatusUser, setViewingStatusUser] = useState(null);

    // Audio related states
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerRef = useRef(null);

    // Deletion states
    const [msgToDelete, setMsgToDelete] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // Advanced features states
    const [editingMsg, setEditingMsg] = useState(null);
    const [forwardingMsg, setForwardingMsg] = useState(null);
    const [showForwardModal, setShowForwardModal] = useState(false);
    const [infoMsg, setInfoMsg] = useState(null);
    const [showContextMenu, setShowContextMenu] = useState(null); // stores message ID
    const [sidebarContextMenu, setSidebarContextMenu] = useState(null); // { x, y, user }
    const [showHeaderMenu, setShowHeaderMenu] = useState(false);

    // ── Calling State ──────────────────────────────────
    const [callStatus, setCallStatus] = useState('idle'); // 'idle'|'calling'|'ringing'|'active'
    const [callType, setCallType] = useState('audio');    // 'audio'|'video'
    const [incomingCall, setIncomingCall] = useState(null); // { from, fromName, signal, callType }
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const peerRef = useRef(null);              // RTCPeerConnection
    const ringtoneRef = useRef({ ctx: null, interval: null }); // Web Audio ringtone
    const pendingCandidatesRef = useRef([]);   // ICE candidates received before setRemoteDescription
    const selectedUserRef2 = useRef(null);     // mirror selectedUser for socket closures
    // ────────────────────────────────────────────────────

    // Keep ref in sync for socket handlers
    useEffect(() => { selectedUserRef.current = selectedUser; }, [selectedUser]);
    useEffect(() => { selectedUserRef2.current = selectedUser; }, [selectedUser]);

    // On mount: join socket room, load users, load last messages
    useEffect(() => {
        if (!user) return;
        socket.emit('join', user.id);
        fetchUsers();
        fetchLastMessages();
        fetchStatuses();
    }, [user]);

    // Fetch all other users
    const fetchUsers = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/auth/users');
            setUsers(res.data.filter(u => String(u._id) !== String(user.id)));
        } catch (err) { console.error('fetchUsers error', err); }
    };

    // Fetch last messages for sidebar
    const fetchLastMessages = async () => {
        try {
            const res = await axios.get(`http://localhost:5000/api/messages/last/${user.id}`);
            const map = {};
            res.data.forEach(item => {
                map[String(item._id)] = {
                    content: item.lastMessage.content,
                    timestamp: item.lastMessage.timestamp
                };
            });
            setLastMessages(map);
        } catch (err) { /* silent — endpoint may not be ready */ }
    };

    const fetchStatuses = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/status');
            setAllStatuses(res.data);
        } catch (err) { console.error('fetchStatuses error', err); }
    };

    const handlePostStatus = async () => {
        if (!statusContent || isStatusPosting) return;
        setIsStatusPosting(true);
        try {
            const uid = user?._id || user?.id;
            if (!uid) {
                setIsStatusPosting(false);
                return alert('Profile not loaded. Try again.');
            }

            await axios.post('http://localhost:5000/api/status', {
                userId: uid,
                type: statusType,
                content: statusContent,
                backgroundColor: statusBg
            });
            
            // Expert fix: Close modal BEFORE clearing content to avoid broken image flicker
            setShowStatusModal(false);
            setStatusContent('');
            setStatusType('text'); // Reset to default
            fetchStatuses();
        } catch (err) {
            console.error('postStatus error', err);
            alert('Status upload failed. Ensure the file is not too large.');
        } finally {
            setIsStatusPosting(false);
        }
    };

    const handleStatusFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Simple size safety for videos (Base64 videos are large)
        if (file.type.startsWith('video/') && file.size > 12 * 1024 * 1024) {
            return alert('Video is too large. Please select a clip smaller than 12MB.');
        }

        const isVideo = file.type.startsWith('video/');
        const reader = new FileReader();
        reader.onload = async (ev) => {
            let content = ev.target.result;
            if (!isVideo) {
                // Compress image before setting state
                content = await compressImage(content);
            }
            setStatusContent(content);
            setStatusType(isVideo ? 'video' : 'image');
        };
        reader.readAsDataURL(file);
    };

    const markStatusViewed = async (statusId) => {
        try {
            await axios.post(`http://localhost:5000/api/status/${statusId}/view`, { userId: user.id });
        } catch (err) { console.error(err); }
    };

    const handleDeleteMessage = async (type) => {
        if (!msgToDelete) return;
        try {
            await axios.post(`http://localhost:5000/api/messages/${msgToDelete._id}/delete`, {
                userId: user.id,
                type
            });

            if (type === 'me') {
                setMessages(prev => prev.filter(m => m._id !== msgToDelete._id));
            } else {
                // 'everyone' - socket will handle UI update for both, but update local state immediately
                setMessages(prev => prev.map(m =>
                    m._id === msgToDelete._id ? { ...m, isDeletedForEveryone: true, content: '🚫 This message was deleted', type: 'text' } : m
                ));
                socket.emit('deleteMessage', {
                    messageId: msgToDelete._id,
                    receiver: selectedUser._id,
                    sender: user.id,
                    type: 'everyone'
                });
            }
            setShowDeleteModal(false);
            setMsgToDelete(null);
        } catch (err) { console.error('delete error', err); }
    };

    const handleEditMessage = async (e) => {
        e && e.preventDefault();
        if (!editingMsg || !newMessage.trim()) return;
        try {
            const res = await axios.post(`http://localhost:5000/api/messages/${editingMsg._id}/edit`, {
                content: newMessage.trim()
            });
            socket.emit('editMessage', res.data);
            setEditingMsg(null);
            setNewMessage('');
        } catch (err) { console.error('edit error', err); }
    };

    const handleForwardMessage = async (targetUserId) => {
        if (!forwardingMsg) return;
        try {
            const res = await axios.post('http://localhost:5000/api/messages/forward', {
                sender: user.id,
                receiver: targetUserId,
                content: forwardingMsg.content,
                type: forwardingMsg.type
            });
            socket.emit('forwardMessage', res.data);
            setShowForwardModal(false);
            setForwardingMsg(null);
            alert('Message forwarded!');
        } catch (err) { console.error('forward error', err); }
    };

    const handleStarMessage = async (msg) => {
        try {
            const res = await axios.post(`http://localhost:5000/api/messages/${msg._id}/star`);
            setMessages(prev => prev.map(m => m._id === msg._id ? res.data : m));
            setShowContextMenu(null);
        } catch (err) { console.error('star error', err); }
    };

    const handleCopyMessage = (content) => {
        navigator.clipboard.writeText(content);
        alert('Copied to clipboard!');
        setShowContextMenu(null);
    };

    // Audio Recording Logic
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;
            audioChunksRef.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            recorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = () => {
                    const base64Audio = reader.result;
                    socket.emit('sendMessage', {
                        sender: user.id,
                        receiver: selectedUser._id,
                        content: base64Audio,
                        type: 'audio'
                    });
                };
                stream.getTracks().forEach(track => track.stop());
            };

            recorder.start();
            setIsRecording(true);
            setRecordingTime(0);
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } catch (err) {
            console.error('Microphone access denied', err);
            alert('Please enable microphone access to record audio.');
        }
    };

    const stopRecording = (shouldSend = true) => {
        if (!mediaRecorderRef.current) return;
        mediaRecorderRef.current.stop();
        setIsRecording(false);
        clearInterval(timerRef.current);
        if (!shouldSend) audioChunksRef.current = [];
    };

    const formatDuration = (sec) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    // ── WebRTC Helpers ─────────────────────────────────────────────────

    // Generate ringtone with Web Audio API (no external URL needed)
    const startRingtone = () => {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            ringtoneRef.current.ctx = ctx;
            const playOnce = () => {
                const o1 = ctx.createOscillator();
                const o2 = ctx.createOscillator();
                const gain = ctx.createGain();
                o1.connect(gain); o2.connect(gain); gain.connect(ctx.destination);
                o1.type = 'sine'; o1.frequency.value = 440;
                o2.type = 'sine'; o2.frequency.value = 480;
                gain.gain.setValueAtTime(0, ctx.currentTime);
                gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 0.08);
                gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 0.75);
                gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.0);
                o1.start(ctx.currentTime); o2.start(ctx.currentTime);
                o1.stop(ctx.currentTime + 1.0); o2.stop(ctx.currentTime + 1.0);
            };
            playOnce();
            ringtoneRef.current.interval = setInterval(playOnce, 2200);
        } catch (e) { console.warn('Audio ctx error:', e); }
    };

    const stopRinging = () => {
        try {
            if (ringtoneRef.current.interval) {
                clearInterval(ringtoneRef.current.interval);
                ringtoneRef.current.interval = null;
            }
            if (ringtoneRef.current.ctx) {
                ringtoneRef.current.ctx.close();
                ringtoneRef.current.ctx = null;
            }
        } catch (_) {}
    };

    const cleanupCall = useCallback(() => {
        stopRinging();
        pendingCandidatesRef.current = [];
        if (peerRef.current) { peerRef.current.close(); peerRef.current = null; }
        if (localStream) { localStream.getTracks().forEach(t => t.stop()); }
        setLocalStream(null);
        setRemoteStream(null);
        setCallStatus('idle');
        setIncomingCall(null);
    }, [localStream]);

    const getMedia = async (type) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: type === 'video'
            });
            return stream;
        } catch (err) {
            alert('Camera/microphone permission denied. Please allow access.');
            console.error('getUserMedia error:', err);
            return null;
        }
    };

    const createPeer = (stream, remoteId) => {
        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' }
            ]
        });
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
        pc.onicecandidate = (e) => {
            if (e.candidate) socket.emit('iceCandidate', { to: remoteId, candidate: e.candidate });
        };
        pc.ontrack = (e) => { setRemoteStream(e.streams[0]); };
        return pc;
    };

    // Flush any ICE candidates that arrived before setRemoteDescription
    const flushPendingCandidates = async (pc) => {
        for (const c of pendingCandidatesRef.current) {
            try { await pc.addIceCandidate(new RTCIceCandidate(c)); }
            catch (e) { console.warn('Flushing ICE error:', e); }
        }
        pendingCandidatesRef.current = [];
    };

    // Initiate a call
    const initiateCall = async (type) => {
        if (!selectedUser) return;
        const stream = await getMedia(type);
        if (!stream) return;

        setLocalStream(stream);
        setCallType(type);
        setCallStatus('calling');
        pendingCandidatesRef.current = [];
        startRingtone();

        const pc = createPeer(stream, selectedUser._id);
        peerRef.current = pc;

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit('callUser', {
            to: selectedUser._id,
            from: user.id,
            fromName: user.username,
            signal: offer,
            callType: type
        });
    };

    // Accept incoming call
    const answerCall = async (type) => {
        if (!incomingCall) return;
        stopRinging();

        const resolvedType = type || incomingCall.callType;
        const stream = await getMedia(resolvedType);
        if (!stream) return;

        setLocalStream(stream);
        setCallType(incomingCall.callType);
        setCallStatus('active');

        const pc = createPeer(stream, incomingCall.from);
        peerRef.current = pc;

        await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.signal));
        // Flush ICE candidates that arrived before this point
        await flushPendingCandidates(pc);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('answerCall', { to: incomingCall.from, signal: answer });
        setIncomingCall(null);
    };

    // Reject incoming call
    const rejectCall = () => {
        if (!incomingCall) return;
        stopRinging();
        socket.emit('rejectCall', { to: incomingCall.from });
        setIncomingCall(null);
        setCallStatus('idle');
    };

    // End active call
    const endCall = () => {
        const other = selectedUserRef2.current;
        if (other) socket.emit('endCall', { to: other._id });
        cleanupCall();
    };
    // ──────────────────────────────────────────────────────────────────

    // ── Socket listeners for calling ───────────────────────────────
    useEffect(() => {
        const onIncomingCall = (data) => {
            pendingCandidatesRef.current = []; // reset for new call
            setIncomingCall(data);
            setCallStatus('ringing');
            startRingtone(); // Web Audio ringtone — works with no network
        };

        const onCallAccepted = async ({ signal }) => {
            stopRinging();
            if (peerRef.current) {
                await peerRef.current.setRemoteDescription(new RTCSessionDescription(signal));
                // Flush ICE candidates queued before remote description was set
                await flushPendingCandidates(peerRef.current);
                setCallStatus('active');
            }
        };

        const onIceCandidate = async ({ candidate }) => {
            if (!candidate) return;
            // If peer not ready or no remote description yet — queue the candidate
            if (!peerRef.current || !peerRef.current.remoteDescription) {
                pendingCandidatesRef.current.push(candidate);
                return;
            }
            try { await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate)); }
            catch (e) { console.warn('ICE add error:', e); }
        };

        const onCallEnded = () => cleanupCall();
        const onCallRejected = () => { cleanupCall(); alert('📵 Call was declined.'); };

        socket.on('incomingCall', onIncomingCall);
        socket.on('callAccepted', onCallAccepted);
        socket.on('iceCandidate', onIceCandidate);
        socket.on('callEnded', onCallEnded);
        socket.on('callRejected', onCallRejected);

        return () => {
            socket.off('incomingCall', onIncomingCall);
            socket.off('callAccepted', onCallAccepted);
            socket.off('iceCandidate', onIceCandidate);
            socket.off('callEnded', onCallEnded);
            socket.off('callRejected', onCallRejected);
        };
    }, [cleanupCall]);
    // ──────────────────────────────────────────────────────────────────

    // Real-time incoming messages
    useEffect(() => {
        const handler = (message) => {
            const su = selectedUserRef.current;
            const isCurrent =
                (String(message.sender) === String(su?._id) && String(message.receiver) === String(user.id)) ||
                (String(message.sender) === String(user.id) && String(message.receiver) === String(su?._id));

            if (isCurrent) {
                setMessages(prev => {
                    // Prevent duplicate messages in the UI
                    if (message._id && prev.find(m => m._id === message._id)) return prev;
                    return [...prev, message];
                });
            } else {
                // Not selected? Increment unread count
                const senderId = String(message.sender);
                if (senderId !== String(user.id)) {
                    setUnreadCounts(prev => ({ ...prev, [senderId]: (prev[senderId] || 0) + 1 }));
                }
            }

            // Always update sidebar last message
            const otherId = String(message.sender) === String(user.id)
                ? String(message.receiver)
                : String(message.sender);
            setLastMessages(prev => ({
                ...prev,
                [otherId]: { content: message.content, timestamp: message.timestamp || new Date() }
            }));
        };

        socket.on('receiveMessage', handler);

        const deleteHandler = ({ messageId, type }) => {
            if (type === 'everyone') {
                setMessages(prev => prev.map(m =>
                    m._id === messageId ? { ...m, isDeletedForEveryone: true, content: '🚫 This message was deleted', type: 'text' } : m
                ));
            }
        };

        const editHandler = (updatedMsg) => {
            setMessages(prev => prev.map(m => m._id === updatedMsg._id ? updatedMsg : m));
        };

        socket.on('messageDeleted', deleteHandler);
        socket.on('messageEdited', editHandler);

        return () => {
            socket.off('receiveMessage', handler);
            socket.off('messageDeleted', deleteHandler);
            socket.off('messageEdited', editHandler);
        };
    }, [user]);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Close emoji picker on outside click
    useEffect(() => {
        const onClick = (e) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
                setShowEmojiPicker(false);
            }
            // Close other menus on click
            setSidebarContextMenu(null);
            setShowHeaderMenu(false);
        };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, []);

    // Load chat history from DB
    const handleSelectUser = async (otherUser) => {
        setSelectedUser(otherUser);
        setUnreadCounts(prev => ({ ...prev, [String(otherUser._id)]: 0 }));
        setShowEmojiPicker(false);
        setAttachPreview(null);
        setNewMessage('');
        setSidebarContextMenu(null);
        setShowHeaderMenu(false);
        try {
            const res = await axios.get(`http://localhost:5000/api/messages/${user.id}/${otherUser._id}`);
            setMessages(res.data);
        } catch (err) { console.error('fetchMessages error', err); }
    };

    const handleDeleteChat = async (otherUserId) => {
        if (!window.confirm('Are you sure you want to delete this chat? This cannot be undone.')) return;
        try {
            await axios.delete(`http://localhost:5000/api/messages/chat/${user.id}/${otherUserId}`);
            
            // Update local state
            if (selectedUser?._id === otherUserId) {
                setSelectedUser(null);
                setMessages([]);
            }
            
            setLastMessages(prev => {
                const newMap = { ...prev };
                delete newMap[otherUserId];
                return newMap;
            });

            // Refresh sidebar last message data to reflect deleted conversation state
            fetchLastMessages();

            setUnreadCounts(prev => {
                const newCounts = { ...prev };
                delete newCounts[otherUserId];
                return newCounts;
            });

            setSidebarContextMenu(null);
            setShowHeaderMenu(false);
            alert('Chat deleted successfully.');
        } catch (err) {
            console.error('deleteChat error', err);
            alert('Failed to delete chat.');
        }
    };

    const handleSendMessage = (e) => {
        e && e.preventDefault();
        const content = newMessage.trim();
        if (!content || !selectedUser) return;

        const isImage = !!attachPreview?.isImage;
        const type = isImage ? 'image' : (attachPreview ? 'file' : 'text');

        socket.emit('sendMessage', {
            sender: user.id,
            receiver: selectedUser._id,
            content,
            type
        });
        setNewMessage('');
        setAttachPreview(null);
        setShowEmojiPicker(false);
    };

    const handleEmojiClick = (emojiData) => setNewMessage(prev => prev + emojiData.emoji);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const isImage = file.type.startsWith('image/');
        const reader = new FileReader();
        reader.onload = (ev) => {
            setAttachPreview({ name: file.name, url: ev.target.result, isImage });
            setNewMessage(`[File: ${file.name}]`);
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const filteredUsers = users.filter(u =>
        u.username.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div style={s.app}>
            {/* ── SIDEBAR ── */}
            <div style={s.sidebar}>
                <div style={s.sidebarHeader}>
                    <img src={getAvatar(user.username)} alt="me" style={s.avatar40} />
                    <span style={s.myName}>{user.username}</span>
                    <button onClick={logout} title="Logout" style={s.iconBtn}><LogOut size={20} color="#54656f" /></button>
                </div>

                <div style={s.searchWrap}>
                    <div style={s.searchBar}>
                        <Search size={16} color="#54656f" />
                        <input
                            style={s.searchInput}
                            placeholder="Search or start new chat"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Status Bar */}
                <div style={s.statusContainer}>
                    <div style={s.statusList}>
                        {/* My Status */}
                        {(() => {
                            const myId = user?._id || user?.id;
                            const hasMyStatus = allStatuses.some(st => st.user?._id === myId);
                            return (
                                <div style={s.statusItem}>
                                    <div 
                                        style={{ ...s.myStatusCircle, borderColor: hasMyStatus ? '#00a884' : '#d1d7db', cursor: 'pointer' }}
                                        onClick={() => hasMyStatus ? setViewingStatusUser(myId) : setShowStatusModal(true)}
                                    >
                                        <img src={getAvatar(user.username)} style={s.statusImg} alt="me" />
                                        <div 
                                            style={s.addStatusBtn} 
                                            onClick={(e) => { e.stopPropagation(); setShowStatusModal(true); }}
                                        >
                                            <Plus size={14} color="#fff" />
                                        </div>
                                    </div>
                                    <span style={s.statusName}>My Status</span>
                                </div>
                            );
                        })()}
                        {/* Group statuses by user */}
                        {Array.from(new Set(allStatuses.map(s => s.user?._id))).map(uid => {
                            const userStatus = allStatuses.find(st => st.user?._id === uid);
                            if (!userStatus || uid === user.id) return null;
                            const hasNew = !userStatus.views?.includes(user.id);
                            return (
                                <div key={uid} style={s.statusItem} onClick={() => setViewingStatusUser(uid)}>
                                    <div style={{ ...s.statusCircle, borderColor: hasNew ? '#00a884' : '#d1d7db' }}>
                                        <img src={getAvatar(userStatus.user?.username)} style={s.statusImg} alt="status" />
                                    </div>
                                    <span style={s.statusName}>{userStatus.user?.username}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div style={s.chatList}>
                    {filteredUsers.length === 0 && (
                        <p style={s.noUsers}>No other users yet. Open an incognito window and register another account.</p>
                    )}
                    {filteredUsers.map(u => {
                        const lm = lastMessages[String(u._id)];
                        return (
                            <div
                                key={u._id}
                                onClick={() => handleSelectUser(u)}
                                onContextMenu={(e) => {
                                    e.preventDefault();
                                    setSidebarContextMenu({ x: e.pageX, y: e.pageY, user: u });
                                }}
                                style={{
                                    ...s.chatItem,
                                    background: selectedUser?._id === u._id ? '#f0f2f5' : 'transparent',
                                    position: 'relative'
                                }}
                            >
                                <img src={getAvatar(u.username)} alt={u.username} style={s.avatar48} />
                                <div style={s.chatMeta}>
                                    <div style={s.chatRow}>
                                        <span style={s.chatName}>{u.username}</span>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                            <span style={s.chatTime}>{lm ? formatTime(lm.timestamp) : ''}</span>
                                            {unreadCounts[String(u._id)] > 0 && (
                                                <div style={s.unreadBadge}>{unreadCounts[String(u._id)]}</div>
                                            )}
                                        </div>
                                    </div>
                                    <span style={s.lastMsg}>
                                        {lm ? lm.content : (u.status || 'Hey there! I am using WhatsApp.')}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── CHAT WINDOW ── */}
            <div style={s.chatWindow}>
                {selectedUser ? (
                    <>
                        {/* Header */}
                        <div style={s.chatHeader}>
                            <div style={s.chatHeaderLeft}>
                                <img src={getAvatar(selectedUser.username)} alt={selectedUser.username} style={s.avatar40} />
                                <div>
                                    <h3 style={s.selectedName}>{selectedUser.username}</h3>
                                    <span style={s.online}>Online</span>
                                </div>
                            </div>
                            <div style={s.headerRight}>
                                <button
                                    style={s.iconBtn}
                                    title="Voice Call"
                                    onClick={() => initiateCall('audio')}
                                >
                                    <Phone size={20} color="#54656f" />
                                </button>
                                <button
                                    style={s.iconBtn}
                                    title="Video Call"
                                    onClick={() => initiateCall('video')}
                                >
                                    <Video size={20} color="#54656f" />
                                </button>
                                <Search size={20} color="#54656f" />
                                <div style={{ position: 'relative' }}>
                                    <button style={s.iconBtn} onClick={(e) => { e.stopPropagation(); setShowHeaderMenu(!showHeaderMenu); }}>
                                        <MoreVertical size={20} color="#54656f" />
                                    </button>
                                    {showHeaderMenu && (
                                        <div style={{ ...s.contextMenu, right: 0, top: '40px', width: '180px' }}>
                                            <div style={s.menuItem} onClick={() => alert('Contact Info')}>
                                                <Info size={16} /> Contact Info
                                            </div>
                                            <div style={s.menuItem} onClick={() => alert('Mute Notifications')}>
                                                <Volume2 size={16} /> Mute Notifications
                                            </div>
                                            <div style={{ ...s.menuItem, color: '#ef4444' }} onClick={() => handleDeleteChat(selectedUser._id)}>
                                                <Trash2 size={16} /> Delete Chat
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Messages */}
                        <div style={s.messagesArea}>
                            {messages.length === 0 && (
                                <div style={s.noMessages}>No messages yet. Say hi! 👋</div>
                            )}
                            {messages.map((msg, i) => {
                                const isMine = String(msg.sender) === String(user.id);
                                return (
                                    <div key={msg._id || i} style={{ ...s.msgRow, justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                                        {!isMine && <img src={getAvatar(selectedUser.username)} style={s.msgAvatar} alt="" />}
                                        <div style={{
                                            ...s.bubble,
                                            background: isMine ? '#d9fdd3' : '#fff',
                                            borderRadius: isMine ? '8px 0 8px 8px' : '0 8px 8px 8px',
                                            position: 'relative',
                                            group: 'true'
                                        }} className="msg-bubble">
                                            {/* Forwarded Tag */}
                                            {msg.isForwarded && (
                                                <div style={{ fontSize: '11px', color: '#8696a0', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', fontStyle: 'italic' }}>
                                                    <Forward size={12} /> Forwarded
                                                </div>
                                            )}

                                            {!msg.isDeletedForEveryone && (
                                                <div className="msg-dropdown" style={s.msgDropdown} onClick={() => setShowContextMenu(p => p === msg._id ? null : msg._id)}>
                                                    <ChevronDown size={16} color="#8696a0" />
                                                </div>
                                            )}

                                            {/* Context Menu Popup */}
                                            {showContextMenu === msg._id && (
                                                <div style={{ ...s.contextMenu, left: isMine ? 'auto' : '100%', right: isMine ? '10px' : 'auto' }}>
                                                    <div style={s.menuItem} onClick={() => { setInfoMsg(msg); setShowContextMenu(null); }}>
                                                        <Info size={16} /> Info
                                                    </div>
                                                    <div style={s.menuItem} onClick={() => handleCopyMessage(msg.content)}>
                                                        <Copy size={16} /> Copy
                                                    </div>
                                                    {isMine && (Date.now() - new Date(msg.timestamp) < 15 * 60 * 1000) && (
                                                        <div style={s.menuItem} onClick={() => { setEditingMsg(msg); setNewMessage(msg.content); setShowContextMenu(null); }}>
                                                            <Edit size={16} /> Edit
                                                        </div>
                                                    )}
                                                    <div style={s.menuItem} onClick={() => { setForwardingMsg(msg); setShowForwardModal(true); setShowContextMenu(null); }}>
                                                        <Forward size={16} /> Forward
                                                    </div>
                                                    <div style={s.menuItem} onClick={() => handleStarMessage(msg)}>
                                                        <Star size={16} fill={msg.isStarred ? "#ff9800" : "none"} color={msg.isStarred ? "#ff9800" : "currentColor"} /> {msg.isStarred ? 'Unstar' : 'Star'}
                                                    </div>
                                                    <div style={{ ...s.menuItem, color: '#ef4444' }} onClick={() => { setMsgToDelete(msg); setShowDeleteModal(true); setShowContextMenu(null); }}>
                                                        <Trash2 size={16} /> Delete
                                                    </div>
                                                </div>
                                            )}

                                            {msg.isDeletedForEveryone ? (
                                                <p style={{ ...s.msgText, fontStyle: 'italic', color: '#8696a0' }}>{msg.content}</p>
                                            ) : (
                                                <>
                                                    {msg.type === 'image' ? (
                                                        <img src={msg.content} alt="sent" style={s.msgImage} />
                                                    ) : msg.type === 'audio' ? (
                                                        <audio src={msg.content} controls style={s.audioPlayer} />
                                                    ) : (
                                                        <p style={s.msgText}>{msg.content}</p>
                                                    )}
                                                </>
                                            )}
                                            <div style={s.msgMeta}>
                                                {msg.isStarred && <Star size={10} color="#ff9800" fill="#ff9800" style={{ marginRight: '4px' }} />}
                                                {msg.isEdited && <span style={{ fontSize: '10px', color: '#8696a0', marginRight: '4px' }}>Edited</span>}
                                                <span style={s.msgTime}>{formatTime(msg.timestamp)}</span>
                                                {isMine && <CheckCheck size={14} color="#53bdeb" />}
                                            </div>
                                        </div>
                                        {isMine && <img src={getAvatar(user.username)} style={s.msgAvatar} alt="" />}
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Attach Preview */}
                        {attachPreview && (
                            <div style={s.previewBar}>
                                {attachPreview.isImage
                                    ? <img src={attachPreview.url} alt="preview" style={s.previewImg} />
                                    : <div style={s.fileChip}><File size={20} />{attachPreview.name}</div>
                                }
                                <button style={s.iconBtn} onClick={() => { setAttachPreview(null); setNewMessage(''); }}>
                                    <X size={16} color="#667781" />
                                </button>
                            </div>
                        )}

                        {/* Emoji Picker */}
                        {showEmojiPicker && (
                            <div ref={emojiPickerRef} style={s.emojiWrap}>
                                <EmojiPicker onEmojiClick={handleEmojiClick} width={350} height={400} theme="light" />
                            </div>
                        )}

                        {/* Input Bar */}
                        <form style={s.inputBar} onSubmit={editingMsg ? handleEditMessage : handleSendMessage}>
                            {isRecording ? (
                                <div style={s.recordingBar}>
                                    <div style={s.recordingPulse} />
                                    <span style={s.recordingTimer}>{formatDuration(recordingTime)} Recording...</span>
                                    <button type="button" style={s.iconBtn} onClick={() => stopRecording(false)}>
                                        <Trash2 size={24} color="#ef4444" />
                                    </button>
                                    <button type="button" style={s.iconBtn} onClick={() => stopRecording(true)}>
                                        <Square size={24} color="#008069" />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {editingMsg ? (
                                        <div style={{ display: 'flex', alignItems: 'center', flex: 1, gap: '10px' }}>
                                            <button type="button" style={s.iconBtn} onClick={() => { setEditingMsg(null); setNewMessage(''); }}><X color="#ef4444" /></button>
                                            <input
                                                style={{ ...s.msgInput, background: '#e1fad7' }}
                                                value={newMessage}
                                                onChange={e => setNewMessage(e.target.value)}
                                            />
                                            <button type="submit" style={s.iconBtn}><CheckCheck color="#008069" /></button>
                                        </div>
                                    ) : (
                                        <>
                                            <button type="button" style={s.iconBtn} onClick={() => setShowEmojiPicker(p => !p)}>
                                                <Smile size={24} color={showEmojiPicker ? '#008069' : '#54656f'} />
                                            </button>
                                            <button type="button" style={s.iconBtn} onClick={() => fileInputRef.current.click()}>
                                                <Paperclip size={24} color="#54656f" />
                                            </button>
                                            <input
                                                ref={fileInputRef} type="file"
                                                accept="image/*,.pdf,.doc,.docx,.txt"
                                                style={{ display: 'none' }}
                                                onChange={handleFileChange}
                                            />
                                            <input
                                                style={s.msgInput}
                                                placeholder="Type a message"
                                                value={newMessage}
                                                onChange={e => setNewMessage(e.target.value)}
                                                onKeyDown={e => {
                                                    // Only handle actual line breaks with Shift+Enter if needed, 
                                                    // but for standard text input, Enter alone triggers form submit.
                                                    if (e.key === 'Enter' && e.shiftKey) {
                                                        // Handle shift+enter if this were a textarea, but it's an input
                                                    }
                                                }}
                                            />
                                            {newMessage.trim() || attachPreview ? (
                                                <button type="submit" style={s.iconBtn}>
                                                    <Send size={24} color="#008069" />
                                                </button>
                                            ) : (
                                                <button type="button" style={s.iconBtn} onClick={startRecording}>
                                                    <Mic size={24} color="#54656f" />
                                                </button>
                                            )}
                                        </>
                                    )}
                                </>
                            )}
                        </form>
                    </>
                ) : (
                    <div style={s.emptyState}>
                        <MessageSquare size={80} color="#e9edef" strokeWidth={1} />
                        <h2 style={s.emptyTitle}>WhatsApp Web Clone</h2>
                        <p style={s.emptyText}>Select a contact on the left to start chatting.</p>
                        <span style={s.encrypted}><Shield size={12} /> &nbsp;End-to-end encrypted</span>
                    </div>
                )}

                {/* Sidebar Context Menu */}
                {sidebarContextMenu && (
                    <div style={{
                        ...s.contextMenu,
                        position: 'fixed',
                        left: sidebarContextMenu.x,
                        top: sidebarContextMenu.y,
                        zIndex: 3000,
                        width: '180px'
                    }}>
                        <div style={s.menuItem} onClick={() => handleSelectUser(sidebarContextMenu.user)}>
                            <MessageSquare size={16} /> Open Chat
                        </div>
                        <div style={s.menuItem} onClick={() => alert('Mute Chat')}>
                            <Volume2 size={16} /> Mute Notifications
                        </div>
                        <div style={{ ...s.menuItem, color: '#ef4444' }} onClick={() => handleDeleteChat(sidebarContextMenu.user._id)}>
                            <Trash2 size={16} /> Delete Chat
                        </div>
                    </div>
                )}
            </div>

            {/* ── STATUS POST MODAL ── */}
            {showStatusModal && (
                <div style={s.statusModal}>
                    <div style={s.statusInputWrap}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0 }}>Create Status</h3>
                            <button style={s.iconBtn} onClick={() => { setShowStatusModal(false); setStatusContent(''); setStatusType('text'); }}><X /></button>
                        </div>

                        {statusType === 'text' ? (
                            <div style={{ ...s.statusPreview, background: statusBg }}>
                                <textarea
                                    style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '24px', textAlign: 'center', width: '100%', height: '100%', outline: 'none', resize: 'none' }}
                                    placeholder="Type a status"
                                    value={statusContent}
                                    onChange={e => setStatusContent(e.target.value)}
                                />
                            </div>
                        ) : statusType === 'image' ? (
                            <div style={s.statusPreview}>
                                <img src={statusContent} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="preview" />
                            </div>
                        ) : (
                            <div style={s.statusPreview}>
                                <video src={statusContent} style={{ width: '100%', height: '100%', objectFit: 'contain' }} controls />
                            </div>
                        )}

                        <div style={s.colorPicker}>
                            {['#008069', '#9c27b0', '#f44336', '#2196f3', '#ff9800'].map(c => (
                                <div key={c} onClick={() => { 
                                    setStatusBg(c); 
                                    if (statusType !== 'image' && statusType !== 'video') setStatusType('text'); 
                                }} style={{ ...s.colorCircle, background: c, transform: statusBg === c ? 'scale(1.2)' : 'none' }} />
                            ))}
                            <button style={s.iconBtn} onClick={() => document.getElementById('statusImgInput').click()}>
                                <Paperclip size={20} color="#54656f" />
                            </button>
                            <input id="statusImgInput" type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={handleStatusFileChange} />
                        </div>

                        <button 
                            style={{ ...s.statusPostBtn, opacity: isStatusPosting ? 0.7 : 1, cursor: isStatusPosting ? 'not-allowed' : 'pointer' }} 
                            onClick={handlePostStatus}
                            disabled={isStatusPosting}
                        >
                            {isStatusPosting ? 'Posting...' : 'Post Status'}
                        </button>
                    </div>
                </div>
            )}

            {/* ── STATUS VIEWER ── */}
            {viewingStatusUser && (() => {
                const userStatuses = allStatuses.filter(st => st.user?._id === viewingStatusUser);
                const currentUserStatus = userStatuses[userStatuses.length - 1]; // View latest
                if (!currentUserStatus) return null;

                return (
                    <div style={s.statusViewer}>
                        <div style={s.viewerHeader}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <img src={getAvatar(currentUserStatus.user?.username)} style={s.avatar40} alt="" />
                                <div>
                                    <div style={{ fontWeight: '500' }}>{currentUserStatus.user?.username}</div>
                                    <div style={{ fontSize: '12px', opacity: 0.8 }}>{new Date(currentUserStatus.createdAt).toLocaleTimeString()}</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {String(currentUserStatus.user?._id) === String(user.id) && (
                                    <button style={{ ...s.iconBtn, color: '#fff' }} onClick={async () => {
                                        if (window.confirm('Delete this status?')) {
                                            await axios.delete(`http://localhost:5000/api/status/${currentUserStatus._id}`);
                                            setViewingStatusUser(null);
                                            fetchStatuses();
                                        }
                                    }}>
                                        <Trash2 size={24} />
                                    </button>
                                )}
                                <button style={{ ...s.iconBtn, color: '#fff' }} onClick={() => {
                                    markStatusViewed(currentUserStatus._id);
                                    setViewingStatusUser(null);
                                    fetchStatuses();
                                }}><X size={30} /></button>
                            </div>
                        </div>

                        <div style={s.viewerContent}>
                            {currentUserStatus.type === 'text' ? (
                                <div style={{ ...s.viewerText, background: currentUserStatus.backgroundColor, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {currentUserStatus.content}
                                </div>
                            ) : currentUserStatus.type === 'image' ? (
                                <img src={currentUserStatus.content} style={s.viewerImg} alt="status" />
                            ) : (
                                <video src={currentUserStatus.content} style={s.viewerImg} autoPlay loop muted playsInline />
                            )}
                        </div>

                        <div style={s.viewerFooter}>
                            {String(currentUserStatus.user?._id) === String(user.id) ? (
                                <div style={s.viewerStats}>
                                    <Volume2 size={16} />
                                    <span>Views: {currentUserStatus.views?.length || 0}</span>
                                    {currentUserStatus.views?.length > 0 && (
                                        <div style={s.viewersPop}>
                                            <div style={{ fontWeight: 'bold', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '4px' }}>Viewed by</div>
                                            {currentUserStatus.views.map(v => (
                                                <div key={v._id} style={{ fontSize: '12px', padding: '2px 0' }}>{v.username}</div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                "End-to-end encrypted"
                            )}
                        </div>
                    </div>
                );
            })()}

            {/* ── FORWARD MODAL ── */}
            {showForwardModal && (
                <div style={s.statusModal}>
                    <div style={{ ...s.statusInputWrap, maxWidth: '350px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0 }}>Forward to...</h3>
                            <button style={s.iconBtn} onClick={() => setShowForwardModal(false)}><X /></button>
                        </div>
                        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            {users.map(u => (
                                <div key={u._id} style={{ ...s.chatItem, border: 'none' }} onClick={() => handleForwardMessage(u._id)}>
                                    <img src={getAvatar(u.username)} style={s.avatar40} alt="" />
                                    <span>{u.username}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ── MESSAGE INFO MODAL ── */}
            {infoMsg && (
                <div style={s.statusModal}>
                    <div style={{ ...s.statusInputWrap, maxWidth: '350px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0 }}>Message Info</h3>
                            <button style={s.iconBtn} onClick={() => setInfoMsg(null)}><X /></button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#667781' }}>Sent</span>
                                <span style={{ color: '#111b21' }}>{new Date(infoMsg.timestamp).toLocaleString()}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#667781' }}>Status</span>
                                <span style={{ color: '#53bdeb' }}>{infoMsg.isRead ? 'Read' : 'Delivered'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#667781' }}>Type</span>
                                <span style={{ color: '#111b21' }}>{infoMsg.type}</span>
                            </div>
                            {infoMsg.isEdited && <div style={{ color: '#00a884', fontSize: '13px' }}>Edited message</div>}
                        </div>
                    </div>
                </div>
            )}

            {/* ── DELETE MESSAGE MODAL ── */}
            {showDeleteModal && (
                <div style={s.statusModal}>
                    <div style={s.statusInputWrap}>
                        <h3 style={{ margin: 0, fontSize: '18px', color: '#111b21' }}>Delete message?</h3>
                        <p style={{ margin: 0, fontSize: '14px', color: '#667781' }}>Are you sure you want to delete this message?</p>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                            {/* Logic: Only show "Delete for everyone" if sender is ME and within 48h */}
                            {msgToDelete && String(msgToDelete.sender) === String(user.id) && 
                             ((new Date() - new Date(msgToDelete.timestamp)) / 3600000 < 48) && (
                                <button style={s.deleteBtn} onClick={() => handleDeleteMessage('everyone')}>
                                    Delete for everyone
                                </button>
                            )}
                            
                            <button style={s.deleteBtn} onClick={() => handleDeleteMessage('me')}>
                                Delete for me
                            </button>
                            
                            <button style={{ ...s.deleteBtn, color: '#00a884' }} onClick={() => { setShowDeleteModal(false); setMsgToDelete(null); }}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── CALL OVERLAYS ── */}
            {callStatus === 'ringing' && incomingCall && (
                <IncomingCallOverlay
                    callInfo={incomingCall}
                    onAccept={answerCall}
                    onReject={rejectCall}
                />
            )}

            {(callStatus === 'calling' || callStatus === 'active') && (
                <ActiveCallOverlay
                    callType={callType}
                    callerName={selectedUser?.username || ''}
                    localStream={localStream}
                    remoteStream={remoteStream}
                    onEndCall={endCall}
                    isCalling={callStatus === 'calling'}
                />
            )}
        </div>
    );
};

const s = {
    app: { display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' },

    // sidebar
    sidebar: { width: '380px', display: 'flex', flexDirection: 'column', background: '#fff', borderRight: '1px solid #d1d7db' },
    sidebarHeader: { height: '60px', background: '#f0f2f5', display: 'flex', alignItems: 'center', gap: '10px', padding: '0 16px' },
    myName: { flex: 1, fontWeight: '500', fontSize: '15px', color: '#111b21' },
    searchWrap: { padding: '8px 12px', borderBottom: '1px solid #f0f2f5' },
    searchBar: { background: '#f0f2f5', borderRadius: '8px', padding: '7px 12px', display: 'flex', alignItems: 'center', gap: '10px' },
    searchInput: { background: 'transparent', flex: 1, fontSize: '14px', color: '#111b21' },
    chatList: { flex: 1, overflowY: 'auto' },
    noUsers: { padding: '20px 16px', fontSize: '13px', color: '#667781', textAlign: 'center' },
    chatItem: { display: 'flex', gap: '12px', padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid #f0f2f5', transition: 'background .15s' },
    chatMeta: { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', overflow: 'hidden' },
    chatRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '3px' },
    chatName: { fontSize: '16px', color: '#111b21' },
    chatTime: { fontSize: '12px', color: '#667781', whiteSpace: 'nowrap' },
    lastMsg: { fontSize: '13px', color: '#667781', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },

    // chat window
    chatWindow: { flex: 1, display: 'flex', flexDirection: 'column', background: '#efeae2' },
    chatHeader: { height: '60px', background: '#f0f2f5', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', flexShrink: 0 },
    chatHeaderLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
    selectedName: { fontSize: '16px', fontWeight: '500', color: '#111b21' },
    online: { fontSize: '12px', color: '#008069' },
    headerRight: { display: 'flex', gap: '20px', alignItems: 'center' },

    messagesArea: {
        flex: 1, overflowY: 'auto', padding: '16px 60px', display: 'flex', flexDirection: 'column', gap: '4px',
        backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")',
        backgroundAttachment: 'fixed'
    },
    noMessages: { textAlign: 'center', color: '#667781', fontSize: '13px', marginTop: '20px', background: 'rgba(255,255,255,0.7)', padding: '8px 16px', borderRadius: '8px', alignSelf: 'center' },
    msgRow: { display: 'flex', alignItems: 'flex-end', gap: '6px' },
    msgAvatar: { width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0 },
    bubble: { maxWidth: '60%', padding: '6px 9px 5px', boxShadow: '0 1px .5px rgba(11,20,26,.13)' },
    msgText: { fontSize: '14.2px', lineHeight: '19px', color: '#111b21', wordBreak: 'break-word' },
    msgMeta: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '3px', marginTop: '2px' },
    msgTime: { fontSize: '11px', color: '#667781' },

    previewBar: { background: '#f0f2f5', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '12px', borderTop: '1px solid #d1d7db', flexShrink: 0 },
    previewImg: { height: '60px', borderRadius: '4px', objectFit: 'cover' },
    fileChip: { display: 'flex', alignItems: 'center', gap: '8px', color: '#667781', fontSize: '14px' },

    emojiWrap: { position: 'absolute', bottom: '70px', left: '390px', zIndex: 100, boxShadow: '0 4px 20px rgba(0,0,0,.15)', borderRadius: '12px', overflow: 'hidden' },

    inputBar: { height: '62px', background: '#f0f2f5', display: 'flex', alignItems: 'center', padding: '0 16px', gap: '12px', flexShrink: 0 },
    msgInput: { flex: 1, background: '#fff', borderRadius: '8px', padding: '9px 12px', fontSize: '15px', color: '#111b21' },
    iconBtn: { background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px', flexShrink: 0 },

    emptyState: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', background: '#f8f9fa', borderBottom: '6px solid #25d366' },
    emptyTitle: { fontSize: '32px', fontWeight: '300', color: '#41525d' },
    emptyText: { fontSize: '14px', color: '#667781' },
    encrypted: { fontSize: '13px', color: '#8696a0', display: 'flex', alignItems: 'center' },

    avatar40: { width: '40px', height: '40px', borderRadius: '50%' },
    avatar48: { width: '48px', height: '48px', borderRadius: '50%', flexShrink: 0 },

    // Status Styles
    statusContainer: { padding: '10px 16px', background: '#fff', borderBottom: '1px solid #f0f2f5' },
    statusList: { display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '5px' },
    statusItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer', minWidth: '65px' },
    myStatusCircle: { position: 'relative', width: '50px', height: '50px', borderRadius: '50%', padding: '2px', border: '2px solid #d1d7db' },
    statusCircle: { width: '50px', height: '50px', borderRadius: '50%', padding: '2px', border: '2px solid' },
    statusImg: { width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' },
    addStatusBtn: { position: 'absolute', bottom: '0', right: '0', background: '#00a884', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff' },
    statusName: { fontSize: '12px', color: '#111b21', width: '60px', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },

    // Status Modal & Viewer
    statusModal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
    statusInputWrap: { background: '#fff', padding: '24px', borderRadius: '12px', width: '90%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '16px' },
    statusPreview: { width: '100%', height: '200px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '20px', textAlign: 'center', padding: '20px', fontWeight: '500' },
    colorPicker: { display: 'flex', gap: '10px', justifyContent: 'center' },
    colorCircle: { width: '24px', height: '24px', borderRadius: '50%', cursor: 'pointer', border: '2px solid #fff' },
    statusPostBtn: { background: '#00a884', color: '#fff', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },

    statusViewer: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: '#000', zIndex: 2000, display: 'flex', flexDirection: 'column' },
    viewerHeader: { height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', color: '#fff', background: 'rgba(0,0,0,0.3)' },
    viewerContent: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' },
    viewerText: { fontSize: '32px', color: '#fff', textAlign: 'center', padding: '40px', maxWidth: '800px' },
    viewerImg: { maxHeight: '80%', maxWidth: '90%', objectFit: 'contain' },
    viewerFooter: { height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.7)', fontSize: '14px' },
    progressBar: { position: 'absolute', top: 0, left: 0, height: '4px', background: '#fff', transition: 'width 0.1s linear' },

    msgImage: { maxWidth: '100%', borderRadius: '8px', marginTop: '4px', cursor: 'pointer' },
    audioPlayer: { height: '32px', marginTop: '4px', maxWidth: '220px' },
    viewerStats: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', position: 'relative', padding: '6px 16px', borderRadius: '20px', background: 'rgba(255,255,255,0.15)' },
    viewersPop: { position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', background: 'rgba(37, 52, 63, 0.95)', padding: '12px', borderRadius: '12px', width: '200px', maxHeight: '300px', overflowY: 'auto', color: '#fff', textAlign: 'left', marginBottom: '10px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)' },

    msgDropdown: {
        position: 'absolute',
        top: '2px',
        right: '2px',
        cursor: 'pointer',
        opacity: 0,
        transition: 'all 0.2s',
        zIndex: 5,
        padding: '3px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },

    recordingBar: { flex: 1, display: 'flex', alignItems: 'center', gap: '20px', padding: '0 10px' },
    recordingTimer: { flex: 1, fontSize: '15px', color: '#111b21', fontWeight: '500' },
    recordingPulse: { width: '10px', height: '10px', background: '#ef4444', borderRadius: '50%', animation: 'pulse 1s infinite' },

    deleteBtn: { background: 'none', border: 'none', padding: '12px', fontSize: '14px', fontWeight: '500', color: '#ef4444', textAlign: 'left', cursor: 'pointer', borderBottom: '1px solid #f0f2f5' },

    contextMenu: { position: 'absolute', top: '25px', zIndex: 10, background: '#fff', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', borderRadius: '8px', padding: '4px', minWidth: '120px' },
    menuItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', fontSize: '14px', color: '#111b21', cursor: 'pointer', borderRadius: '4px', transition: 'background .1s' },

    unreadBadge: {
        background: '#25d366',
        color: '#fff',
        borderRadius: '50%',
        minWidth: '20px',
        height: '20px',
        padding: '0 6px',
        fontSize: '12px',
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    }
};

// Add global CSS for hover effects
const styleSheet = document.createElement("style");
styleSheet.innerText = `
    @keyframes pulse {
        0% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.3); opacity: 0.5; }
        100% { transform: scale(1); opacity: 1; }
    }
    .msg-bubble:hover .msg-dropdown {
        opacity: 1 !important;
        background: rgba(0,0,0,0.05);
    }
    .msg-dropdown:hover {
        background: rgba(0,0,0,0.1) !important;
    }
    .msg-dropdown:active {
        background: rgba(0,0,0,0.2) !important;
    }
    .menu-item:hover {
        background: #f0f2f5;
    }
    .viewer-stats {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        position: relative;
        padding: 5px 15px;
        border-radius: 20px;
        background: rgba(255,255,255,0.1);
        transition: background 0.2s;
    }
    .viewer-stats:hover {
        background: rgba(255,255,255,0.2);
    }
    .viewers-pop {
        position: absolute;
        bottom: 40px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0,0,0,0.8);
        padding: 12px;
        border-radius: 8px;
        width: 150px;
        max-height: 200px;
        overflow-y: auto;
        color: #fff;
        display: none;
        box-shadow: 0 4px 15px rgba(0,0,0,0.5);
    }
    .viewer-stats:hover .viewers-pop {
        display: block;
    }
`;
document.head.appendChild(styleSheet);

export default Chat;
