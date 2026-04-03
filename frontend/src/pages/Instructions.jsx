import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Info, Key, Users, MessageSquare, Zap } from 'lucide-react';

const Instructions = () => {
    const navigate = useNavigate();

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <button onClick={() => navigate(-1)} style={styles.backBtn}>
                    <ChevronLeft size={24} /> Back
                </button>
                <div style={styles.content}>
                    <h1 style={styles.title}>Project Instructions</h1>
                    <p style={styles.subtitle}>Welcome to the WhatsApp Web Clone project. Here is how to use the application.</p>
                    
                    <div style={styles.step}>
                        <div style={styles.iconBox}><Users /></div>
                        <div>
                            <h3>1. User Accounts</h3>
                            <p>To test the real-time messaging, you need at least two users. You can register two different accounts or use the predefined ones if set up.</p>
                        </div>
                    </div>

                    <div style={styles.step}>
                        <div style={styles.iconBox}><Key /></div>
                        <div>
                            <h3>2. Authentication</h3>
                            <p>Login with your email and password. Your session will be persisted using local storage.</p>
                        </div>
                    </div>

                    <div style={styles.step}>
                        <div style={styles.iconBox}><MessageSquare /></div>
                        <div>
                            <h3>3. Chat Interface</h3>
                            <p>The interface consists of a Sidebar (left) and a Chat Window (right). Select a user from the sidebar to start a conversation.</p>
                        </div>
                    </div>

                    <div style={styles.step}>
                        <div style={styles.iconBox}><Zap /></div>
                        <div>
                            <h3>4. Real-time Messaging</h3>
                            <p>Messages are sent instantly using WebSockets. Open the app in two different browser windows or incognito mode to see the live updates.</p>
                        </div>
                    </div>

                    <div style={styles.step}>
                        <div style={styles.iconBox}><Info /></div>
                        <div>
                            <h3>5. Message Persistence</h3>
                            <p>All messages are stored in MongoDB. Your chat history will be loaded automatically when you select a user.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const styles = {
    container: {
        minHeight: '100vh',
        background: '#f0f2f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
    },
    card: {
        width: '100%',
        maxWidth: '800px',
        background: '#fff',
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        padding: '40px',
        position: 'relative',
    },
    backBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        color: '#008069',
        fontWeight: '600',
        marginBottom: '20px',
    },
    title: {
        fontSize: '32px',
        color: '#111b21',
        marginBottom: '12px',
    },
    subtitle: {
        color: '#667781',
        marginBottom: '40px',
    },
    step: {
        display: 'flex',
        gap: '20px',
        marginBottom: '30px',
    },
    iconBox: {
        width: '48px',
        height: '48px',
        background: '#e7fce3',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#008069',
        flexShrink: 0,
    }
};

export default Instructions;
