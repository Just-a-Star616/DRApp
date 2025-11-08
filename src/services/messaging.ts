import { db } from './firebase';
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  getDocs,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { Message, MessageSender } from '../types';

/**
 * Send a new message in a conversation
 */
export const sendMessage = async (
  applicationId: string,
  senderId: string,
  senderName: string,
  senderType: MessageSender,
  message: string
): Promise<void> => {
  try {
    const messagesRef = collection(db, 'messages');
    await addDoc(messagesRef, {
      applicationId,
      senderId,
      senderName,
      senderType,
      message: message.trim(),
      timestamp: Date.now(),
      isRead: false,
    });
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

/**
 * Subscribe to messages for a specific application
 * Returns unsubscribe function
 */
export const subscribeToMessages = (
  applicationId: string,
  callback: (messages: Message[]) => void
): (() => void) => {
  const messagesRef = collection(db, 'messages');
  const q = query(
    messagesRef,
    where('applicationId', '==', applicationId),
    orderBy('timestamp', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const messages: Message[] = [];
    snapshot.forEach((doc) => {
      messages.push({ id: doc.id, ...doc.data() } as Message);
    });
    callback(messages);
  }, (error) => {
    console.error('Error subscribing to messages:', error);
  });
};

/**
 * Mark a message as read
 */
export const markMessageAsRead = async (messageId: string): Promise<void> => {
  try {
    const messageRef = doc(db, 'messages', messageId);
    await updateDoc(messageRef, {
      isRead: true,
      readAt: Date.now(),
    });
  } catch (error) {
    console.error('Error marking message as read:', error);
    throw error;
  }
};

/**
 * Mark all unread messages in a conversation as read for a specific recipient type
 */
export const markConversationAsRead = async (
  applicationId: string,
  recipientType: MessageSender
): Promise<void> => {
  try {
    const messagesRef = collection(db, 'messages');

    // Query for unread messages sent by the other party
    const senderType = recipientType === MessageSender.Staff ? MessageSender.Applicant : MessageSender.Staff;
    const q = query(
      messagesRef,
      where('applicationId', '==', applicationId),
      where('senderType', '==', senderType),
      where('isRead', '==', false)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) return;

    // Batch update all unread messages
    const batch = writeBatch(db);
    snapshot.forEach((docSnap) => {
      batch.update(docSnap.ref, {
        isRead: true,
        readAt: Date.now(),
      });
    });

    await batch.commit();
  } catch (error) {
    console.error('Error marking conversation as read:', error);
    throw error;
  }
};

/**
 * Get unread message count for a specific application and recipient type
 */
export const getUnreadCount = async (
  applicationId: string,
  recipientType: MessageSender
): Promise<number> => {
  try {
    const messagesRef = collection(db, 'messages');

    // Count messages sent by the other party that are unread
    const senderType = recipientType === MessageSender.Staff ? MessageSender.Applicant : MessageSender.Staff;
    const q = query(
      messagesRef,
      where('applicationId', '==', applicationId),
      where('senderType', '==', senderType),
      where('isRead', '==', false)
    );

    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
};

/**
 * Subscribe to unread count for a specific application and recipient type
 */
export const subscribeToUnreadCount = (
  applicationId: string,
  recipientType: MessageSender,
  callback: (count: number) => void
): (() => void) => {
  const messagesRef = collection(db, 'messages');

  // Count messages sent by the other party that are unread
  const senderType = recipientType === MessageSender.Staff ? MessageSender.Applicant : MessageSender.Staff;
  const q = query(
    messagesRef,
    where('applicationId', '==', applicationId),
    where('senderType', '==', senderType),
    where('isRead', '==', false)
  );

  return onSnapshot(q, (snapshot) => {
    callback(snapshot.size);
  }, (error) => {
    console.error('Error subscribing to unread count:', error);
  });
};

/**
 * Get all conversations with unread counts for staff dashboard
 */
export const subscribeToAllConversations = (
  callback: (conversations: Map<string, { unreadCount: number, lastMessage?: Message }>) => void
): (() => void) => {
  const messagesRef = collection(db, 'messages');
  const q = query(messagesRef, orderBy('timestamp', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const conversations = new Map<string, { unreadCount: number, lastMessage?: Message }>();

    snapshot.forEach((doc) => {
      const message = { id: doc.id, ...doc.data() } as Message;
      const { applicationId } = message;

      if (!conversations.has(applicationId)) {
        conversations.set(applicationId, { unreadCount: 0 });
      }

      const conversation = conversations.get(applicationId)!;

      // Set last message if not already set (since ordered by timestamp desc)
      if (!conversation.lastMessage) {
        conversation.lastMessage = message;
      }

      // Count unread messages from applicants (for staff)
      if (message.senderType === MessageSender.Applicant && !message.isRead) {
        conversation.unreadCount++;
      }
    });

    callback(conversations);
  }, (error) => {
    console.error('Error subscribing to conversations:', error);
  });
};
