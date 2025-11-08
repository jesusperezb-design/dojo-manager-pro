import { useState, useEffect } from 'react';

export type Theme = 'dark' | 'light';

export const useTheme = () => {
    const [theme, setTheme] = useState<Theme>(() => {
        if (typeof window === 'undefined') return 'dark';
        const savedTheme = localStorage.getItem('theme');
        // Force restore to dark by default if the stored value is an older 'light' marker
        // This helps recover the original dark mode when the user asks to "devuélvemelo".
        if (savedTheme === 'light' || savedTheme === 'light-theme') {
            try { localStorage.setItem('theme', 'dark'); } catch (e) { /* ignore */ }
            return 'dark';
        }
        return (savedTheme as Theme) || 'dark';
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;
        
        localStorage.setItem('theme', theme);
        const root = document.documentElement;
        
        // Solo añadimos la clase 'light-theme' cuando es tema claro
        // El tema oscuro es el default y no necesita clase
        if (theme === 'light') {
            root.classList.add('light-theme');
        } else {
            root.classList.remove('light-theme');
        }
    }, [theme]);

    // Safety: on first mount ensure any stray .light-theme class is removed and theme is dark
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const root = document.documentElement;
        if (root.classList.contains('light-theme')) {
            root.classList.remove('light-theme');
            try { localStorage.setItem('theme', 'dark'); } catch (e) { /* ignore */ }
            setTheme('dark');
        }
    }, []);

    const toggleTheme = () => {
        setTheme(prevTheme => prevTheme === 'dark' ? 'light' : 'dark');
    };

    return { theme, toggleTheme };
};