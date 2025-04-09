import React, { useEffect, useState } from 'react';
import { FaCheckCircle, FaExclamationCircle, FaTimesCircle } from 'react-icons/fa';

const Notification = ({ message, type = 'success', duration = 3000, onClose }) => {
const [visible, setVisible] = useState(true);

useEffect(() => {
    const timer = setTimeout(() => {
    setVisible(false);
    if (onClose) setTimeout(onClose, 300); // Allow animation to complete
    }, duration);

    return () => clearTimeout(timer);
}, [duration, onClose]);

const getIcon = () => {
    switch (type) {
    case 'success':
        return <FaCheckCircle className="text-green-500" size={20} />;
    case 'error':
        return <FaExclamationCircle className="text-red-500" size={20} />;
    case 'warning':
        return <FaExclamationCircle className="text-yellow-500" size={20} />;
    default:
        return <FaCheckCircle className="text-green-500" size={20} />;
    }
};

const getBgColor = () => {
    switch (type) {
    case 'success':
        return 'bg-green-50 bg-opacity-80 dark:bg-green-900 dark:bg-opacity-50 border border-green-200 dark:border-green-800';
    case 'error':
        return 'bg-red-50 bg-opacity-80 dark:bg-red-900 dark:bg-opacity-50 border border-red-200 dark:border-red-800';
    case 'warning':
        return 'bg-yellow-50 bg-opacity-80 dark:bg-yellow-900 dark:bg-opacity-50 border border-yellow-200 dark:border-yellow-800';
    default:
        return 'bg-blue-50 bg-opacity-80 dark:bg-blue-900 dark:bg-opacity-50 border border-blue-200 dark:border-blue-800';
    }
};

const getTextColor = () => {
    switch (type) {
    case 'success':
        return 'text-green-800 dark:text-green-200';
    case 'error':
        return 'text-red-800 dark:text-red-200';
    case 'warning':
        return 'text-yellow-800 dark:text-yellow-200';
    default:
        return 'text-blue-800 dark:text-blue-200';
    }
};

return (
    <div 
    className={`fixed top-6 right-6 z-50 max-w-sm p-4 rounded-lg shadow-lg backdrop-blur-sm transition-all duration-300 ${getBgColor()} ${
        visible ? 'opacity-90 translate-y-0' : 'opacity-0 translate-y-[-10px]'
    }`}
    >
    <div className="flex items-center">
        <div className="mr-3">{getIcon()}</div>
        <div className="flex-1">
        <p className={`text-sm font-medium ${getTextColor()}`}>{message}</p>
        </div>
        <button 
        onClick={() => {
            setVisible(false);
            if (onClose) setTimeout(onClose, 300);
        }}
        className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
        >
        <FaTimesCircle size={16} />
        </button>
    </div>
    </div>
);
};

export default Notification;
