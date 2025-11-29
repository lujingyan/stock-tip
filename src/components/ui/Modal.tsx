'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;

        if (isOpen) {
            if (!dialog.open) {
                dialog.showModal();
            }
        } else {
            if (dialog.open) {
                dialog.close();
            }
        }
    }, [isOpen, mounted]);

    if (!mounted) return null;

    return createPortal(
        <dialog
            ref={dialogRef}
            className="backdrop:bg-black/50 backdrop:backdrop-blur-sm rounded-lg shadow-xl p-0 w-full max-w-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            onClose={onClose}
        >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
                <h2 className="text-lg font-semibold">{title}</h2>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>
            <div className="p-4">
                {children}
            </div>
        </dialog>,
        document.body
    );
}
