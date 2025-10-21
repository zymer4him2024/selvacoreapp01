# 🔥 Firebase Hosting with Vercel - Setup Guide

## ❗ **Important: Your App Cannot Use Firebase Hosting Static Files**

Your Next.js app uses:
- ✅ Dynamic routes (`/admin/products/[id]`, `/customer/products/[id]`)
- ✅ Firebase Authentication (requires server-side)
- ✅ Real-time Firestore queries
- ✅ Server-side rendering

**Firebase Hosting only serves static files** and cannot run Next.js server features.

---

## 🎯 **Recommended Solution: Vercel with Custom Domain**

### **Current Setup:**
- ✅ Your app is already on Vercel
- ✅ Available at: `https://selvacoreapp01.vercel.app`
- ✅ All features working

### **What You Want:**
- URL: `https://selvacoreapp01.web.app`
- Admin: `https://selvacoreapp01.web.app/admin`

### **Solution:**
**Add `selvacoreapp01.web.app` as a custom domain in Vercel**

---

## 📋 **Step-by-Step Setup:**

### **Step 1: Add Custom Domain in Vercel**

1. Go to: https://vercel.com/dashboard
2. Click on your project (`selvacoreapp01`)
3. Go to **Settings** → **Domains**
4. Click **"Add Domain"**
5. Enter: `selvacoreapp01.web.app`
6. Click **"Add"**

Vercel will give you DNS records to add.

---

### **Step 2: Update Firebase Hosting DNS**

Firebase Hosting uses Google Cloud DNS. You'll need to:

**Option A: Use Firebase Custom Domain (If Available)**
1. Go to: https://console.firebase.google.com/project/selvacoreapp01/hosting
2. Click **"Add custom domain"**
3. Enter: `selvacoreapp01.web.app`
4. Follow Firebase instructions

**Option B: Update DNS Records Manually**
1. Go to your domain registrar (where you bought the domain)
2. Add the DNS records provided by Vercel:
   - Type: `CNAME`
   - Name: `@` or `selvacoreapp01.web.app`
   - Value: `cname.vercel-dns.com` (or the value Vercel provides)

---

### **Step 3: Wait for DNS Propagation**

- DNS changes can take 24-48 hours
- Usually works within 1-2 hours
- Check status in Vercel dashboard

---

## 🔄 **Alternative: Use Vercel URL for Now**

While waiting for custom domain setup:

**Customer/Technician:**
- URL: `https://selvacoreapp01.vercel.app`
- Works exactly the same

**Admin:**
- URL: `https://selvacoreapp01.vercel.app/admin`

---

## 🚀 **Quick Deploy to Vercel (Already Done)**

Your app is already deployed! Check:
- https://vercel.com/dashboard
- Look for latest deployment

### **To Redeploy:**
```bash
git add .
git commit -m "Update"
git push origin main
```

Vercel automatically deploys when you push to GitHub!

---

## ✅ **What's Already Working:**

1. ✅ **Code on GitHub** - Latest version pushed
2. ✅ **Vercel Connected** - Auto-deploys from GitHub
3. ✅ **App is Live** - At `selvacoreapp01.vercel.app`
4. ✅ **Firebase Connected** - Auth, Firestore, Storage working
5. ✅ **Multi-language** - EN, PT, ES, KO supported
6. ✅ **Clean URLs** - `/` for customers, `/admin` for admins

---

## 🎯 **Summary:**

**What You Have Now:**
- URL: `https://selvacoreapp01.vercel.app`
- Admin: `https://selvacoreapp01.vercel.app/admin`
- ✅ Fully functional

**To Get `selvacoreapp01.web.app`:**
1. Add custom domain in Vercel
2. Update DNS records
3. Wait for propagation
4. Done!

---

## 📝 **Why Not Firebase Hosting Static Files?**

Firebase Hosting can only serve:
- HTML files
- CSS files  
- JavaScript files
- Images

It **cannot** run:
- Next.js server
- API routes
- Server-side rendering
- Dynamic routes

Your app needs these features, so Vercel is the right choice!

---

## 🔗 **Useful Links:**

- **Vercel Dashboard:** https://vercel.com/dashboard
- **Firebase Console:** https://console.firebase.google.com/project/selvacoreapp01
- **Vercel Custom Domain Docs:** https://vercel.com/docs/concepts/projects/domains

---

**🎉 Your app is already live on Vercel! Just add custom domain if you want `selvacoreapp01.web.app` URL.**

