import React, { useState, useEffect } from 'react';
import useLocalStorage from './hooks/useLocalStorage';
import { INITIAL_STUDENTS, INITIAL_CLASSES, INITIAL_TRANSACTIONS, INITIAL_POSTS, INITIAL_PROFILE, NAV_ITEMS, INSTRUCTORS, INITIAL_ATTENDANCE_RECORDS, INITIAL_FEEDBACK_RECORDS } from './constants';
import type { View, Student, MartialArtClass, Transaction, CommunityPost, DojoProfile, StudentsFilterPreset } from './types';

import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Students from './components/Students';
import Schedule from './components/Schedule';
import Finances from './components/Finances';
import Retention from './components/Retention';
import Community from './components/Community';
import Profile from './components/Profile';
import Login from './components/Login';
import { MenuIcon } from './components/icons';
import ThemeToggle from './components/ThemeToggle';
import { useTheme } from './hooks/useTheme';

const App: React.FC = () => {
    const { theme } = useTheme();
    const [currentView, setCurrentView] = useState<View>('dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    // No usar localStorage para el estado de login - siempre comenzar como no logueado
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    
    // Using custom hook for data persistence
    const [students, setStudents] = useLocalStorage<Student[]>('dojo_students', INITIAL_STUDENTS);
    const [classes, setClasses] = useLocalStorage<MartialArtClass[]>('dojo_classes', INITIAL_CLASSES);
    const [transactions, setTransactions] = useLocalStorage<Transaction[]>('dojo_transactions', INITIAL_TRANSACTIONS);
    const [posts, setPosts] = useLocalStorage<CommunityPost[]>('dojo_posts', INITIAL_POSTS);
    const [profile, setProfile] = useLocalStorage<DojoProfile>('dojo_profile', INITIAL_PROFILE);

    // Migration: si hay un perfil guardado con el nombre antiguo, actualizarlo al nuevo INITIAL_PROFILE
useEffect(() => {
        try {
            if (profile) {
                const name = String(profile.name || '');
                const email = String(profile.contactEmail || '');
                if (name.includes('Galaxia') || email.includes('dojoneon')) {
                    setProfile(INITIAL_PROFILE);
                }
            }
        } catch (e) {
            // no bloqueamos la app por errores de migración
            console.warn('Error al aplicar migración de perfil:', e);
        }
    }, []); // una sola vez al montar
    
    // Forzar actualización a los nuevos assets locales si el almacenamiento tenía URLs antiguas
    useEffect(() => {
        try {
            let studentsUpdated = false;
            const normalizedStudents = students.map(student => {
                const defaultStudent = INITIAL_STUDENTS.find(s => s.id === student.id || s.name === student.name);
                const expectedUrl = defaultStudent?.profilePicUrl;
                if (expectedUrl && student.profilePicUrl !== expectedUrl) {
                    studentsUpdated = true;
                    return { ...student, profilePicUrl: expectedUrl };
                }
                return student;
            });

            if (studentsUpdated) {
                setStudents(normalizedStudents);
            }

            const currentStudents = studentsUpdated ? normalizedStudents : students;

            let classesUpdated = false;
            let normalizedClasses = classes;

            if (normalizedClasses.some(cls => cls.name.trim().toLowerCase() === 'gg')) {
                normalizedClasses = normalizedClasses.filter(cls => cls.name.trim().toLowerCase() !== 'gg');
                classesUpdated = true;
            }

            normalizedClasses = normalizedClasses.map(cls => {
                const defaultClass = INITIAL_CLASSES.find(c => c.id === cls.id || c.name === cls.name);
                const fallbackInstructor = defaultClass?.instructor ?? INSTRUCTORS[0] ?? 'Profesor asignado';
                if (!cls.instructor && fallbackInstructor) {
                    classesUpdated = true;
                    return { ...cls, instructor: fallbackInstructor };
                }
                return cls;
            });

            if (classesUpdated) {
                setClasses(normalizedClasses);
            }

            if (typeof window !== 'undefined') {
                const validIds = new Set(currentStudents.map(student => student.id));
                try {
                    const rawResolved = window.localStorage.getItem('resolved_alert_ids');
                    if (rawResolved) {
                        const parsed = JSON.parse(rawResolved);
                        if (Array.isArray(parsed)) {
                            const filtered = parsed.filter((id: unknown) => typeof id === 'string' && validIds.has(id));
                            if (filtered.length !== parsed.length) {
                                window.localStorage.setItem('resolved_alert_ids', JSON.stringify(filtered));
                            }
                        } else {
                            window.localStorage.removeItem('resolved_alert_ids');
                        }
                    }
                } catch (err) {
                    console.warn('No se pudieron depurar las alertas resueltas almacenadas:', err);
                    window.localStorage.removeItem('resolved_alert_ids');
                }

                currentStudents.forEach(student => {
                    const interactionKey = `alert_interactions_${student.id}`;
                    const legacyContactKey = `alert_contact_${student.id}`;
                    const messageLogKey = `ai_message_log_${student.id}`;
                    const taskKey = `alert_tasks_${student.id}`;
                    try {
                        let interactions: any[] = [];
                        const rawInteractions = window.localStorage.getItem(interactionKey);
                        if (rawInteractions) {
                            const parsed = JSON.parse(rawInteractions);
                            if (Array.isArray(parsed)) {
                                interactions = parsed.filter(
                                    entry =>
                                        entry &&
                                        typeof entry.timestamp === 'string' &&
                                        typeof entry.type === 'string'
                                );
                            }
                        }

                        const legacyContact = window.localStorage.getItem(legacyContactKey);
                        if (legacyContact && (!interactions || interactions.length === 0)) {
                            interactions = [{ timestamp: legacyContact, type: 'contact' }];
                            window.localStorage.removeItem(legacyContactKey);
                        }

                        if (interactions && interactions.length > 0) {
                            window.localStorage.setItem(interactionKey, JSON.stringify(interactions));
                        }

                        const legacyMessageLog = window.localStorage.getItem(messageLogKey);
                        if (legacyMessageLog) {
                            try {
                                const parsedLog = JSON.parse(legacyMessageLog);
                                if (Array.isArray(parsedLog) && parsedLog.length > 0) {
                                    const logEntries = parsedLog.map((entry: any) => ({
                                        id: entry.id || `${student.id}-${Date.now()}`,
                                        studentId: student.id,
                                        message: String(entry.message || ''),
                                        generatedAt: entry.generatedAt || new Date().toISOString(),
                                        templateId: typeof entry.templateId === 'string' ? entry.templateId : undefined,
                                    }));
                                    const stored = window.localStorage.getItem('ai_message_logs');
                                    const parsedStored = stored ? JSON.parse(stored) : [];
                                    if (Array.isArray(parsedStored)) {
                                        const merged = [...parsedStored.filter((item: any) => item.studentId !== student.id), ...logEntries];
                                        window.localStorage.setItem('ai_message_logs', JSON.stringify(merged));
                                    } else {
                                        window.localStorage.setItem('ai_message_logs', JSON.stringify(logEntries));
                                    }
                                }
                            } catch (err) {
                                console.warn('No se pudo migrar el historial de mensajes para', student.id, err);
                            }
                            window.localStorage.removeItem(messageLogKey);
                        }

                        if (!window.localStorage.getItem(taskKey)) {
                            const defaultTasks = [
                                {
                                    id: `${student.id}-bienvenida`,
                                    title: 'Enviar mensaje de bienvenida',
                                    completed: false,
                                    createdAt: new Date().toISOString(),
                                },
                            ];
                            window.localStorage.setItem(taskKey, JSON.stringify(defaultTasks));
                        }
                    } catch (err) {
                        console.warn(`No se pudieron migrar las interacciones del alumno ${student.id}:`, err);
                    }
                });

                try {
                    const rawAttendance = window.localStorage.getItem('attendance_records');
                    const refreshWithBase = () => window.localStorage.setItem('attendance_records', JSON.stringify(INITIAL_ATTENDANCE_RECORDS));
                    if (rawAttendance) {
                        const parsed = JSON.parse(rawAttendance);
                        if (Array.isArray(parsed)) {
                            const filtered = parsed.filter((entry: any) => entry && typeof entry.studentId === 'string' && validIds.has(entry.studentId));
                            let needsRefresh = filtered.length === 0;
                            if (!needsRefresh) {
                                const now = Date.now();
                                const cutoff = now - 45 * 24 * 60 * 60 * 1000;
                                let hasRecentWeek = false;
                                const weekKeys = new Set<string>();
                                filtered.forEach((entry: any) => {
                                    const dateStr = entry?.record?.date;
                                    if (typeof dateStr !== 'string') return;
                                    const date = new Date(dateStr + 'T00:00:00Z');
                                    if (!Number.isNaN(date.getTime())) {
                                        if (date.getTime() >= cutoff) {
                                            hasRecentWeek = true;
                                        }
                                        const weekKey = `${date.getUTCFullYear()}-${date.getUTCMonth()}-${Math.floor(date.getUTCDate() / 7)}`;
                                        weekKeys.add(weekKey);
                                    }
                                });
                                if (!hasRecentWeek || weekKeys.size < 4) {
                                    needsRefresh = true;
                                }
                            }
                            if (needsRefresh) {
                                refreshWithBase();
                            } else if (filtered.length !== parsed.length) {
                                window.localStorage.setItem('attendance_records', JSON.stringify(filtered));
                            }
                        } else {
                            window.localStorage.removeItem('attendance_records');
                            refreshWithBase();
                        }
                    } else {
                        refreshWithBase();
                    }
                } catch (err) {
                    console.warn('No se pudieron depurar los registros de asistencia:', err);
                    window.localStorage.removeItem('attendance_records');
                    window.localStorage.setItem('attendance_records', JSON.stringify(INITIAL_ATTENDANCE_RECORDS));
                }

                try {
                    const rawFeedback = window.localStorage.getItem('feedback_records');
                    if (rawFeedback) {
                        const parsed = JSON.parse(rawFeedback);
                        if (Array.isArray(parsed)) {
                            const filtered = parsed.filter((entry: any) => entry && typeof entry.studentId === 'string' && validIds.has(entry.studentId));
                            if (filtered.length !== parsed.length) {
                                window.localStorage.setItem('feedback_records', JSON.stringify(filtered));
                            } else if (filtered.length === 0) {
                                window.localStorage.setItem('feedback_records', JSON.stringify(INITIAL_FEEDBACK_RECORDS));
                            }
                        } else {
                            window.localStorage.removeItem('feedback_records');
                        }
                    } else {
                        window.localStorage.setItem('feedback_records', JSON.stringify(INITIAL_FEEDBACK_RECORDS));
                    }
                } catch (err) {
                    console.warn('No se pudieron depurar los registros de feedback:', err);
                    window.localStorage.removeItem('feedback_records');
                }

                try {
                    const keysToRemove: string[] = [];
                    for (let i = 0; i < window.localStorage.length; i++) {
                        const key = window.localStorage.key(i);
                        if (!key) continue;
                        if (key.startsWith('alert_interactions_')) {
                            const id = key.replace('alert_interactions_', '');
                            if (!validIds.has(id)) {
                                keysToRemove.push(key);
                            }
                        }
                        if (key.startsWith('alert_contact_')) {
                            const id = key.replace('alert_contact_', '');
                            if (!validIds.has(id)) {
                                keysToRemove.push(key);
                            }
                        }
                        if (key.startsWith('alert_tasks_')) {
                            const id = key.replace('alert_tasks_', '');
                            if (!validIds.has(id)) {
                                keysToRemove.push(key);
                            }
                        }
                        if (key.startsWith('ai_message_log_')) {
                            const id = key.replace('ai_message_log_', '');
                            if (!validIds.has(id)) {
                                keysToRemove.push(key);
                            }
                        }
                    }
                    keysToRemove.forEach(key => window.localStorage.removeItem(key));
                } catch (err) {
                    console.warn('No se pudieron limpiar las interacciones huérfanas:', err);
                }
            }

            if (profile) {
                const expectedLogo = INITIAL_PROFILE.logoUrl;
                if (profile.logoUrl !== expectedLogo) {
                    setProfile({ ...profile, logoUrl: expectedLogo });
                }
            }
        } catch (e) {
            console.warn('Error actualizando imágenes locales:', e);
        }
    }, [students, classes, profile, setStudents, setClasses, setProfile]);
    
    const handleLogin = () => {
        setIsLoggedIn(true);
    };

    const handleLogout = () => {
        setIsLoggedIn(false);
        setCurrentView('dashboard'); // Reset a la vista inicial al cerrar sesión
    };

    const navigateToStudents = (preset?: StudentsFilterPreset) => {
        if (typeof window !== 'undefined') {
            try {
                if (preset) {
                    window.localStorage.setItem('students_pending_filter', JSON.stringify(preset));
                } else {
                    window.localStorage.removeItem('students_pending_filter');
                }
            } catch (err) {
                console.warn('No se pudo almacenar el filtro solicitado:', err);
            }
        }
        setCurrentView('students');
        setIsSidebarOpen(false);
    };

    if (!isLoggedIn) {
        return <Login onLogin={handleLogin} />;
    }

    const renderView = () => {
        switch (currentView) {
            case 'dashboard':
                return <Dashboard students={students} classes={classes} transactions={transactions} onNavigateToStudents={navigateToStudents} />;
            case 'students':
                return <Students students={students} setStudents={setStudents} />;
            case 'schedule':
                return <Schedule classes={classes} setClasses={setClasses} />;
            case 'finances':
                return <Finances transactions={transactions} />;
            case 'retention':
                return <Retention students={students} />;
            case 'community':
                return <Community posts={posts} />;
            case 'profile':
                return <Profile profile={profile} students={students} />;
            default:
                return <Dashboard students={students} classes={classes} transactions={transactions} onNavigateToStudents={navigateToStudents} />;
        }
    };
    
    const currentViewLabel = NAV_ITEMS.find(item => item.id === currentView)?.label || 'Dashboard';

    return (
        <div className={`min-h-screen flex font-sans transition-all duration-300 ease-in-out
            ${theme === 'dark' 
                ? 'bg-space-black text-high-contrast-white' 
                : 'bg-light-bg text-light-text'
            }`}>
            <ThemeToggle />
            <Sidebar 
                currentView={currentView} 
                setCurrentView={setCurrentView} 
                isOpen={isSidebarOpen}
                setIsOpen={setIsSidebarOpen}
                onLogout={handleLogout}
            />

            {/* Overlay for mobile */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-30 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                ></div>
            )}

            <main className="flex-1 md:ml-64 w-full overflow-y-auto">
                {/* Mobile Header */}
                <header className={`md:hidden sticky top-0 backdrop-blur-md p-4 flex items-center gap-4 z-20
                    ${theme === 'dark'
                        ? 'bg-nebula-blue/80 border-b border-neon-blue/20'
                        : 'bg-light-surface/80 border-b border-light-primary/20'
                    }`}>
                    <button 
                        onClick={() => setIsSidebarOpen(true)} 
                        className={theme === 'dark' ? 'text-high-contrast-white' : 'text-light-text'}
                    >
                        <MenuIcon />
                    </button>
                    <h1 className="text-xl font-bold">{currentViewLabel}</h1>
                </header>
                
                <div className="w-full">
                    {renderView()}
                </div>
            </main>
        </div>
    );
};

export default App;
