# Context7 MCP Guide

## What is Context7?

Context7 is a Model Context Protocol (MCP) server that provides up-to-date documentation for libraries and frameworks. It's already integrated into Cursor!

## How to Use Context7 in Cursor

Context7 is **already enabled** in Cursor. You don't need to install or configure anything!

### Getting Help While Coding

Simply ask the AI assistant questions about libraries you're using, and it will automatically use Context7 to fetch documentation.

## Example Questions for Firebase Project

### Firebase Authentication

**Ask:**
- "How do I implement Google sign-in with Firebase?"
- "Show me Firebase email/password authentication"
- "How to handle Firebase auth state changes?"
- "How to sign out a user in Firebase?"

**Context7 will provide:**
- Latest Firebase Auth documentation
- Code examples
- Best practices
- TypeScript types

### Firestore Database

**Ask:**
- "How to query Firestore documents with where clauses?"
- "Show me how to do real-time Firestore listeners"
- "How to batch write in Firestore?"
- "How to use Firestore transactions?"

**Context7 will provide:**
- Current Firestore API documentation
- Query examples
- Security considerations
- Performance tips

### Firebase Storage

**Ask:**
- "How to upload files to Firebase Storage?"
- "Show me how to get download URLs from Storage"
- "How to delete files from Firebase Storage?"

## Example Questions for Frontend Development

### React (if you choose React)

**Ask:**
- "How do I use useState and useEffect hooks?"
- "Show me React Context API examples"
- "How to create a custom React hook?"
- "Best practices for React component structure"

### Next.js (if you choose Next.js)

**Ask:**
- "How does Next.js routing work?"
- "Show me Next.js API routes examples"
- "How to use getServerSideProps?"
- "How to deploy Next.js to Vercel?"

### TypeScript

**Ask:**
- "How to define TypeScript interfaces for Firestore documents?"
- "Show me TypeScript generic examples"
- "How to use TypeScript with React props?"

## How Context7 Works

1. **You ask a question** to the AI assistant
2. **Context7 automatically activates** when relevant
3. **Fetches latest documentation** from official sources
4. **AI provides answer** with current, accurate information

## Benefits

✅ **Always Up-to-Date** - Gets latest documentation from sources
✅ **Library Specific** - Focused on the exact library you're using
✅ **Code Examples** - Provides working code snippets
✅ **TypeScript Support** - Includes TypeScript types and definitions
✅ **Best Practices** - Includes recommended patterns

## Libraries Supported

Context7 supports many popular libraries:
- Firebase (Auth, Firestore, Storage, Functions)
- React & React Hooks
- Next.js
- Vue.js
- Express.js
- And many more!

## Tips for Best Results

1. **Be Specific**: Ask about specific features
   - ❌ "Tell me about Firebase"
   - ✅ "How to query Firestore with multiple where clauses?"

2. **Mention the Library**: Include the library name
   - ✅ "How to use Firebase onAuthStateChanged?"

3. **Ask for Examples**: Request code examples
   - ✅ "Show me a Firebase Firestore transaction example"

4. **Include Your Context**: Mention your stack
   - ✅ "How to use Firebase Auth with React hooks?"

## Example Workflow

```typescript
// 1. You're writing code and need help
import { db } from './config/firebase';

// 2. Ask: "How do I add a document to Firestore with auto ID?"

// 3. Context7 provides the answer:
import { collection, addDoc } from 'firebase/firestore';

const docRef = await addDoc(collection(db, 'users'), {
  name: 'John Doe',
  email: 'john@example.com',
  createdAt: new Date()
});

console.log('Document created with ID:', docRef.id);
```

## Common Use Cases for This Project

### 1. Setting Up Authentication

**Ask:** "How to implement Google sign-in with Firebase and handle the user state?"

### 2. Database Operations

**Ask:** "How to create, read, update, and delete documents in Firestore?"

### 3. Security Rules

**Ask:** "How to write Firestore security rules for user-owned data?"

### 4. Real-time Updates

**Ask:** "How to listen to real-time changes in a Firestore collection?"

### 5. File Uploads

**Ask:** "How to upload images to Firebase Storage and get the download URL?"

## No Configuration Needed!

Context7 is already enabled in Cursor. Just start asking questions and the AI assistant will automatically use Context7 to provide accurate, up-to-date answers.

Happy coding! 🚀

