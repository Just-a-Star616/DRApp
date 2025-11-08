import React, { useState, useEffect } from 'react';
import { MessageSender } from '../types';
import { subscribeToUnreadCount } from '../services/messaging';

interface UnreadMessageBadgeProps {
  applicationId: string;
  userType: MessageSender;
  className?: string;
}

const UnreadMessageBadge: React.FC<UnreadMessageBadgeProps> = ({
  applicationId,
  userType,
  className = '',
}) => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeToUnreadCount(applicationId, userType, (count) => {
      setUnreadCount(count);
    });

    return () => unsubscribe();
  }, [applicationId, userType]);

  if (unreadCount === 0) return null;

  return (
    <span
      className={`inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full ${className}`}
      title={`${unreadCount} unread message${unreadCount > 1 ? 's' : ''}`}
    >
      {unreadCount > 99 ? '99+' : unreadCount}
    </span>
  );
};

export default UnreadMessageBadge;
