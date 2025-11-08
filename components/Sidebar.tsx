import React from 'react';
import { NAV_ITEMS } from '../constants';
import { LogoutIcon, XIcon } from './icons';
import type { View } from '../types';
import { useTheme } from '../hooks/useTheme';

interface SidebarProps {
  currentView: View;
  setCurrentView: (view: View) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onLogout: () => void;
  logoUrl?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView, isOpen, setIsOpen, onLogout, logoUrl }) => {
    const { theme } = useTheme();
    
    const handleLinkClick = (view: View) => {
        setCurrentView(view);
        setIsOpen(false); // Close sidebar on mobile after navigation
    }
    
    return (
        <aside className={`w-64 p-6 flex flex-col justify-between h-screen fixed top-0 left-0 z-40 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} transition-all duration-300 ease-in-out md:translate-x-0 md:fixed
            ${theme === 'dark'
                ? 'bg-nebula-blue'
                : 'bg-light-surface border-r border-light-primary/20'
            }`}>
            <div>
                <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center">
                        <div className={`w-20 h-20 rounded-xl flex items-center justify-center overflow-hidden transition-all duration-300
                            ${theme === 'dark'
                                ? 'bg-space-black border border-neon-blue/40 shadow-neon'
                                : 'bg-light-bg border border-light-primary/40 shadow-light'
                            }`}>
                            <img
                                src={logoUrl || '/images/dojo/sidebar-logo.png'}
                                alt="Logo del Dojo"
                                className="w-full h-full object-contain"
                                onError={(event) => {
                                    event.currentTarget.src = '/images/dojo/sidebar-logo.png';
                                    event.currentTarget.onerror = null;
                                }}
                            />
                        </div>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="md:hidden text-secondary-gray hover:text-high-contrast-white">
                        <XIcon />
                    </button>
                </div>
                <nav>
                    <ul>
                        {NAV_ITEMS.map((item) => (
                            <li key={item.id} className="mb-2">
                                <a
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handleLinkClick(item.id);
                                    }}
                                    className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-300
                                        ${currentView === item.id 
                                            ? theme === 'dark'
                                                ? 'bg-neon-blue text-high-contrast-white shadow-neon'
                                                : 'bg-light-primary text-white shadow-light'
                                            : theme === 'dark'
                                                ? 'text-secondary-gray hover:bg-neon-blue/20 hover:text-high-contrast-white'
                                                : 'text-light-secondary hover:bg-light-primary/10 hover:text-light-primary'
                                        }`
                                    }
                                >
                                    {item.icon}
                                    <span>{item.label}</span>
                                </a>
                            </li>
                        ))}
                    </ul>
                </nav>
            </div>
            <div>
                 <a
                    href="#"
                    onClick={(e) => {
                        e.preventDefault();
                        onLogout();
                    }}
                    className="flex items-center gap-3 px-4 py-2 rounded-lg text-secondary-gray hover:bg-red-500/20 hover:text-high-contrast-white transition-colors duration-300"
                >
                    <LogoutIcon />
                    <span>Cerrar Sesión</span>
                </a>
            </div>
        </aside>
    );
};

export default Sidebar;
