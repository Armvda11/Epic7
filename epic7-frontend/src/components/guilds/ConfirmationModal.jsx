import React from "react";

const ConfirmationModal = ({
isOpen,
title,
message,
confirmText = "Confirm",
cancelText = "Cancel",
confirmButtonClass = "bg-blue-600 hover:bg-blue-700",
className = "bg-red-100 dark:bg-red-900", // Default background, now customizable
onConfirm,
onCancel
}) => {
if (!isOpen) return null;

return (
    <div className={`mt-6 p-4 rounded-lg ${className}`}>
    <p className="font-bold">{title}</p>
    {message && <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{message}</p>}
    <div className="flex mt-4 gap-4">
        <button
        onClick={onConfirm}
        className={`${confirmButtonClass} text-white px-4 py-2 rounded-lg`}
        >
        {confirmText}
        </button>
        <button
        onClick={onCancel}
        className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
        >
        {cancelText}
        </button>
    </div>
    </div>
);
};

export default ConfirmationModal;
