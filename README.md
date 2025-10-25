# Selvacoreapp01 - Updated

Educational application with Firebase integration.

## Features

- 🔥 Firebase Authentication (Google Sign-in)
- 📦 Firestore Database
- 🎨 Ready for your UI framework
- 🤖 Context7 MCP Integration for coding assistance

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Firebase

Your Firebase is already configured in `src/config/firebase.ts`.

Environment variables are in `.env`:
- Firebase credentials
- API keys

### 3. Context7 MCP (Coding Assistance)

Context7 MCP is already available in Cursor! You can use it to get documentation and code examples.

**How to use Context7:**

1. When writing code, the AI assistant can use Context7 to fetch documentation for libraries
2. Context7 provides up-to-date docs for Firebase, React, and many other libraries
3. Just ask questions like:
   - "How do I implement Google sign-in with Firebase?"
   - "Show me Firebase Firestore query examples"
   - "How to use React hooks?"

**Context7 is automatically available** - no additional setup needed!

## Project Structure

```
selvacoreapp01/
├── src/
│   └── config/
│       └── firebase.ts         # Firebase configuration
├── firebase.json               # Firebase hosting/rules config
├── firestore.rules            # Firestore security rules
├── firestore.indexes.json     # Firestore indexes
├── .env                       # Environment variables
└── package.json              # Dependencies
```

## Firebase Setup

### Authentication

```typescript
import { auth } from './src/config/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

// Google Sign-in
const provider = new GoogleAuthProvider();
const result = await signInWithPopup(auth, provider);
const user = result.user;
```

### Firestore

```typescript
import { db } from './src/config/firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';

// Add document
await addDoc(collection(db, 'users'), {
  name: 'John Doe',
  email: 'john@example.com'
});

// Get documents
const querySnapshot = await getDocs(collection(db, 'users'));
querySnapshot.forEach((doc) => {
  console.log(doc.id, doc.data());
});
```

## Security Rules

Firestore security rules are configured in `firestore.rules`:

- Users can read/write their own data
- Students can only access their own student data
- Lessons require authentication to read
- Admins can write lessons and problem sets

## Deployment

### Deploy to Firebase

```bash
# Login to Firebase
firebase login

# Deploy
firebase deploy
```

## Development

1. Configure your preferred framework (React, Next.js, Vue, etc.)
2. Update `package.json` scripts for dev/build
3. Use Context7 MCP in Cursor for coding help
4. Build your features

## Environment Variables

Required in `.env`:

```bash
# Firebase
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

## Using Context7 for Help

Context7 MCP provides intelligent coding assistance. Example queries you can ask:

### Firebase Examples
- "How do I set up Firebase authentication with email/password?"
- "Show me how to query Firestore with filters"
- "How to use Firebase storage to upload images?"

### React Examples (if using React)
- "How do I use useState and useEffect?"
- "Show me React routing examples"
- "How to create a custom hook?"

### General Coding
- "Best practices for error handling in TypeScript"
- "How to structure a Node.js project?"
- "Show me async/await examples"

The AI assistant with Context7 will provide up-to-date documentation and code examples!

## Next Steps

1. Choose your frontend framework (React, Vue, Next.js, etc.)
2. Configure dev/build scripts in `package.json`
3. Start building your educational app
4. Use Context7 for coding assistance as you build

## License

MIT
