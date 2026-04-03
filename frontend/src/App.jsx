import React, { useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Instructions from './pages/Instructions';
import Login from './pages/Login';
import Register from './pages/Register';
import Chat from './pages/Chat';
import { AuthContext } from './context/AuthContext';

const App = () => {
  const { user, loading } = useContext(AuthContext);

  if (loading) return <div>Loading...</div>;

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/instructions" element={<Instructions />} />
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/chat" />} />
      <Route path="/register" element={<Register />} />
      <Route path="/chat" element={user ? <Chat /> : <Navigate to="/login" />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

export default App;
