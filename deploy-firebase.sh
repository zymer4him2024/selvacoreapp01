#!/bin/bash

# Firebase Hosting Deployment Script
# This script deploys the app to selvacoreapp01.web.app

echo "🚀 Starting Firebase Hosting Deployment..."
echo ""

# Step 1: Check Firebase login
echo "📋 Step 1: Checking Firebase authentication..."
firebase projects:list > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "❌ Not logged in to Firebase. Please run: firebase login"
    exit 1
fi
echo "✅ Firebase authenticated"
echo ""

# Step 2: Set Firebase project
echo "📋 Step 2: Setting Firebase project to selvacoreapp01..."
firebase use selvacoreapp01
if [ $? -ne 0 ]; then
    echo "❌ Failed to set Firebase project. Make sure selvacoreapp01 exists."
    exit 1
fi
echo "✅ Firebase project set to selvacoreapp01"
echo ""

# Step 3: Build the app
echo "📋 Step 3: Building production app..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please check the errors above."
    exit 1
fi
echo "✅ Build successful"
echo ""

# Step 4: Deploy to Firebase Hosting
echo "📋 Step 4: Deploying to Firebase Hosting..."
firebase deploy --only hosting
if [ $? -ne 0 ]; then
    echo "❌ Deployment failed. Please check the errors above."
    exit 1
fi
echo "✅ Deployment successful"
echo ""

# Step 5: Show URLs
echo "🎉 Deployment Complete!"
echo ""
echo "Your app is now live at:"
echo "  🌐 https://selvacoreapp01.web.app"
echo "  🌐 https://selvacoreapp01.firebaseapp.com"
echo ""
echo "Admin Portal:"
echo "  👑 https://selvacoreapp01.web.app/admin"
echo ""
echo "Next steps:"
echo "  1. Update Firestore rules in Firebase Console"
echo "  2. Test customer flow at https://selvacoreapp01.web.app"
echo "  3. Test admin flow at https://selvacoreapp01.web.app/admin"
echo ""

