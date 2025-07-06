import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface Notification {
  id: number;
  message: string;
  type: NotificationType;
}

interface NotificationContextType {
  addNotification: (message: string, type: NotificationType) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

// Basic styling for notifications - can be greatly improved with MUI Snackbar or react-toastify
const notificationContainerStyle: React.CSSProperties = {
  position: 'fixed',
  top: '20px',
  right: '20px',
  zIndex: 9999,
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
};

const notificationStyle = (type: NotificationType): React.CSSProperties => ({
  padding: '10px 15px',
  borderRadius: '5px',
  color: 'white',
  boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
  minWidth: '250px',
  textAlign: 'right', // For RTL
  // Add pointerEvents: 'auto' if needed for interaction within notification
});

const typeColors: Record<NotificationType, string> = {
  success: '#4CAF50', // Green
  error: '#F44336',   // Red
  info: '#2196F3',    // Blue
  warning: '#FF9800', // Orange
};


export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((message: string, type: NotificationType) => {
    const id = Date.now(); // Simple unique ID
    setNotifications(prev => [...prev, { id, message, type }]);

    // Auto-remove notification after a delay (e.g., 5 seconds)
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);

  return (
    <NotificationContext.Provider value={{ addNotification }}>
      {children}
      {/* MUI: This entire notification rendering part would be replaced by <SnackbarProvider> and its usage, or react-toastify's <ToastContainer /> */}
      <div style={notificationContainerStyle}>
        {notifications.map(notif => (
          <div
            key={notif.id}
            style={{ ...notificationStyle(notif.type), backgroundColor: typeColors[notif.type] }}
            // onClick={() => setNotifications(prev => prev.filter(n => n.id !== notif.id))} // Optional: allow manual close
          >
            {notif.message}
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};
