import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageSquare, Shield, Zap } from 'lucide-react';

const Home = () => {
    const navigate = useNavigate();

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <div style={styles.logo}>
                    <MessageSquare color="#fff" size={32} />
                    <span style={styles.logoText}>WhatsApp Web Clone</span>
                </div>
                <nav style={styles.nav}>
                    <button onClick={() => navigate('/instructions')} style={styles.navBtn}>Instructions</button>
                    <button onClick={() => navigate('/login')} style={styles.loginBtn}>Login</button>
                </nav>
            </header>

            <main style={styles.main}>
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    style={styles.hero}
                >
                    <h1 style={styles.heroTitle}>Connect with your world</h1>
                    <p style={styles.heroSubtitle}>Simple, reliable, and private messaging across the web.</p>
                    <button onClick={() => navigate('/register')} style={styles.ctaBtn}>Get Started</button>
                </motion.div>

                <div style={styles.features}>
                    <div style={styles.featureCard}>
                        <Shield color="#008069" size={40} />
                        <h3>Secure</h3>
                        <p>End-to-end encrypted messaging for your privacy.</p>
                    </div>
                    <div style={styles.featureCard}>
                        <Zap color="#008069" size={40} />
                        <h3>Fast</h3>
                        <p>Real-time delivery with Socket.IO technology.</p>
                    </div>
                    <div style={styles.featureCard}>
                        <MessageSquare color="#008069" size={40} />
                        <h3>Simple</h3>
                        <p>Clean interface inspired by WhatsApp Web.</p>
                    </div>
                </div>
            </main>
        </div>
    );
};

const styles = {
    container: {
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #008069 0%, #00a884 100%)',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
    },
    header: {
        padding: '24px 60px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    logo: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    },
    logoText: {
        fontSize: '24px',
        fontWeight: 'bold',
    },
    nav: {
        display: 'flex',
        gap: '20px',
    },
    navBtn: {
        color: '#fff',
        fontSize: '16px',
        fontWeight: '500',
    },
    loginBtn: {
        background: 'rgba(255,255,255,0.2)',
        color: '#fff',
        padding: '8px 24px',
        borderRadius: '20px',
        fontWeight: 'bold',
        backdropFilter: 'blur(10px)',
    },
    main: {
        flex: 1,
        padding: '60px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
    },
    hero: {
        maxWidth: '800px',
        marginBottom: '80px',
    },
    heroTitle: {
        fontSize: '64px',
        fontWeight: '800',
        marginBottom: '24px',
    },
    heroSubtitle: {
        fontSize: '20px',
        opacity: 0.9,
        marginBottom: '40px',
    },
    ctaBtn: {
        background: '#fff',
        color: '#008069',
        padding: '16px 48px',
        borderRadius: '30px',
        fontSize: '18px',
        fontWeight: 'bold',
        boxShadow: '0 10px 20px rgba(0,0,0,0.1)',
    },
    features: {
        display: 'flex',
        gap: '30px',
        maxWidth: '1200px',
    },
    featureCard: {
        background: '#fff',
        color: '#333',
        padding: '40px',
        borderRadius: '20px',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
    }
};

export default Home;
