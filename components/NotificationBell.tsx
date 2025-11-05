import React, { useState, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';

// This is a VAPID public key. In a real application, you would generate your own pair of keys
// (public and private) and the private key would be stored securely on your server.
const VAPID_PUBLIC_KEY = 'BChkR-P-4-sD3g2cTnm-3kC-sfOqjYj4fL_2wJ8gX_X1rE-e_8cZ-u_n-n_fA-bC-d_E-g_H-i_J-k_L-m_N-o';

// Helper function to convert the VAPID key
const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
};

const NotificationBell: React.FC = () => {
    const { branding } = useAppContext();
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
    const [isLoading, setIsLoading] = useState(true);

    const isSupported = 'serviceWorker' in navigator && 'PushManager' in window;

    useEffect(() => {
        if (!isSupported) {
            setIsLoading(false);
            return;
        }

        setNotificationPermission(Notification.permission);

        navigator.serviceWorker.ready.then(registration => {
            registration.pushManager.getSubscription().then(subscription => {
                setIsSubscribed(!!subscription);
                setIsLoading(false);
            });
        });
    }, [isSupported]);
    
    const handleToggleSubscription = async () => {
        if (!isSupported) return;

        setIsLoading(true);

        const registration = await navigator.serviceWorker.ready;

        if (isSubscribed) {
            // Unsubscribe
            const subscription = await registration.pushManager.getSubscription();
            if (subscription) {
                await subscription.unsubscribe();
                // In a real app, you would also send a request to your server to remove the subscription.
                console.log('User unsubscribed.');
                setIsSubscribed(false);
            }
        } else {
            // Subscribe
            if (notificationPermission === 'default') {
                const permission = await Notification.requestPermission();
                setNotificationPermission(permission);
                if (permission !== 'granted') {
                    setIsLoading(false);
                    return;
                }
            }
            
            if (notificationPermission === 'granted' || (await Notification.requestPermission()) === 'granted') {
                 try {
                    const subscription = await registration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
                    });
                     // In a real app, you would send this subscription object to your backend server to store.
                    console.log('User is subscribed:', JSON.stringify(subscription));
                    setIsSubscribed(true);
                } catch (error) {
                    console.error('Failed to subscribe the user: ', error);
                }
            }
        }
        setIsLoading(false);
    };
    
    if (!isSupported || isLoading) {
        return (
            <button className={`p-2 rounded-full bg-slate-700 text-slate-400 cursor-wait`} disabled>
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            </button>
        );
    }

    if (notificationPermission === 'denied') {
        return (
            <div className="relative group">
                <button className="p-2 rounded-full bg-red-900/50 text-red-400 cursor-not-allowed" disabled>
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                </button>
                <div className="absolute bottom-full mb-2 w-60 right-0 bg-slate-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                    Notifications are blocked by your browser. Please update your site settings to enable them.
                </div>
            </div>
        );
    }
    
    const buttonColor = isSubscribed ? branding.primaryColor : 'slate';
    const hoverColor = isSubscribed ? branding.primaryColor : 'slate';
    const ringColor = isSubscribed ? branding.primaryColor : 'slate';

    return (
        <div className="relative group">
             <button
                onClick={handleToggleSubscription}
                className={`p-2 rounded-full bg-${buttonColor}-800/50 text-${buttonColor}-300 hover:bg-${hoverColor}-700/50 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${ringColor}-500 focus:ring-offset-slate-900 transition-colors`}
                aria-label={isSubscribed ? "Disable notifications" : "Enable notifications"}
            >
                {isSubscribed ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a6 6 0 00-6 6v3.586l-1.707 1.707A1 1 0 003 15h14a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" /></svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                )}
            </button>
            <div className="absolute bottom-full mb-2 w-40 text-center right-0 bg-slate-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                {isSubscribed ? 'Click to disable notifications' : 'Click to enable notifications'}
            </div>
        </div>
       
    );
};

export default NotificationBell;
