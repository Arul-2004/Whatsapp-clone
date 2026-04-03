import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { MessageSquare, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const Register = () => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { register } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await register(username, email, password);
            navigate('/login', { state: { message: 'Registration successful! Please login.' } });
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed');
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.overlay}>
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={styles.card}
                >
                    <div style={styles.logoBox}>
                        <MessageSquare color="#008069" size={48} />
                        <h2 style={styles.appName}>WhatsApp Web</h2>
                    </div>
                    
                    <h3 style={styles.cardTitle}>Create a new account</h3>
                    
                    <form onSubmit={handleSubmit} style={styles.form}>
                        {error && (
                            <div style={styles.errorBox}>
                                <AlertCircle size={18} />
                                <span>{error}</span>
                            </div>
                        )}
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Username</label>
                            <input 
                                type="text" 
                                value={username} 
                                onChange={(e) => setUsername(e.target.value)} 
                                style={styles.input}
                                placeholder="Enter your username"
                                required
                            />
                        </div>
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Email Address</label>
                            <input 
                                type="email" 
                                value={email} 
                                onChange={(e) => setEmail(e.target.value)} 
                                style={styles.input}
                                placeholder="Enter your email"
                                required
                            />
                        </div>
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Password</label>
                            <input 
                                type="password" 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                                style={styles.input}
                                placeholder="Enter your password"
                                required
                            />
                        </div>
                        <button type="submit" style={styles.loginBtn}>REGISTER</button>
                    </form>
                    
                    <p style={styles.footer}>
                        Already have an account? <Link to="/login" style={styles.link}>Login here</Link>
                    </p>
                </motion.div>
            </div>
            <div style={styles.greenBar} />
        </div>
    );
};

const styles = {
    container: {
        height: '100vh',
        background: '#f0f2f5',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
    },
    greenBar: {
        height: '220px',
        background: '#00a884',
        width: '100%',
    },
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
    },
    card: {
        background: '#fff',
        width: '100%',
        maxWidth: '450px',
        padding: '60px 40px',
        borderRadius: '3px',
        boxShadow: '0 17px 50px 0 rgba(11,20,26,.19),0 12px 15px 0 rgba(11,20,26,.24)',
        textAlign: 'center',
    },
    logoBox: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '32px',
    },
    appName: {
        color: '#41525d',
        fontSize: '28px',
        fontWeight: '300',
    },
    cardTitle: {
        fontSize: '18px',
        color: '#41525d',
        marginBottom: '32px',
        fontWeight: '500',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
    },
    inputGroup: {
        textAlign: 'left',
    },
    label: {
        fontSize: '14px',
        color: '#008069',
        fontWeight: '500',
        marginBottom: '8px',
        display: 'block',
    },
    input: {
        width: '100%',
        padding: '12px 0',
        borderBottom: '2px solid #e9edef',
        fontSize: '16px',
        color: '#111b21',
        transition: 'border-color 0.3s',
    },
    loginBtn: {
        background: '#008069',
        color: '#fff',
        padding: '12px',
        borderRadius: '3px',
        fontSize: '14px',
        fontWeight: 'bold',
        letterSpacing: '1px',
        marginTop: '12px',
    },
    errorBox: {
        background: '#fee2e2',
        color: '#ef4444',
        padding: '12px',
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '14px',
    },
    footer: {
        marginTop: '32px',
        fontSize: '14px',
        color: '#667781',
    },
    link: {
        color: '#008069',
        textDecoration: 'none',
        fontWeight: '500',
    }
};

export default Register;
