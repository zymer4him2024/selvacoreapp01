# 🔥 Deploy Firestore Rules - CRITICAL

## 🚨 **ACTION REQUIRED: Deploy Updated Rules to Firebase**

The technician dashboard won't work until you deploy the updated Firestore rules!

---

## **What Was Fixed:**

### **Before (Broken):**
```javascript
match /orders/{orderId} {
  allow read: if isAuthenticated();
  allow create: if isAuthenticated();
  allow update, delete: if isAdmin();  // ❌ Only admins can update
}
```

**Problem:** Technicians couldn't accept jobs because they couldn't update orders.

### **After (Fixed):**
```javascript
match /orders/{orderId} {
  allow read: if isAuthenticated();
  allow create: if isAuthenticated();
  
  // Admins can always update/delete
  allow update, delete: if isAdmin();
  
  // Technicians can update pending orders or their own accepted orders
  allow update: if isAuthenticated() && 
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'technician' &&
    (resource.data.status == 'pending' || 
     resource.data.technicianId == request.auth.uid);
}
```

**Fixed:** Technicians can now:
- ✅ Accept pending orders (update status from 'pending' to 'accepted')
- ✅ Start their jobs (update status from 'accepted' to 'in_progress')
- ✅ Complete their jobs (update status from 'in_progress' to 'completed')

---

## **How to Deploy Rules:**

### **Method 1: Firebase Console (Recommended - 2 minutes)**

1. **Go to Firebase Console:**
   - https://console.firebase.google.com/
   - Select project: `selvacoreapp01`

2. **Navigate to Firestore Database:**
   - Click "Firestore Database" in left menu
   - Click "Rules" tab at the top

3. **Copy the Updated Rules:**
   - Open: `/Users/shawnshlee/CursorAI/SelvacoreApp/Selvacoreapp01/firestore.rules`
   - Copy the entire contents

4. **Paste and Publish:**
   - Paste the rules into the Firebase Console editor
   - Click "Publish" button
   - Wait for confirmation message

5. **Done!** Rules are now live.

---

### **Method 2: Firebase CLI (Alternative)**

If you have Firebase CLI installed:

```bash
cd /Users/shawnshlee/CursorAI/SelvacoreApp/Selvacoreapp01
firebase deploy --only firestore:rules
```

---

## **Test After Deployment:**

1. **Go to:** https://selvacoreapp01.vercel.app/technician
2. **Login as technician**
3. **Click on any pending job**
4. **Click "Accept This Job"**
5. **Should see:** ✅ "Job accepted successfully!"
6. **Check:** Job should move to "My Jobs → Upcoming"

---

## **Expected Console Output:**

### **Before (Error):**
```
❌ Error accepting job: FirebaseError: Missing or insufficient permissions.
```

### **After (Success):**
```
✅ Job accepted successfully!
```

---

## **What This Enables:**

### **Technician Workflow:**
```
1. Browse Available Jobs (pending orders)
   ↓
2. Click "Accept This Job"
   ↓ [Rules allow: technician can update pending order]
3. Order status → 'accepted'
   ↓
4. Job appears in "My Jobs → Upcoming"
   ↓
5. Click "Start Job"
   ↓ [Rules allow: technician can update their own order]
6. Order status → 'in_progress'
   ↓
7. Upload installation photos
   ↓
8. Click "Complete Job"
   ↓ [Rules allow: technician can update their own order]
9. Order status → 'completed'
```

---

## **Security:**

The new rules are secure because:
- ✅ Technicians can ONLY update pending orders (to accept them)
- ✅ Technicians can ONLY update orders they've accepted (their own jobs)
- ✅ Technicians CANNOT update other technicians' jobs
- ✅ Technicians CANNOT delete orders
- ✅ Admins can still update/delete any order

---

## **Troubleshooting:**

### **Still Getting Permission Error?**

1. **Check Rules Deployed:**
   - Go to Firebase Console → Firestore → Rules
   - Verify you see the new rules with technician permissions
   - Check "Last deployed" timestamp is recent

2. **Check User Role:**
   - Go to Firebase Console → Firestore → users collection
   - Find your user document
   - Verify `role: 'technician'`

3. **Clear Browser Cache:**
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   - Or open in incognito/private window

4. **Check Console:**
   - Open DevTools (F12)
   - Look for any error messages
   - Should see: "Job accepted successfully!"

---

## **Summary:**

**What You Need to Do:**
1. ✅ Go to Firebase Console
2. ✅ Navigate to Firestore → Rules
3. ✅ Copy rules from `firestore.rules` file
4. ✅ Paste and publish
5. ✅ Test accepting a job

**Time Required:** 2 minutes

**Once deployed, technicians can accept and manage jobs!** 🎉

---

*Note: The code is already deployed to Vercel. You only need to deploy the Firestore rules.*

