# 🌐 Add Custom Domain: selvacoreapp01.web.app to Vercel

## 📋 **Step-by-Step Guide**

### **Step 1: Go to Vercel Dashboard**

1. Open: https://vercel.com/dashboard
2. Sign in if needed
3. Find your project (should be named `selvacoreapp01` or `SelvacoreApp`)
4. Click on the project

---

### **Step 2: Add Custom Domain**

1. In your project, click **"Settings"** (top menu)
2. Click **"Domains"** (left sidebar)
3. You'll see a section "Domains"
4. In the input box, type: `selvacoreapp01.web.app`
5. Click **"Add"**

---

### **Step 3: Configure DNS Records**

After adding the domain, Vercel will show you DNS configuration needed.

#### **You'll see something like:**

```
Type: CNAME
Name: selvacoreapp01.web.app (or @)
Value: cname.vercel-dns.com
```

**Copy these values!** You'll need them for the next step.

---

### **Step 4: Update Firebase Hosting DNS**

Since `selvacoreapp01.web.app` is a Firebase Hosting domain, you need to update it:

#### **Option A: Point to Vercel (Recommended)**

1. Go to: https://console.firebase.google.com/project/selvacoreapp01/hosting
2. Look for DNS settings or custom domain options
3. If Firebase doesn't allow custom DNS for `.web.app` domains, see Option B

#### **Option B: Use Firebase as Proxy to Vercel**

Firebase `.web.app` domains are managed by Firebase. You have two choices:

**Choice 1: Use `selvacoreapp01.vercel.app` directly**
- This is the easiest option
- No DNS configuration needed
- Works immediately

**Choice 2: Register a custom domain (like `selvacoreapp.com`)**
- Buy a domain from GoDaddy, Namecheap, etc.
- Add it to Vercel
- Full control over DNS

---

### **Step 5: Alternative - Use Firebase Custom Domain Feature**

If you own a domain (not `.web.app`), you can:

1. Buy a domain like `selvacoreapp.com`
2. Add it to Vercel
3. Point it to your Vercel deployment

---

## 🎯 **Quick Summary:**

### **Problem:**
- `selvacoreapp01.web.app` is owned by Firebase
- Firebase `.web.app` domains cannot be pointed to other services
- It's a Firebase-managed domain

### **Solutions:**

#### **Solution 1: Use Vercel URL (Easiest) ✅**
- URL: `https://selvacoreapp01.vercel.app`
- No setup needed
- Already working

#### **Solution 2: Buy Custom Domain**
- Buy: `selvacoreapp.com` or similar
- Add to Vercel
- Full control

#### **Solution 3: Use Firebase Subdomain**
- Keep Firebase backend
- Deploy frontend to Vercel
- Use `app.yourcompany.com` pattern

---

## 🔍 **Understanding `.web.app` Domains:**

Firebase `.web.app` domains are:
- ✅ Free domains from Google
- ✅ Automatically provisioned
- ❌ **Cannot be transferred to other services**
- ❌ **Cannot change DNS records**
- ❌ **Only work with Firebase Hosting**

**This means:** `selvacoreapp01.web.app` can ONLY point to Firebase Hosting, not Vercel.

---

## 💡 **Recommended Approach:**

### **Option A: Use Vercel URL**

**Your URLs:**
- Main site: `https://selvacoreapp01.vercel.app`
- Admin: `https://selvacoreapp01.vercel.app/admin`

**Pros:**
- ✅ Free
- ✅ Already working
- ✅ Professional
- ✅ SSL included

**Share these URLs with your users!**

---

### **Option B: Buy a Custom Domain**

**Example domains to buy ($10-15/year):**
- `selvacoreapp.com`
- `selvacore.app`
- `selvacore.io`

**Then:**
1. Buy domain from Namecheap, GoDaddy, etc.
2. Add to Vercel
3. Point DNS to Vercel
4. Done!

---

## 🚀 **Current Status:**

✅ **Your app is LIVE right now at:**
- `https://selvacoreapp01.vercel.app`

✅ **Everything works:**
- Language selection (EN, PT, ES, KO)
- Customer/Technician login
- Admin portal at `/admin`
- Firebase Auth, Firestore, Storage

---

## 📝 **Next Steps:**

### **If Using Vercel URL:**
1. ✅ Share `selvacoreapp01.vercel.app` with users
2. ✅ Test the site
3. ✅ Update Firestore rules (if not done)
4. ✅ Done!

### **If Buying Custom Domain:**
1. Buy domain (e.g., `selvacoreapp.com`)
2. Add to Vercel (Settings → Domains)
3. Update DNS records (provided by Vercel)
4. Wait for DNS propagation (1-24 hours)
5. Done!

---

## 🎉 **Your App is Already Live!**

**URL:** https://selvacoreapp01.vercel.app

Try it now:
1. Go to the URL
2. Select a language
3. Sign in with Google
4. See your app working!

**Admin:** https://selvacoreapp01.vercel.app/admin

---

## ❓ **Questions?**

**Q: Can I use `selvacoreapp01.web.app`?**
A: Not with Vercel. Firebase `.web.app` domains only work with Firebase Hosting static files, and your app needs a Node.js server.

**Q: Is Vercel free?**
A: Yes! Vercel free tier is perfect for your app.

**Q: How do I get a custom domain?**
A: Buy one from Namecheap ($10/year) and add it to Vercel.

**Q: Can I use both Firebase and Vercel?**
A: Yes! Firebase for database/auth, Vercel for hosting. (This is what you're doing now!)

---

**🎊 Your app is production-ready at `selvacoreapp01.vercel.app`!**

