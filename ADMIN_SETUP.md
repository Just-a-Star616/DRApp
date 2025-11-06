# Admin Dashboard Setup Guide

This guide walks you through setting up the admin dashboard for managing driver applications.

## Prerequisites

1. Complete the Firebase setup (see FIREBASE_SETUP.md)
2. Complete the FCM setup (see FCM_SETUP.md)
3. Enable Google Sign-In in Firebase Console

## Step 1: Enable Google Sign-In

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `drapp-426`
3. Navigate to **Authentication** → **Sign-in method**
4. Click on **Google** provider
5. Click **Enable**
6. Add your **Project support email**
7. Click **Save**

## Step 2: Configure Authorized Domains

1. In Firebase Console → **Authentication** → **Settings** → **Authorized domains**
2. Add your Vercel domain: `drapp-426.vercel.app`
3. `localhost` should already be there for local development

## Step 3: Create Admin Users in Firestore

You need to manually add admin users to Firestore:

1. Go to Firebase Console → **Firestore Database**
2. Create a new collection called `admins`
3. Click **Add document**
4. For **Document ID**: Use the user's UID (you'll get this after they sign in once)
5. Add fields:
   ```
   email: "admin@example.com"
   role: "admin"
   createdAt: (current timestamp)
   ```
6. Click **Save**

### How to get a user's UID:

**Option A: Have them sign in first**
1. Ask the admin user to visit your site at `/#/admin/login`
2. They will see an "Access denied" error
3. Check the browser console or Firebase Console → **Authentication** → **Users**
4. Copy their UID
5. Add them to the `admins` collection as described above

**Option B: Create auth user manually**
1. Go to Firebase Console → **Authentication** → **Users**
2. Click **Add user**
3. Enter their email (password not needed since they'll use Google Sign-In)
4. Copy the generated UID
5. Add them to the `admins` collection with that UID

## Step 4: Security Rules (Already Deployed)

The Firestore security rules have been deployed. They ensure:
- Only admins can read the `admins` collection
- Only admins can update application statuses
- Only admins can access all applications
- Regular users can only access their own application

## Step 5: Test Admin Access

1. Go to `https://drapp-426.vercel.app/#/admin/login`
2. Click **Sign in with Google**
3. Use an email that's been added to the `admins` collection
4. You should be redirected to `/admin/dashboard`

## Admin Dashboard Features

### Application Management
- **View all applications**: Real-time list of all submitted applications
- **Search**: Filter by name, email, phone, or area
- **Status filter**: Filter by application status
- **Sorting**: Applications sorted by submission date (newest first)

### Application Details
- Click "View / Update" on any application to see full details
- View contact information
- View license and vehicle details
- Download uploaded documents
- Update application status

### Status Updates
When you update an application status:
1. The change is saved to Firestore immediately
2. A push notification is sent to the applicant (if they enabled notifications)
3. The applicant sees the updated status in real-time

### Stats Dashboard
The dashboard shows:
- Total applications
- Applications under review
- Approved applications
- New (submitted) applications

## Notifications

### Google Chat Notifications
New applications trigger Google Chat notifications automatically (already configured).

### Push Notifications to Applicants
When you update an application status:
- Applicants who enabled notifications receive a push notification
- The notification includes your company name and logo from Firestore config
- Notifications work even when the app is closed (via service worker)

## Troubleshooting

### "Access denied" Error
- Verify the user's email is in the `admins` collection in Firestore
- Check that the document ID in `admins` collection matches the user's UID
- Check browser console for detailed error messages

### Can't see applications
- Verify Firestore security rules are deployed: `firebase deploy --only firestore:rules`
- Check that applications exist in Firestore Database
- Ensure you're signed in as an admin

### Status updates not working
- Check Cloud Functions logs: `firebase functions:log`
- Verify the `sendPushNotification` function is deployed
- Check that FCM tokens are being saved in `fcmTokens` collection

### Push notifications not received
- Verify the applicant granted notification permissions
- Check that FCM token exists in `fcmTokens/{userId}`
- Check Cloud Functions logs for errors
- Verify VAPID key is correct in `src/services/firebase.ts`

## Security Best Practices

1. **Never share admin credentials**: Each admin should use their own Google account
2. **Regular audits**: Periodically review the `admins` collection and remove inactive admins
3. **Monitor logs**: Check Cloud Functions logs regularly for unauthorized access attempts
4. **Use environment-specific configs**: Consider separate Firebase projects for dev/staging/production

## Adding/Removing Admins

### Adding a new admin:
1. Have them sign in at `/#/admin/login` (they'll get access denied)
2. Get their UID from Firebase Console → Authentication → Users
3. Add a document to `admins` collection with their UID as document ID
4. Add fields: `email`, `role: "admin"`, `createdAt`

### Removing an admin:
1. Go to Firebase Console → Firestore Database → `admins` collection
2. Delete their document
3. They will immediately lose admin access
4. (Optional) Delete their auth account from Firebase Console → Authentication → Users

## Managing Application Statuses

The app supports these statuses (defined in `src/types.ts`):
- **Submitted**: Initial status when application is received
- **Under Review**: Application is being reviewed by staff
- **Contacted**: Applicant has been contacted
- **Meeting Scheduled**: Interview/meeting is scheduled
- **Approved**: Application approved
- **Rejected**: Application rejected

You can customize these statuses by:
1. Updating the `ApplicationStatus` enum in `src/types.ts`
2. Updating the `statusSteps` in Firestore `configs/defaultConfig`
3. Rebuilding and deploying the app

## Next Steps

- Review FCM_SETUP.md to configure push notifications
- Test the full workflow: application submission → status update → notification
- Customize the status steps in Firestore config
- Set up backup admin accounts for redundancy
