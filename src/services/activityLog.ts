import { collection, addDoc, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { ActivityType, ActivityActor, ActivityLog } from '../types';

interface LogActivityParams {
  applicationId: string;
  applicantName: string;
  applicantEmail: string;
  activityType: ActivityType;
  actor: ActivityActor;
  actorId: string;
  actorName: string;
  details: string;
  metadata?: {
    oldValue?: string;
    newValue?: string;
    documentType?: string;
    notificationTitle?: string;
    [key: string]: any;
  };
}

/**
 * Log an activity to Firestore
 * This will create a record in the 'activityLogs' collection
 * and trigger webhook notifications to staff
 */
export const logActivity = async (params: LogActivityParams): Promise<void> => {
  try {
    const activityLog: Omit<ActivityLog, 'id'> = {
      applicationId: params.applicationId,
      applicantName: params.applicantName,
      applicantEmail: params.applicantEmail,
      timestamp: Date.now(),
      activityType: params.activityType,
      actor: params.actor,
      actorId: params.actorId,
      actorName: params.actorName,
      details: params.details,
      metadata: params.metadata,
    };

    const logsCollection = collection(db, 'activityLogs');
    await addDoc(logsCollection, activityLog);

    console.log('Activity logged:', params.activityType, params.details);
  } catch (error) {
    console.error('Error logging activity:', error);
    // Don't throw - logging failures shouldn't break the main flow
  }
};

/**
 * Get recent activity logs for a specific application
 */
export const getApplicationActivityLogs = async (
  applicationId: string,
  limitCount: number = 50
): Promise<ActivityLog[]> => {
  try {
    const logsCollection = collection(db, 'activityLogs');
    const q = query(
      logsCollection,
      where('applicationId', '==', applicationId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const logs: ActivityLog[] = [];

    querySnapshot.forEach((doc) => {
      logs.push({
        id: doc.id,
        ...doc.data(),
      } as ActivityLog);
    });

    return logs;
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    return [];
  }
};

/**
 * Get all recent activity logs (for admin dashboard overview)
 */
export const getAllActivityLogs = async (limitCount: number = 100): Promise<ActivityLog[]> => {
  try {
    const logsCollection = collection(db, 'activityLogs');
    const q = query(
      logsCollection,
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const logs: ActivityLog[] = [];

    querySnapshot.forEach((doc) => {
      logs.push({
        id: doc.id,
        ...doc.data(),
      } as ActivityLog);
    });

    return logs;
  } catch (error) {
    console.error('Error fetching all activity logs:', error);
    return [];
  }
};
