# WhatsApp Web Clone (MERN Stack) – Full Stack Developer Project

## Project Overview

This project is a full-stack WhatsApp Web clone developed as part of a Full Stack Developer task (Node.js / React). It demonstrates real-time communication, scalable backend architecture, and structured frontend design using modern web technologies.

The application focuses on core chat functionality including user management, messaging, real-time updates, and persistent storage, while maintaining a clean and modular codebase.

---

## Tech Stack

### Frontend
- React (Vite)  
- React Router  
- Axios  
- Socket.IO Client  
- Framer Motion  
- Lucide React  

### Backend
- Node.js with Express  
- Socket.IO (WebSockets)  
- MongoDB with Mongoose  
- JWT Authentication  
- Bcrypt.js  

---

## Key Features

### User Management
- User registration and login system  
- Unique user identification using email or username  
- JWT-based authentication  
- Multiple users supported  

### Chat Interface
- WhatsApp-like two-panel UI  
- Active chat highlighting  
- Message input with send functionality  
- Clear distinction between sent and received messages  
- Auto-scroll to latest message  

### Messaging Functionality
- Real-time messaging  
- Messages stored in MongoDB  
- Chat history between users  
- Messages in chronological order  
- Persistent chat history  

### Backend APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/register | Register new user |
| POST | /auth/login | User login |
| GET | /auth/users | Fetch all users |
| GET | /messages/:u1/:u2 | Get chat history |
| POST | /messages/send | Send message |
| DELETE | /messages/chat/:u1/:u2 | Clear chat history |

---

## Real-Time Updates
- Socket.IO based messaging  
- Instant delivery  
- Private user rooms  
- Live UI updates  

---

## Project Structure
clone_whatsapp_final/
├── backend/
├── frontend/
└── README.md


---

## Installation & Setup

### Backend

cd backend
npm install
npm start


### Frontend

cd frontend
npm install
npm run dev


---

## Security Features
- Bcrypt password hashing  
- JWT authentication  
- Protected APIs  
- Secure Socket.IO rooms  

---

## Skills Demonstrated
- MERN Stack  
- REST APIs  
- WebSockets  
- Authentication  
- Database Design  
- UI/UX  

---

## License
ISC License  

---

## Submission
GitHub: https://github.com/Arul-2004/Whatsapp-clone.git

## Output screenshots

![image alt](https://github.com/Arul-2004/Whatsapp-clone/blob/05eeb3139a8def72212f0f5e96a643d6a5653a50/Screenshot%202026-04-03%20170432.png)

![image alt](https://github.com/Arul-2004/Whatsapp-clone/blob/83c9be5abd9fc47916f8bffaf1167273ba762db9/Screenshot%202026-04-03%20170502.png)

![image alt](https://github.com/Arul-2004/Whatsapp-clone/blob/6d50b2c832248a47feae3dd60a509434fc17d588/Screenshot%202026-04-03%20170524.png)

![image alt](https://github.com/Arul-2004/Whatsapp-clone/blob/6d50b2c832248a47feae3dd60a509434fc17d588/Screenshot%202026-04-03%20170540.png)

![image alt](https://github.com/Arul-2004/Whatsapp-clone/blob/6d50b2c832248a47feae3dd60a509434fc17d588/Screenshot%202026-04-03%20183053.png)

![image alt](https://github.com/Arul-2004/Whatsapp-clone/blob/6d50b2c832248a47feae3dd60a509434fc17d588/Screenshot%202026-04-03%20183111.png)

![image alt](https://github.com/Arul-2004/Whatsapp-clone/blob/6d50b2c832248a47feae3dd60a509434fc17d588/Screenshot%202026-04-03%20183131.png)
