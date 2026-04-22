#!/bin/bash

# Firebase Deployment Script (SSR + Cloud Functions)
# Deploys the Next.js SSR app via Firebase App Hosting
# and Cloud Functions for server-side validation

set -e

echo "Starting Firebase Deployment..."
echo ""

# Step 1: Check Firebase login
echo "Step 1: Checking Firebase authentication..."
firebase projects:list > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "Not logged in to Firebase. Please run: firebase login"
    exit 1
fi
echo "Firebase authenticated"
echo ""

# Step 2: Set Firebase project
echo "Step 2: Setting Firebase project to selvacoreapp01..."
firebase use selvacoreapp01
if [ $? -ne 0 ]; then
    echo "Failed to set Firebase project. Make sure selvacoreapp01 exists."
    exit 1
fi
echo "Firebase project set to selvacoreapp01"
echo ""

# Step 3: Lint the code
echo "Step 3: Running linter..."
npm run lint
if [ $? -ne 0 ]; then
    echo "Lint failed. Please fix the errors above before deploying."
    exit 1
fi
echo "Lint passed"
echo ""

# Step 4: Run tests
echo "Step 4: Running tests..."
npm run test
if [ $? -ne 0 ]; then
    echo "Tests failed. Please fix the errors above before deploying."
    exit 1
fi
echo "Tests passed"
echo ""

# Step 5: Build the app (standalone SSR output)
echo "Step 5: Building production app..."
npm run build
if [ $? -ne 0 ]; then
    echo "Build failed. Please check the errors above."
    exit 1
fi
echo "Build successful"
echo ""

# Step 6: Build Cloud Functions
echo "Step 6: Building Cloud Functions..."
cd functions && npm run build && cd ..
if [ $? -ne 0 ]; then
    echo "Cloud Functions build failed."
    exit 1
fi
echo "Cloud Functions build successful"
echo ""

# Step 7: Deploy Firestore rules
echo "Step 7: Deploying Firestore rules..."
firebase deploy --only firestore:rules
if [ $? -ne 0 ]; then
    echo "Firestore rules deployment failed."
    exit 1
fi
echo "Firestore rules deployed"
echo ""

# Step 8: Deploy Cloud Functions
echo "Step 8: Deploying Cloud Functions..."
firebase deploy --only functions
if [ $? -ne 0 ]; then
    echo "Cloud Functions deployment failed."
    exit 1
fi
echo "Cloud Functions deployed"
echo ""

# Step 9: Deploy to Firebase Hosting (SSR via Cloud Run rewrite)
echo "Step 9: Deploying to Firebase Hosting..."
firebase deploy --only hosting
if [ $? -ne 0 ]; then
    echo "Hosting deployment failed."
    exit 1
fi
echo "Hosting deployed"
echo ""

# Done
echo "Deployment Complete!"
echo ""
echo "Your app is now live at:"
echo "  https://selvacoreapp01.web.app"
echo "  https://selvacoreapp01.firebaseapp.com"
echo ""
echo "Portals:"
echo "  Admin:      https://selvacoreapp01.web.app/admin"
echo "  Sub-Admin:  https://selvacoreapp01.web.app/sub-admin"
echo "  Customer:   https://selvacoreapp01.web.app/customer"
echo "  Technician: https://selvacoreapp01.web.app/technician"
echo ""
echo "Note: For full SSR support, set up Firebase App Hosting:"
echo "  firebase apphosting:backends:create selvacoreapp01"
echo "  See: https://firebase.google.com/docs/app-hosting"
echo ""
