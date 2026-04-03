WhatsApp Web Clone (MERN Stack) – Full Stack Developer Project
Project Overview

This project is a full-stack WhatsApp Web clone developed as part of a Full Stack Developer task (Node.js / React). It demonstrates the implementation of real-time communication, scalable backend architecture, and structured frontend design using modern web technologies.

The application focuses on core chat functionality including user management, messaging, real-time updates, and persistent storage, while maintaining a clean and modular codebase.

Tech Stack
Frontend
React (Vite)
React Router
Axios
Socket.IO Client
Framer Motion
Lucide React
Backend
Node.js with Express
Socket.IO (WebSockets)
MongoDB with Mongoose
JWT Authentication
Bcrypt.js
Key Features (Aligned with Requirements)
1. User Management
User registration and login system
Unique user identification using email or username
JWT-based authentication
Multiple users supported
2. Chat Interface
WhatsApp-like two-panel UI (chat list and chat window)
Active chat highlighting
Message input with send functionality
Clear distinction between sent and received messages
Auto-scroll to latest message
3. Messaging Functionality
Send and receive text messages in real-time
Messages stored in MongoDB
Fetch chat history between users
Messages displayed in chronological order
Persistent chat history (survives page refresh)
Each message includes sender, receiver, and timestamp
4. Backend APIs
Method	Endpoint	Description
POST	/auth/register	Register new user
POST	/auth/login	User login
GET	/auth/users	Fetch all users
GET	/messages/:u1/:u2	Get chat history
POST	/messages/send	Send message
DELETE	/messages/chat/:u1/:u2	Clear chat history

Proper HTTP status codes and error handling are implemented.
Input validation ensures empty or invalid messages are handled safely.

5. Real-Time Updates
Real-time messaging using Socket.IO
Instant message delivery without page reload
Private user rooms for secure communication
Live UI updates for incoming messages
6. Application Structure
Separate frontend and backend projects
Modular and reusable React components
Clean folder structure with proper separation of concerns
Scalable and maintainable architecture
Database Design
User Schema
username
email
password (hashed)
profilePic
status
timestamps
Message Schema
sender
receiver
content
timestamp
Project Structure
clone_whatsapp_final/
├── backend/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── server.js
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   └── assets/
│   ├── vite.config.js
│   └── index.html
│
└── README.md
Installation & Setup
Prerequisites
Node.js (v18+)
MongoDB (Local or Atlas)
Backend Setup
cd backend
npm install

Create .env file:

MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
PORT=5000

Run server:

npm start
Frontend Setup
cd frontend
npm install
npm run dev

Frontend runs at:
http://localhost:5173

Security Features
Password hashing using bcrypt
JWT-based authentication
Protected API routes
Private Socket.IO rooms for secure messaging
Performance & Optimization
Efficient MongoDB queries
Real-time updates with minimal latency
Clean state management in frontend
Optimized component rendering
Skills Demonstrated
Full Stack Development (MERN)
REST API Design
Real-Time Systems (WebSockets)
Authentication & Security
Database Design (MongoDB)
Scalable Architecture
UI/UX Design
Notes

This project demonstrates core WhatsApp Web functionality as required in the task.
AI tools were used to accelerate development while maintaining best practices.
The application is structured for scalability and extensibility.

License

This project is licensed under the ISC License.

Submission
GitHub Repository: https://github.com/Arul-2004/Whatsapp-clone.git
Includes full source code, setup instructions, and environment configuration.
