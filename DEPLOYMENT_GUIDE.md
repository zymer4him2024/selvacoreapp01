# 🚀 Vercel Deployment Guide

## Step-by-Step Deployment to Vercel

### Prerequisites
- GitHub account
- Vercel account (free at vercel.com)
- Git installed locally

---

## 📋 Deployment Steps

### 1. Initialize Git Repository (if not done)

```bash
git init
git add .
git commit -m "Initial commit - Selvacore Installation Management Platform"
```

### 2. Create GitHub Repository

1. Go to [github.com](https://github.com)
2. Click the "+" icon → "New repository"
3. Name: `selvacoreapp01` (or your preferred name)
4. **Important:** Do NOT initialize with README, .gitignore, or license
5. Click "Create repository"

### 3. Push to GitHub

```bash
# Replace YOUR_USERNAME with your GitHub username
git remote add origin https://github.com/YOUR_USERNAME/selvacoreapp01.git
git branch -M main
git push -u origin main
```

### 4. Deploy to Vercel

#### Option A: Using Vercel Dashboard (Easiest)

1. Go to [vercel.com](https://vercel.com)
2. Sign up / Sign in with GitHub
3. Click "Add New..." → "Project"
4. Import your `selvacoreapp01` repository
5. Configure project:
   - **Framework Preset:** Next.js (auto-detected)
   - **Root Directory:** `./`
   - **Build Command:** `npm run build` (auto-detected)
   - **Output Directory:** `.next` (auto-detected)

6. **Add Environment Variables** (CRITICAL):

Click "Environment Variables" and add these:

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBWTaYmf3hFQTb4lEM5Re3X1zmQiKdY5Bc
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=selvacoreapp01.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=selvacoreapp01
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=selvacoreapp01.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=461031200909
NEXT_PUBLIC_FIREBASE_APP_ID=1:461031200909:web:eceacdfab67fb8564d2ac4
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-RJEHWYXT2Y
```

7. Click "Deploy"
8. Wait 2-3 minutes for build
9. Get your URL: `https://selvacoreapp01.vercel.app`

#### Option B: Using Vercel CLI

```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Deploy (from project root)
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name? selvacoreapp01
# - Directory? ./
# - Override settings? No

# For production deployment
vercel --prod
```

---

## 🔐 Firebase Configuration for Production

### Update Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: `selvacoreapp01`
3. Go to **Authentication** → **Settings**
4. Add your Vercel domain to **Authorized domains**:
   - `selvacoreapp01.vercel.app` (or your custom domain)

### Update Firestore Rules (if needed)

If you want to restrict by domain:

```bash
firebase deploy --only firestore
```

---

## 🌐 Custom Domain (Optional)

### Add Custom Domain in Vercel

1. Go to your project in Vercel Dashboard
2. Click "Settings" → "Domains"
3. Add your custom domain (e.g., `selvacore.com`)
4. Follow DNS configuration instructions
5. Update Firebase authorized domains

---

## 🔄 Automatic Deployments

Once connected to GitHub, Vercel will automatically:
- ✅ Deploy on every `git push` to `main` branch
- ✅ Create preview deployments for pull requests
- ✅ Run builds and tests
- ✅ Provide deployment status in GitHub

---

## 📊 Post-Deployment Checklist

After deployment:

### 1. Test Core Features
- [ ] Visit your Vercel URL
- [ ] Select language
- [ ] Sign in with Google
- [ ] Test customer flow
- [ ] Test admin console
- [ ] Upload images
- [ ] Place a test order

### 2. Configure Firebase
- [ ] Add Vercel domain to Firebase authorized domains
- [ ] Deploy Firestore rules: `firebase deploy --only firestore`
- [ ] Test authentication on production
- [ ] Test file uploads to Firebase Storage

### 3. Monitor
- [ ] Check Vercel Analytics
- [ ] Monitor Firebase usage
- [ ] Check for any console errors

---

## 🐛 Troubleshooting

### Build Fails

1. Check Vercel build logs
2. Ensure all environment variables are set
3. Verify `package.json` has all dependencies
4. Check for TypeScript errors

### Authentication Issues

1. Verify Firebase API key in environment variables
2. Check authorized domains in Firebase Console
3. Ensure domain matches exactly (with/without www)

### Image Upload Issues

1. Check Firebase Storage rules
2. Verify CORS configuration
3. Check Firebase Storage quota

---

## 💰 Pricing

### Vercel Free Tier Includes:
- ✅ Unlimited deployments
- ✅ 100 GB bandwidth
- ✅ Automatic HTTPS
- ✅ Preview deployments
- ✅ Analytics

### Firebase Free Tier Includes:
- ✅ 50K document reads/day
- ✅ 20K document writes/day
- ✅ 5 GB storage
- ✅ 1 GB downloads/day
- ✅ Authentication

**Your app should run comfortably on free tiers during development!**

---

## 🚀 Quick Deploy Commands

```bash
# First time setup
git init
git add .
git commit -m "Initial commit"
git remote add origin YOUR_GITHUB_URL
git push -u origin main

# Then on Vercel
vercel

# Or use Vercel dashboard to import from GitHub
```

---

## 📱 Your Live URLs

After deployment, you'll have:

- **Production:** `https://selvacoreapp01.vercel.app`
- **Preview:** `https://selvacoreapp01-git-BRANCH.vercel.app`
- **Firebase:** Backend services

---

## 📞 Support

- Vercel Docs: https://vercel.com/docs
- Next.js Docs: https://nextjs.org/docs
- Firebase Docs: https://firebase.google.com/docs

---

## ✨ What Happens Next

1. Push code to GitHub
2. Vercel builds automatically
3. Deploy in 2-3 minutes
4. Get production URL
5. Share with users! 🎉

**Your app is production-ready!** 🚀

