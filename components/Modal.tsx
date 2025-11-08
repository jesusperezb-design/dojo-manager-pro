
import React from 'react';
import { XIcon } from './icons';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-space-black bg-opacity-70 backdrop-blur-sm flex justify-center items-center z-50"
            onClick={onClose}
        >
            <div 
                className="bg-nebula-blue border border-neon-blue/30 rounded-lg shadow-neon p-6 w-full max-w-lg mx-4 text-high-contrast-white animate-fade-in"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-cyan-400">{title}</h2>
                    <button onClick={onClose} className="text-secondary-gray hover:text-high-contrast-white transition-colors">
                        <XIcon />
                    </button>
                </div>
                <div>{children}</div>
            </div>
        </div>
    );
};

export default Modal;
