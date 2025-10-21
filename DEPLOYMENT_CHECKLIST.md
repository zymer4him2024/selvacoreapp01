# 🚀 Deployment Checklist - selvacoreapp01.web.app

## ✅ **Code Deployment - COMPLETE**

- ✅ All changes committed to git
- ✅ Pushed to GitHub (`main` branch)
- ✅ Vercel auto-deployment triggered
- ⏳ Waiting for Vercel build to complete...

---

## 🔧 **Manual Steps Required:**

### **1. Update Firebase Firestore Rules** ⚠️ **CRITICAL**

The Firestore rules MUST be updated manually in Firebase Console:

**Steps:**
1. Go to: https://console.firebase.google.com/project/selvacoreapp01/firestore/rules
2. Replace ALL rules with the content from `firestore.rules` file
3. Click **"Publish"**
4. Wait 30-60 seconds for rules to propagate

**Why:** Firestore rules control who can read/write data. Without updating:
- ❌ Customers can't see products
- ❌ Orders won't work
- ❌ Authentication issues

---

### **2. Verify Environment Variables in Vercel** ✅

Check that Vercel has all Firebase environment variables:

**Go to:** https://vercel.com/your-project/settings/environment-variables

**Required Variables:**
```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBWTaYmf3hFQTb4lEM5Re3X1zmQiKdY5Bc
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=selvacoreapp01.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=selvacoreapp01
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=selvacoreapp01.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=461031200909
NEXT_PUBLIC_FIREBASE_APP_ID=1:461031200909:web:eceacdfab67fb8564d2ac4
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-RJEHWYXT2Y
```

---

### **3. Update Firebase Authorized Domains** ✅

Add your Vercel domain to Firebase:

**Steps:**
1. Go to: https://console.firebase.google.com/project/selvacoreapp01/authentication/settings
2. Click **"Authorized domains"** tab
3. Add your Vercel domain (e.g., `selvacoreapp01.vercel.app`)
4. Click **"Add domain"**

**Why:** Firebase Authentication won't work without this.

---

## 🌐 **Expected URLs:**

### **Main Site (Customer/Technician):**
- **Production:** `https://selvacoreapp01.vercel.app` (or your custom domain)
- **Purpose:** Customer and Technician login and dashboards
- **Languages:** English, Portuguese, Spanish, Korean

### **Admin Portal:**
- **Production:** `https://selvacoreapp01.vercel.app/admin`
- **Purpose:** Admin login and management
- **Access:** Admin accounts only

---

## 🧪 **Testing Checklist:**

### **Test Customer Flow:**
1. ✅ Go to production URL
2. ✅ Should redirect to `/login`
3. ✅ Select a language
4. ✅ Click "Sign in with Google"
5. ✅ Should see role selection
6. ✅ Select "Customer"
7. ✅ Should see customer dashboard
8. ✅ Should see products (if Firestore rules updated)

### **Test Admin Flow:**
1. ✅ Go to `/admin` on production URL
2. ✅ Should see admin login page
3. ✅ Sign in with `zymer4him@gmail.com`
4. ✅ Should see admin dashboard
5. ✅ Should be able to manage products

### **Test Language Switching:**
1. ✅ At login, select Portuguese
2. ✅ UI should change to Portuguese
3. ✅ Click "change language"
4. ✅ Select Spanish
5. ✅ UI should change to Spanish

---

## 📊 **Deployment Status:**

### **Vercel Deployment:**
- Status: ⏳ Building...
- Check: https://vercel.com/dashboard

### **What Vercel Does:**
1. Detects git push
2. Runs `npm install`
3. Runs `npm run build`
4. Deploys to production
5. Updates `selvacoreapp01.vercel.app`

**Expected Time:** 2-5 minutes

---

## 🔍 **How to Check Deployment:**

### **Method 1: Vercel Dashboard**
1. Go to: https://vercel.com/dashboard
2. Click on your project
3. Look for latest deployment
4. Should show: "Building" → "Ready"

### **Method 2: Direct URL**
1. Visit: `https://selvacoreapp01.vercel.app`
2. Should see login page
3. Should have language selection

### **Method 3: GitHub Actions** (if enabled)
1. Go to: https://github.com/zymer4him2024/selvacoreapp01/actions
2. Check latest workflow run

---

## ⚠️ **Common Issues & Solutions:**

### **Issue 1: "Products not showing"**
**Cause:** Firestore rules not updated
**Solution:** 
1. Update rules in Firebase Console
2. Wait 60 seconds
3. Refresh page

### **Issue 2: "Google Sign-In fails"**
**Cause:** Authorized domains not set
**Solution:**
1. Add Vercel domain to Firebase Auth
2. Try again

### **Issue 3: "404 on /admin"**
**Cause:** Deployment not complete
**Solution:**
1. Wait for Vercel build to finish
2. Clear browser cache
3. Try again

### **Issue 4: "Old version showing"**
**Cause:** Browser cache
**Solution:**
1. Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. Or clear browser cache

---

## 📝 **Post-Deployment Tasks:**

### **Immediate:**
1. ⏳ **Wait for Vercel build** (check dashboard)
2. ⚠️ **Update Firestore rules** (critical!)
3. ✅ **Test customer flow** (language + login + products)
4. ✅ **Test admin flow** (login + dashboard)

### **Optional:**
1. 🌐 **Set up custom domain** (if desired)
2. 📧 **Notify team** about new deployment
3. 📊 **Monitor analytics** in Firebase Console
4. 🐛 **Check error logs** in Vercel dashboard

---

## 🎉 **Success Criteria:**

Your deployment is successful when:

- ✅ Production URL loads
- ✅ Language selection works
- ✅ Google Sign-In works
- ✅ Products display on customer page
- ✅ Admin login works at `/admin`
- ✅ Admin can manage products
- ✅ All 4 languages work

---

## 📞 **Next Steps:**

1. **Monitor Vercel Dashboard:** https://vercel.com/dashboard
2. **Update Firestore Rules:** https://console.firebase.google.com/project/selvacoreapp01/firestore/rules
3. **Test Production Site:** Visit your Vercel URL
4. **Report Issues:** If anything doesn't work, check the "Common Issues" section above

---

**🚀 Your app is deploying now! Check Vercel dashboard for progress.**

