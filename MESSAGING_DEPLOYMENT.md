# Direct Messaging System - Deployment Guide

This guide explains how to deploy the new direct messaging feature to your Firebase project.

## Overview

The direct messaging system allows real-time communication between applicants and staff, including:
- Bi-directional messaging (applicants ↔ staff)
- Real-time message delivery
- Unread message indicators
- Read receipts
- Message history for reference (resolves "missed" notifications issue)

## Files Changed/Added

### New Files
1. `src/services/messaging.ts` - Messaging service with Firestore operations
2. `src/components/MessagingPanel.tsx` - Chat UI component
3. `src/components/UnreadMessageBadge.tsx` - Unread count indicator

### Modified Files
1. `src/types.ts` - Added Message and MessageSender types
2. `src/pages/Status.tsx` - Added messaging panel for applicants
3. `src/pages/AdminDashboard.tsx` - Added messaging panel for staff
4. `firestore.rules` - Added security rules for messages collection
5. `firestore.indexes.json` - Added composite indexes for efficient queries
6. `CLAUDE.md` - Added messaging system documentation

## Deployment Steps

### 1. Deploy Firestore Security Rules

```bash
firebase deploy --only firestore:rules
```

This will update the security rules to allow the `messages` collection with proper validation.

### 2. Deploy Firestore Indexes

```bash
firebase deploy --only firestore:indexes
```

This creates the necessary composite indexes for:
- Retrieving messages in conversation order
- Counting unread messages efficiently

**Note:** Index creation can take several minutes. You can monitor progress in the Firebase Console under Firestore → Indexes.

### 3. Build and Deploy Frontend

```bash
npm run build
firebase deploy --only hosting
```

Or if deploying to Vercel:
```bash
git add .
git commit -m "Add direct messaging system"
git push
```

## Testing the Feature

### As an Applicant
1. Log in to your status page
2. Scroll to the bottom to see the "Messages" section
3. Send a test message to staff
4. The message should appear immediately in the chat
5. Check that the unread badge appears next to "Messages" header

### As Staff (Admin)
1. Log in to admin dashboard
2. Look for red unread badges next to applicant names in the list
3. Click "View / Update" on an applicant
4. Scroll to the "Direct Messages" section
5. Send a reply to the applicant
6. Check that messages appear in real-time
7. Verify read receipts show "✓ Sent" or "✓✓ Read"

## Firestore Collection Structure

The new `messages` collection will be auto-created when the first message is sent. Each message document contains:

```typescript
{
  applicationId: string,      // UID of the applicant
  senderId: string,           // UID of sender (applicant or staff)
  senderName: string,         // Display name
  senderType: 'Applicant' | 'Staff',
  message: string,            // Message content (max 5000 chars)
  timestamp: number,          // Unix timestamp
  isRead: boolean,            // Whether recipient has read it
  readAt?: number            // When it was read (optional)
}
```

## Security Features

- **Authentication required**: Only authenticated users can send messages
- **Applicant isolation**: Applicants can only access their own conversation
- **Staff access**: Admins can access all conversations
- **Sender verification**: senderId must match authenticated user (prevents impersonation)
- **Immutable messages**: Messages cannot be edited or deleted after sending
- **Read-only updates**: Only the isRead and readAt fields can be updated

## Performance Considerations

- Messages use Firestore real-time listeners for instant delivery
- Unread counts are calculated efficiently using composite indexes
- Messages auto-scroll to the latest when new ones arrive
- Character limit of 5000 per message prevents abuse

## Troubleshooting

### Messages not appearing
1. Check browser console for Firestore errors
2. Verify indexes have finished building in Firebase Console
3. Check that security rules deployed successfully

### Unread badges not showing
1. Ensure composite index for unread counts is active
2. Check that markConversationAsRead is being called when viewing messages
3. Verify user type (Staff vs Applicant) is correct

### Permission errors
1. Verify Firestore rules deployed with: `firebase deploy --only firestore:rules`
2. Check that user is authenticated before sending messages
3. Ensure admin users are properly configured in `admins` collection

## Future Enhancements (Optional)

If you want to extend the messaging system, consider:
- File attachments (requires Storage integration)
- Message notifications via FCM when new message received
- Typing indicators
- Message search functionality
- Bulk message archiving for staff

## Support

For issues or questions about the messaging system, refer to:
- `CLAUDE.md` - Complete architecture documentation
- `src/services/messaging.ts` - Service implementation with inline comments
- Firebase Console → Firestore → Rules/Indexes for configuration
