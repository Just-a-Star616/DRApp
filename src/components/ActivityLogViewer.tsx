import React, { useState, useEffect } from 'react';
import { ActivityLog, ActivityType, ActivityActor } from '../types';
import { getApplicationActivityLogs, getAllActivityLogs } from '../services/activityLog';

interface ActivityLogViewerProps {
  applicationId?: string; // If provided, show logs for specific application
  limit?: number;
}

const ActivityLogViewer: React.FC<ActivityLogViewerProps> = ({
  applicationId,
  limit = 50,
}) => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      setError('');
      try {
        const fetchedLogs = applicationId
          ? await getApplicationActivityLogs(applicationId, limit)
          : await getAllActivityLogs(limit);
        setLogs(fetchedLogs);
      } catch (err) {
        console.error('Error fetching activity logs:', err);
        setError('Failed to load activity logs');
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [applicationId, limit]);

  const getActivityIcon = (activityType: ActivityType) => {
    switch (activityType) {
      case ActivityType.StatusUpdate:
        return '🔄';
      case ActivityType.NotificationSent:
        return '🔔';
      case ActivityType.DocumentUploadedByStaff:
        return '📤';
      case ActivityType.ApplicationSubmitted:
        return '📝';
      case ActivityType.DocumentUploadedByApplicant:
        return '📄';
      case ActivityType.InformationUpdated:
        return '✏️';
      case ActivityType.VehicleAdded:
        return '🚗';
      case ActivityType.DBSNumberAdded:
        return '🔐';
      case ActivityType.UnlicensedProgressUpdated:
        return '✅';
      default:
        return '📋';
    }
  };

  const getActorBadgeColor = (actor: ActivityActor) => {
    switch (actor) {
      case ActivityActor.Staff:
        return 'bg-purple-900/50 text-purple-300';
      case ActivityActor.Applicant:
        return 'bg-cyan-900/50 text-cyan-300';
      case ActivityActor.System:
        return 'bg-slate-800/50 text-slate-400';
      default:
        return 'bg-slate-800/50 text-slate-400';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <svg
          className="animate-spin h-8 w-8 text-cyan-400"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-900/20 border border-red-700 rounded-lg text-red-300">
        {error}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center p-8 text-slate-400">
        No activity logs found
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white mb-4">
        Activity History {applicationId ? '' : '(All Applications)'}
      </h3>

      <div className="space-y-3">
        {logs.map((log) => (
          <div
            key={log.id}
            className="p-4 bg-slate-900/50 rounded-lg border border-sky-800 hover:border-sky-700 transition-colors"
          >
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className="text-2xl flex-shrink-0">
                {getActivityIcon(log.activityType)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-white">
                      {log.activityType}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {log.details}
                    </p>
                  </div>
                  <span className="text-xs text-slate-500 whitespace-nowrap">
                    {formatTimestamp(log.timestamp)}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {/* Actor Badge */}
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${getActorBadgeColor(
                      log.actor
                    )}`}
                  >
                    {log.actorName}
                  </span>

                  {/* Applicant Name (only show if viewing all applications) */}
                  {!applicationId && (
                    <span className="text-xs text-slate-400">
                      • {log.applicantName}
                    </span>
                  )}

                  {/* Metadata badges */}
                  {log.metadata?.documentCount && (
                    <span className="px-2 py-0.5 rounded text-xs bg-green-900/30 text-green-300">
                      {log.metadata.documentCount} doc{log.metadata.documentCount > 1 ? 's' : ''}
                    </span>
                  )}

                  {log.metadata?.oldValue && log.metadata?.newValue && (
                    <span className="text-xs text-slate-400">
                      {log.metadata.oldValue} → {log.metadata.newValue}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActivityLogViewer;
