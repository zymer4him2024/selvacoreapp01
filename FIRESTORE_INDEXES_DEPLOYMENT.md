# 🔥 Firestore Indexes Deployment Guide

## 🚨 **CRITICAL: Technician Dashboard Won't Work Without These Indexes!**

The technician dashboard requires specific Firestore composite indexes to query orders efficiently. Without these indexes, the queries will fail.

---

## 📋 **Required Indexes**

### **Index 1: Orders by Status and Creation Date**
**Purpose:** For technicians to browse available jobs (pending orders)

```json
Collection: orders
Fields:
  - status (Ascending)
  - createdAt (Descending)
```

### **Index 2: Orders by Technician, Status, and Installation Date**
**Purpose:** For technicians to view their jobs filtered by status

```json
Collection: orders
Fields:
  - technicianId (Ascending)
  - status (Ascending)
  - installationDate (Ascending)
```

### **Index 3: Orders by Technician and Installation Date**
**Purpose:** For technicians to view all their jobs sorted by date

```json
Collection: orders
Fields:
  - technicianId (Ascending)
  - installationDate (Ascending)
```

---

## 🛠️ **How to Deploy Indexes**

### **Method 1: Firebase Console (Recommended)**

1. **Go to Firebase Console:**
   - Open: https://console.firebase.google.com/
   - Select your project: `selvacoreapp01`

2. **Navigate to Firestore Database:**
   - Click "Firestore Database" in the left menu
   - Click the "Indexes" tab at the top

3. **Create Index 1 (Status + CreatedAt):**
   - Click "Create Index"
   - Collection ID: `orders`
   - Add Field 1:
     - Field path: `status`
     - Order: `Ascending`
   - Add Field 2:
     - Field path: `createdAt`
     - Order: `Descending`
   - Query scope: `Collection`
   - Click "Create"
   - **Wait 2-5 minutes for index to build**

4. **Create Index 2 (TechnicianId + Status + InstallationDate):**
   - Click "Create Index"
   - Collection ID: `orders`
   - Add Field 1:
     - Field path: `technicianId`
     - Order: `Ascending`
   - Add Field 2:
     - Field path: `status`
     - Order: `Ascending`
   - Add Field 3:
     - Field path: `installationDate`
     - Order: `Ascending`
   - Query scope: `Collection`
   - Click "Create"
   - **Wait 2-5 minutes for index to build**

5. **Create Index 3 (TechnicianId + InstallationDate):**
   - Click "Create Index"
   - Collection ID: `orders`
   - Add Field 1:
     - Field path: `technicianId`
     - Order: `Ascending`
   - Add Field 2:
     - Field path: `installationDate`
     - Order: `Ascending`
   - Query scope: `Collection`
   - Click "Create"
   - **Wait 2-5 minutes for index to build**

---

### **Method 2: Firebase CLI (Alternative)**

If you have Firebase CLI installed and authenticated:

```bash
cd /Users/shawnshlee/CursorAI/SelvacoreApp/Selvacoreapp01
firebase deploy --only firestore:indexes
```

**Note:** This requires Firebase CLI authentication. If you get an error, use Method 1 instead.

---

## ✅ **Verify Indexes Are Built**

1. Go to Firebase Console → Firestore Database → Indexes
2. Check that all 3 new indexes show status: **"Enabled"** (green)
3. If status is "Building", wait a few more minutes

---

## 🧪 **Test After Deployment**

1. **Open your app:** https://selvacoreapp01.vercel.app
2. **Login as technician**
3. **Go to technician dashboard:** `/technician`
4. **You should see:** 8 pending orders displayed
5. **Check browser console** for debug logs:
   ```
   🔍 TECHNICIAN SERVICE - Fetching available jobs...
   🔍 TECHNICIAN SERVICE - Executing query...
   🔍 TECHNICIAN SERVICE - Query result: 8 orders found
   🔍 TECHNICIAN SERVICE - Returning 8 orders
   ```

---

## 🐛 **Troubleshooting**

### **Issue: Still seeing "No jobs available"**

**Check Console for Errors:**
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for error messages starting with `❌ TECHNICIAN SERVICE`

**Common Errors:**

#### **Error: "The query requires an index"**
```
❌ Error code: failed-precondition
❌ Error message: The query requires an index
```
**Solution:** Indexes are still building. Wait 5 more minutes.

#### **Error: "Missing or insufficient permissions"**
```
❌ Error code: permission-denied
```
**Solution:** 
1. Check Firestore rules are deployed
2. Verify user is logged in as technician
3. Check user role in Firebase Console → Firestore → users collection

#### **Error: "Network error"**
```
❌ Error code: unavailable
```
**Solution:** Check internet connection and Firebase project status.

---

## 📊 **Expected Results**

### **Before Index Deployment:**
- Technician dashboard shows: "No jobs available"
- Console shows: `❌ Error: The query requires an index`

### **After Index Deployment:**
- Technician dashboard shows: 8 job cards
- Console shows: `🔍 Query result: 8 orders found`
- Jobs are sorted by creation date (newest first)

---

## 🎯 **Summary**

**What You Need to Do:**

1. ✅ Go to Firebase Console
2. ✅ Create 3 composite indexes (see Method 1 above)
3. ✅ Wait 2-5 minutes for indexes to build
4. ✅ Refresh technician dashboard
5. ✅ Verify 8 pending orders appear

**Time Required:** ~10 minutes total (including index build time)

---

## 📝 **Index Status Checklist**

- [ ] Index 1: `orders` (status + createdAt) - Status: Enabled
- [ ] Index 2: `orders` (technicianId + status + installationDate) - Status: Enabled
- [ ] Index 3: `orders` (technicianId + installationDate) - Status: Enabled
- [ ] Technician dashboard shows pending orders
- [ ] Debug logs show successful query

---

**Once all indexes are enabled, your technician dashboard will work perfectly!** 🎉

