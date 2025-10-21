# ConvoWave 💬

A modern, real-time chat application built with React Native (Expo) and Node.js, featuring instant messaging, image sharing, and a beautiful user interface.

## ✨ Features

- **Real-time Messaging** - Instant communication powered by Socket.IO
- **User Authentication** - Secure login and registration with JWT
- **Profile Pictures** - Camera and photo library integration for custom avatars
- **Image Sharing** - Send and receive images in conversations
- **Cross-Platform** - Works on both iOS and Android
- **Modern UI** - Built with Expo Router and smooth animations
- **Persistent Storage** - Messages and user data stored securely
- **Toast Notifications** - Real-time feedback for user actions

## 🎥 Demo

[Insert your YouTube demo links here]

- **iOS Demo**: [Link to iOS screen recording]
- **Android Demo**: [Link to Android screen recording]

## 📱 Screenshots

[Add screenshots of your app here]

## 🛠️ Tech Stack

### Frontend (Mobile App)
- **React Native** - Cross-platform mobile framework
- **Expo** (v53) - Development platform
- **Expo Router** - File-based navigation
- **Socket.IO Client** - Real-time bidirectional communication
- **Zustand** - State management
- **React Navigation** - Navigation library
- **Axios** - HTTP client
- **Lucide React Native** - Icon library
- **AsyncStorage** - Local data persistence

### Backend (Server)
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **Socket.IO** - Real-time engine
- **MongoDB** (Mongoose) - Database
- **JWT** - Authentication
- **Bcrypt.js** - Password hashing
- **Cloudinary** - Image storage and management
- **Nodemailer** - Email functionality
- **CORS** - Cross-origin resource sharing

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- MongoDB instance
- Cloudinary account (for image uploads)

### Backend Setup

1. Clone the repository
```bash
git clone <your-repo-url>
cd backend
```

2. Install dependencies
```bash
npm install
```

3. Create a `.env` file in the backend directory
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
EMAIL_USER=your_email@example.com
EMAIL_PASSWORD=your_email_password
```

4. Start the backend server
```bash
npm run dev
```

The server will run on `http://localhost:5000`

### Mobile App Setup

1. Navigate to the app directory
```bash
cd chat-app
```

2. Install dependencies
```bash
npm install
```

3. Update the API endpoint in your app to point to your backend server

4. Start the Expo development server
```bash
npm start
```

5. Run on your preferred platform
```bash
# iOS
npm run ios

# Android
npm run android
```

## 📦 Building for Production

### Android
```bash
npm run build:android
```

### iOS
```bash
npm run build:ios
```

Builds are managed through Expo Application Services (EAS).

## 🔐 Environment Variables

### Backend Required Variables
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name
- `CLOUDINARY_API_KEY` - Cloudinary API key
- `CLOUDINARY_API_SECRET` - Cloudinary API secret
- `PORT` - Server port (default: 5000)

### Frontend Configuration
Update the API base URL in your app's configuration to match your backend deployment.

## 📱 Permissions

### iOS
- Camera access for profile pictures
- Photo library access for selecting images

### Android
- Camera
- Read/Write external storage

## 🏗️ Project Structure

```
ConvoWave/
├── chat-app/              # React Native mobile app
│   ├── app/              # Expo Router pages
│   ├── assets/           # Images, fonts, etc.
│   └── package.json
│
└── backend/              # Node.js server
    ├── src/
    │   ├── controllers/  # Business logic
    │   ├── models/       # Database schemas
    │   ├── routes/       # API endpoints
    │   ├── middleware/   # Auth & validation
    │   └── index.js      # Server entry point
    └── package.json
```

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## 📝 License

This project is private and not licensed for public use.

## 👨‍💻 Author

**Emmanard**
- EAS Owner: emmanard9

## 🙏 Acknowledgments

- Expo team for the amazing development platform
- Socket.IO for real-time capabilities
- All open-source libraries used in this project

---

Built with ❤️ using React Native and Node.js
