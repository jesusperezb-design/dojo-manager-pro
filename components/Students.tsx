import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { Student, AIMessagesLogEntry, CampaignTemplate, AttendanceRecord, FeedbackRecord, StudentsFilterPreset, StudentCohortKey } from '../types';
import { Belt, PaymentStatus, RiskLevel } from '../types';
import Modal from './Modal';
import { PlusCircleIcon, SparklesIcon, PencilIcon, TrashIcon, LoadingSpinner, ShieldCheckIcon } from './icons';
import { generateMotivationalMessage, generateCampaignMessage } from '../services/geminiService';
import useLocalStorageList from '../hooks/useLocalStorageList';

interface StudentsProps {
    students: Student[];
    setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
}

const StudentForm: React.FC<{ student: Partial<Student>; onSave: (student: Student) => void; onCancel: () => void }> = ({ student, onSave, onCancel }) => {
    const [formData, setFormData] = useState(student);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData as Student);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <input name="name" value={formData.name || ''} onChange={handleChange} placeholder="Nombre" className="w-full bg-space-black p-2 rounded border border-neon-blue/50 focus:outline-none focus:ring-2 focus:ring-neon-blue" required />
            <input name="discipline" value={formData.discipline || ''} onChange={handleChange} placeholder="Disciplina" className="w-full bg-space-black p-2 rounded border border-neon-blue/50 focus:outline-none focus:ring-2 focus:ring-neon-blue" required />
            <select name="belt" value={formData.belt || ''} onChange={handleChange} className="w-full bg-space-black p-2 rounded border border-neon-blue/50 focus:outline-none focus:ring-2 focus:ring-neon-blue" required>
                {Object.values(Belt).map(b => <option key={b} value={b}>{b}</option>)}
            </select>
             <select name="paymentStatus" value={formData.paymentStatus || ''} onChange={handleChange} className="w-full bg-space-black p-2 rounded border border-neon-blue/50 focus:outline-none focus:ring-2 focus:ring-neon-blue" required>
                {Object.values(PaymentStatus).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <div className="flex justify-end gap-4 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 rounded bg-secondary-gray/50 hover:bg-secondary-gray/80 transition-colors">Cancelar</button>
                <button type="submit" className="px-4 py-2 rounded bg-gradient-to-r from-neon-blue to-cyan-400 hover:shadow-neon transition-shadow">Guardar</button>
            </div>
        </form>
    );
}

const MotivateModal: React.FC<{ 
    student: Student; 
    onClose: () => void;
    onSaveLog: (entry: AIMessagesLogEntry) => void;
    templates: CampaignTemplate[];
}> = ({ student, onClose, onSaveLog, templates }) => {
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('manual');
    const [customPrompt, setCustomPrompt] = useState('');
    const [error, setError] = useState<string | null>(null);

    const manualOption = { id: 'manual', name: 'Mensaje individual personalizado', segment: 'Todos' };
    const templateOptions = [manualOption, ...templates];

    React.useEffect(() => {
        setIsLoading(true);
        setError(null);
        if (selectedTemplateId === 'manual') {
            generateMotivationalMessage(student).then(msg => {
                setMessage(msg);
                setIsLoading(false);
            });
        } else {
            generateCampaignMessage({
                segment: templates.find(t => t.id === selectedTemplateId)?.segment || 'Todos',
                customPrompt: templates.find(t => t.id === selectedTemplateId)?.prompt,
            }).then(msg => {
                setMessage(msg);
                setIsLoading(false);
            }).catch(err => {
                console.error(err);
                setMessage('No se pudo generar un mensaje con la plantilla seleccionada.');
                setIsLoading(false);
                setError('Error al generar con la plantilla.');
            });
        }
    }, [student, selectedTemplateId, templates]);

    const handleSave = () => {
        if (!message.trim()) {
            setError('No hay mensaje para guardar.');
            return;
        }
        const entry: AIMessagesLogEntry = {
            id: createId(),
            studentId: student.id,
            templateId: selectedTemplateId !== 'manual' ? selectedTemplateId : undefined,
            generatedAt: new Date().toISOString(),
            message,
        };
        onSaveLog(entry);
        onClose();
    };

    const handleRegenerate = () => {
        setIsLoading(true);
        setError(null);
        if (selectedTemplateId === 'manual') {
            generateMotivationalMessage(student).then(msg => {
                setMessage(msg);
                setIsLoading(false);
            });
        } else {
            generateCampaignMessage({
                segment: templates.find(t => t.id === selectedTemplateId)?.segment || 'Todos',
                customPrompt: templates.find(t => t.id === selectedTemplateId)?.prompt,
            }).then(msg => {
                setMessage(msg);
                setIsLoading(false);
            }).catch(err => {
                console.error(err);
                setMessage('No se pudo generar un mensaje con la plantilla seleccionada.');
                setIsLoading(false);
                setError('Error al generar con la plantilla.');
            });
        }
    };

    return (
         <Modal isOpen={true} onClose={onClose} title={`Motivar a ${student.name}`}>
            <div className="space-y-4">
                <div>
                    <label className="block text-xs uppercase tracking-wide text-secondary-gray mb-1">Usar plantilla</label>
                    <select
                        value={selectedTemplateId}
                        onChange={e => setSelectedTemplateId(e.target.value)}
                        className="w-full bg-space-black border border-neon-blue/20 rounded-md px-3 py-2 text-sm text-high-contrast-white"
                    >
                        {templateOptions.map(option => (
                            <option key={option.id} value={option.id}>
                                {option.name}
                            </option>
                        ))}
                    </select>
                </div>
                {isLoading ? (
                    <div className="flex items-center justify-center h-24">
                        <LoadingSpinner />
                        <span className="ml-2">Generando mensaje...</span>
                    </div>
                ) : (
                    <textarea
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        rows={4}
                        className="w-full bg-space-black border border-neon-blue/30 rounded-md px-3 py-2 text-sm text-high-contrast-white"
                    />
                )}
                {error && <p className="text-xs text-rose-400">{error}</p>}
                <div className="flex justify-between items-center text-xs text-secondary-gray">
                    <button onClick={handleRegenerate} className="px-3 py-2 rounded bg-neon-blue/15 hover:bg-neon-blue/25 text-neon-blue transition-colors">Regenerar</button>
                    <span className="text-secondary-gray/70">Copia y envía por tu canal preferido.</span>
                </div>
                <div className="flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 rounded border border-secondary-gray/40 text-secondary-gray hover:bg-secondary-gray/20 transition-colors">Cerrar</button>
                    <button onClick={handleSave} className="px-4 py-2 rounded bg-gradient-to-r from-neon-blue to-cyan-400 hover:shadow-neon transition-shadow">Guardar en historial</button>
                </div>
            </div>
        </Modal>
    );
};

const createId = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2, 10));

interface StoredAlertTask {
    id: string;
    title: string;
    completed: boolean;
    createdAt: string;
    completedAt?: string;
}

const getTaskStorageKey = (studentId: string) => `alert_tasks_${studentId}`;
const getInteractionStorageKey = (studentId: string) => `alert_interactions_${studentId}`;

const loadStudentTasks = (studentId: string): StoredAlertTask[] => {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(getTaskStorageKey(studentId));
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed as StoredAlertTask[];
    } catch (err) {
        console.warn('No se pudieron leer las tareas del alumno', studentId, err);
        return [];
    }
};

const saveStudentTasks = (studentId: string, tasks: StoredAlertTask[]) => {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(getTaskStorageKey(studentId), JSON.stringify(tasks));
    } catch (err) {
        console.warn('No se pudieron guardar las tareas del alumno', studentId, err);
    }
};

const recordTaskInteraction = (studentId: string, type: 'task:complete' | 'task:snooze', note: string) => {
    if (typeof window === 'undefined') return;
    try {
        const key = getInteractionStorageKey(studentId);
        const raw = window.localStorage.getItem(key);
        const list = raw ? JSON.parse(raw) : [];
        list.push({ timestamp: new Date().toISOString(), type, note });
        window.localStorage.setItem(key, JSON.stringify(list));
    } catch (err) {
        console.warn('No se pudieron registrar las interacciones del alumno', studentId, err);
    }
};

const StudentTaskModal: React.FC<{
    student: Student;
    tasks: StoredAlertTask[];
    onClose: () => void;
    onComplete: (taskId: string) => void;
    onSnooze: (taskId: string) => void;
    formatRelativeTime: (iso?: string) => string;
}> = ({ student, tasks, onClose, onComplete, onSnooze, formatRelativeTime }) => (
    <Modal isOpen={true} onClose={onClose} title={`Seguimiento de ${student.name}`}>
        <div className="space-y-4">
            {tasks.length === 0 ? (
                <p className="text-sm text-secondary-gray">
                    No hay tareas activas para este alumno. Usa el panel de alertas o campañas para asignar nuevas acciones.
                </p>
            ) : (
                <ul className="space-y-3">
                    {tasks.map(task => (
                        <li key={task.id} className="border border-neon-blue/20 rounded-lg bg-space-black/60 px-4 py-3">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div>
                                    <p className="text-sm font-semibold text-high-contrast-white">{task.title}</p>
                                    <p className="text-xs text-secondary-gray mt-1">
                                        Creada el {new Date(task.createdAt).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        {' · '}
                                        {formatRelativeTime(task.createdAt)}
                                    </p>
                                    {task.completed && task.completedAt && (
                                        <p className="text-xs text-emerald-300 mt-1">Completada el {new Date(task.completedAt).toLocaleString('es-ES')}</p>
                                    )}
                                </div>
                                <div className="flex gap-2 text-xs">
                                    {!task.completed && (
                                        <>
                                            <button
                                                onClick={() => onComplete(task.id)}
                                                className="px-3 py-1 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 transition-colors"
                                            >
                                                Marcar completada
                                            </button>
                                            <button
                                                onClick={() => onSnooze(task.id)}
                                                className="px-3 py-1 rounded-md bg-secondary-gray/15 hover:bg-secondary-gray/25 text-secondary-gray transition-colors"
                                            >
                                                Posponer
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
            <div className="flex justify-end">
                <button
                    onClick={onClose}
                    className="px-4 py-2 rounded border border-secondary-gray/40 text-secondary-gray hover:bg-secondary-gray/20 transition-colors"
                >
                    Cerrar
                </button>
            </div>
        </div>
    </Modal>
);

const FeedbackModal: React.FC<{
    student: Student;
    onClose: () => void;
    onSaveFeedback: (record: FeedbackRecord) => void;
}> = ({ student, onClose, onSaveFeedback }) => {
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [className, setClassName] = useState('');
    const [instructor, setInstructor] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = () => {
        if (rating < 1 || rating > 5) {
            setError('Selecciona un rating entre 1 y 5.');
            return;
        }
        const record: FeedbackRecord = {
            id: createId(),
            studentId: student.id,
            rating,
            comment: comment.trim() || undefined,
            submittedAt: new Date().toISOString(),
            className: className.trim() || undefined,
            instructor: instructor.trim() || undefined,
        };
        onSaveFeedback(record);
        onClose();
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={`Feedback de ${student.name}`}>
            <div className="space-y-4">
                <div>
                    <label className="block text-xs uppercase tracking-wide text-secondary-gray mb-1">Rating</label>
                    <div className="flex gap-2">
                        {[1,2,3,4,5].map(value => (
                            <button
                                key={value}
                                onClick={() => setRating(value)}
                                className={`w-10 h-10 rounded-full border ${value <= rating ? 'bg-amber-400/30 border-amber-400 text-amber-200' : 'bg-space-black border-neon-blue/30 text-secondary-gray'}`}
                            >
                                {value}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs uppercase tracking-wide text-secondary-gray mb-1">Clase</label>
                        <input value={className} onChange={e => setClassName(e.target.value)} className="w-full bg-space-black border border-neon-blue/20 rounded px-3 py-2 text-sm text-high-contrast-white" placeholder="Karate Kids" />
                    </div>
                    <div>
                        <label className="block text-xs uppercase tracking-wide text-secondary-gray mb-1">Instructor</label>
                        <input value={instructor} onChange={e => setInstructor(e.target.value)} className="w-full bg-space-black border border-neon-blue/20 rounded px-3 py-2 text-sm text-high-contrast-white" placeholder="Sensei Hiro" />
                    </div>
                </div>
                <div>
                    <label className="block text-xs uppercase tracking-wide text-secondary-gray mb-1">Comentario</label>
                    <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} className="w-full bg-space-black border border-neon-blue/20 rounded px-3 py-2 text-sm text-high-contrast-white" placeholder="¿Cómo se sintió la clase?" />
                </div>
                {error && <p className="text-xs text-rose-400">{error}</p>}
                <div className="flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 rounded border border-secondary-gray/40 text-secondary-gray hover:bg-secondary-gray/20 transition-colors">Cancelar</button>
                    <button onClick={handleSubmit} className="px-4 py-2 rounded bg-gradient-to-r from-neon-blue to-cyan-400 hover:shadow-neon transition-shadow">Guardar feedback</button>
                </div>
            </div>
        </Modal>
    );
};

const FeedbackHistoryModal: React.FC<{
    student: Student;
    records: FeedbackRecord[];
    onClose: () => void;
}> = ({ student, records, onClose }) => (
    <Modal isOpen={true} onClose={onClose} title={`Historial de feedback · ${student.name}`}>
        {records.length === 0 ? (
            <p className="text-sm text-secondary-gray">Todavía no hay comentarios registrados para este alumno.</p>
        ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {records.map(record => {
                    const submittedDate = new Date(record.submittedAt).toLocaleString('es-ES', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                    });
                    return (
                        <div key={record.id} className="rounded-lg border border-neon-blue/20 bg-space-black/70 p-4">
                            <div className="flex justify-between items-center text-xs text-secondary-gray uppercase tracking-wide mb-2">
                                <span>⭐ {record.rating}/5</span>
                                <span>{submittedDate}</span>
                            </div>
                            {record.className && (
                                <p className="text-xs text-secondary-gray mb-1">
                                    Clase: <span className="text-high-contrast-white">{record.className}</span>
                                </p>
                            )}
                            {record.instructor && (
                                <p className="text-xs text-secondary-gray mb-1">
                                    Instructor: <span className="text-high-contrast-white">{record.instructor}</span>
                                </p>
                            )}
                            {record.comment && (
                                <p className="text-sm text-high-contrast-white/90 mt-2">“{record.comment}”</p>
                            )}
                        </div>
                    );
                })}
            </div>
        )}
        <div className="flex justify-end mt-6">
            <button
                onClick={onClose}
                className="px-4 py-2 rounded border border-secondary-gray/40 text-secondary-gray hover:bg-secondary-gray/20 transition-colors"
            >
                Cerrar
            </button>
        </div>
    </Modal>
);

const Students: React.FC<StudentsProps> = ({ students, setStudents }) => {
    const { items: studentMessages, addItem: addMessageLog } = useLocalStorageList<AIMessagesLogEntry>('ai_message_logs', []);
    const { items: attendanceRecords, addItem: addAttendanceRecord, updateItem: updateAttendanceRecord, setItems: setAttendanceRecords } = useLocalStorageList<{ id: string; studentId: string; record: AttendanceRecord }>('attendance_records', []);
    const { items: templates } = useLocalStorageList<CampaignTemplate>('campaign_templates', []);
    const { items: feedbackRecords, addItem: addFeedbackRecord } = useLocalStorageList<FeedbackRecord>('feedback_records', []);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isMotivateModalOpen, setIsMotivateModalOpen] = useState(false);
    const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
    const [isFeedbackHistoryOpen, setIsFeedbackHistoryOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [taskModalStudent, setTaskModalStudent] = useState<Student | null>(null);
    const [taskModalTasks, setTaskModalTasks] = useState<StoredAlertTask[]>([]);
    const [taskModalVersion, setTaskModalVersion] = useState(0);

    const formatRelativeTime = useCallback((iso?: string) => {
        if (!iso) return 'Reciente';
        const timestamp = new Date(iso).getTime();
        if (Number.isNaN(timestamp)) return 'Reciente';
        const diffMs = Date.now() - timestamp;
        const formatter = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
        const minutes = Math.round(diffMs / (1000 * 60));
        if (Math.abs(minutes) < 1) return 'Justo ahora';
        if (Math.abs(minutes) < 60) return formatter.format(-minutes, 'minute');
        const hours = Math.round(minutes / 60);
        if (Math.abs(hours) < 24) return formatter.format(-hours, 'hour');
        const days = Math.round(hours / 24);
        if (Math.abs(days) < 30) return formatter.format(-days, 'day');
        const months = Math.round(days / 30);
        return formatter.format(-months, 'month');
    }, [students]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const raw = window.localStorage.getItem('students_pending_filter');
            if (!raw) return;
            window.localStorage.removeItem('students_pending_filter');
            const parsed: StudentsFilterPreset = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                if (parsed.cohort && parsed.cohort.type && parsed.cohort.value) {
                    setCohortFilter(parsed.cohort);
                }
                if (parsed.focus === 'chronic') {
                    setFilterMode('chronic');
                } else if (parsed.focus === 'flagged') {
                    setFilterMode('flagged');
                }
                if (parsed.taskStudentId) {
                    const target = students.find(student => student.id === parsed.taskStudentId);
                    if (target) {
                        setSelectedStudent(target);
                        setTaskModalStudent(target);
                        setTaskModalTasks(loadStudentTasks(target.id));
                        setIsTaskModalOpen(true);
                    }
                }
            }
        } catch (err) {
            console.warn('No se pudo aplicar el filtro recibido desde el dashboard:', err);
        }
    }, []);

    const handleAddStudent = () => {
        setSelectedStudent(null);
        setIsModalOpen(true);
    };

    const handleEditStudent = (student: Student) => {
        setSelectedStudent(student);
        setIsModalOpen(true);
    };

    const handleDeleteStudent = (id: string) => {
        if(window.confirm("¿Estás seguro de que quieres eliminar a este alumno?")) {
            setStudents(students.filter(s => s.id !== id));
        }
    };
    
    const handleSaveStudent = (student: Student) => {
        if (selectedStudent) { // Editing
            setStudents(students.map(s => s.id === selectedStudent.id ? { ...student, id: s.id, profilePicUrl: s.profilePicUrl, riskLevel: s.riskLevel, joinDate: s.joinDate } : s));
        } else { // Adding
            const newStudent: Student = {
                ...student,
                id: Date.now().toString(),
                profilePicUrl: `https://picsum.photos/seed/${student.name.replace(/\s/g, '')}/200`,
                riskLevel: RiskLevel.Low,
                joinDate: new Date().toISOString()
            };
            setStudents([...students, newStudent]);
        }
        setIsModalOpen(false);
    };

    const handleMotivate = (student: Student) => {
        setSelectedStudent(student);
        setIsMotivateModalOpen(true);
    };

    const handleSaveMessage = (entry: AIMessagesLogEntry) => {
        addMessageLog(entry);
    };

    useEffect(() => {
        if (taskModalStudent) {
            setTaskModalTasks(loadStudentTasks(taskModalStudent.id));
        }
    }, [taskModalStudent, taskModalVersion]);

    const openTaskModal = useCallback((student: Student) => {
        setTaskModalStudent(student);
        setTaskModalTasks(loadStudentTasks(student.id));
        setIsTaskModalOpen(true);
    }, []);

    const closeTaskModal = () => {
        setIsTaskModalOpen(false);
        setTaskModalStudent(null);
        setTaskModalTasks([]);
    };

    const completeStudentTask = (studentId: string, taskId: string) => {
        const tasks = loadStudentTasks(studentId);
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;
        const nowIso = new Date().toISOString();
        const updated = tasks.map(t =>
            t.id === taskId
                ? { ...t, completed: true, completedAt: nowIso }
                : t
        );
        saveStudentTasks(studentId, updated);
        recordTaskInteraction(studentId, 'task:complete', task.title);
        setTaskModalVersion(prev => prev + 1);
    };

    const snoozeStudentTask = (studentId: string, taskId: string) => {
        const tasks = loadStudentTasks(studentId);
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;
        const nowIso = new Date().toISOString();
        const updated = tasks.map(t =>
            t.id === taskId
                ? { ...t, createdAt: nowIso, completed: false, completedAt: undefined }
                : t
        );
        saveStudentTasks(studentId, updated);
        recordTaskInteraction(studentId, 'task:snooze', task.title);
        setTaskModalVersion(prev => prev + 1);
    };

    const handleFeedback = (student: Student) => {
        setSelectedStudent(student);
        setIsFeedbackModalOpen(true);
    };

    const handleSaveFeedback = (record: FeedbackRecord) => {
        addFeedbackRecord(record);
    };

    const handleViewFeedbackHistory = (student: Student) => {
        setSelectedStudent(student);
        setIsFeedbackHistoryOpen(true);
    };

    const studentLogs = useMemo(() => {
        const map = new Map<string, AIMessagesLogEntry[]>();
        studentMessages.forEach(entry => {
            if (!map.has(entry.studentId)) {
                map.set(entry.studentId, []);
            }
            map.get(entry.studentId)!.push(entry);
        });
        map.forEach(list => list.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()));
        return map;
    }, [studentMessages]);

    const studentAttendance = useMemo(() => {
        const map = new Map<string, AttendanceRecord[]>();
        attendanceRecords.forEach(entry => {
            if (!map.has(entry.studentId)) {
                map.set(entry.studentId, []);
            }
            map.get(entry.studentId)!.push(entry.record);
        });
        map.forEach(list => list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        return map;
    }, [attendanceRecords]);

    const studentAttendanceMetrics = useMemo(() => {
        const map = new Map<string, { last7: number | null; last30: number | null; consecutiveAbsences: number }>();
        const today = new Date();
        const sevenDaysAgo = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);

        const toDate = (dateStr: string) => new Date(dateStr + 'T00:00:00Z');

        students.forEach(student => {
            const records = studentAttendance.get(student.id) ?? [];
            let consecutiveAbsences = 0;
            for (const record of records) {
                if (!record.present) {
                    consecutiveAbsences += 1;
                } else {
                    break;
                }
            }

            let last7Total = 0;
            let last7Present = 0;
            let last30Total = 0;
            let last30Present = 0;

            records.forEach(record => {
                const attendanceDate = toDate(record.date);
                if (attendanceDate >= sevenDaysAgo) {
                    last7Total += 1;
                    if (record.present) last7Present += 1;
                }
                if (attendanceDate >= thirtyDaysAgo) {
                    last30Total += 1;
                    if (record.present) last30Present += 1;
                }
            });

            const last7 = last7Total > 0 ? Math.round((last7Present / last7Total) * 100) : null;
            const last30 = last30Total > 0 ? Math.round((last30Present / last30Total) * 100) : null;

            map.set(student.id, {
                last7,
                last30,
                consecutiveAbsences,
            });
        });

        return map;
    }, [studentAttendance, students]);

    const feedbackByStudent = useMemo(() => {
        const map = new Map<string, FeedbackRecord[]>();
        feedbackRecords.forEach(record => {
            if (!map.has(record.studentId)) {
                map.set(record.studentId, []);
            }
            map.get(record.studentId)!.push(record);
        });
        map.forEach(list => list.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()));
        return map;
    }, [feedbackRecords]);

    const studentFeedbackStats = useMemo(() => {
        const map = new Map<string, { avg: number; count: number; lastComment?: string }>();
        feedbackByStudent.forEach((records, studentId) => {
            const count = records.length;
            const total = records.reduce((sum, record) => sum + record.rating, 0);
            map.set(studentId, {
                avg: count ? total / count : 0,
                count,
                lastComment: records[0]?.comment,
            });
        });
        return map;
    }, [feedbackByStudent]);

    const getPaymentStatusColor = (status: PaymentStatus) => {
        switch (status) {
            case PaymentStatus.Paid: return 'badge-paid';
            case PaymentStatus.Pending: return 'badge-pending';
            case PaymentStatus.Overdue: return 'badge-overdue';
            default: return 'attendance-none';
        }
    };

    const cohortFilterLabels: Record<StudentCohortKey, string> = {
        discipline: 'Disciplina',
        belt: 'Cinturón',
        risk: 'Nivel de riesgo',
    };

    const chronicStudents = useMemo(() => {
        const set = new Set<string>();
        students.forEach(student => {
            const metrics = studentAttendanceMetrics.get(student.id);
            if (!metrics) return;
            const { consecutiveAbsences, last30 } = metrics;
            if (consecutiveAbsences >= 3 || (typeof last30 === 'number' && last30 < 60)) {
                set.add(student.id);
            }
        });
        return set;
    }, [students, studentAttendanceMetrics]);

    const matchesCohortSelection = (student: Student, filter: { type: StudentCohortKey; value: string }) => {
        if (filter.type === 'discipline') return student.discipline === filter.value;
        if (filter.type === 'belt') return student.belt === filter.value;
        if (filter.type === 'risk') return student.riskLevel === filter.value;
        return true;
    };

    const getAttendanceBadgeClass = (value: number | null) => {
        if (value === null) return 'attendance-none';
        if (value >= 85) return 'attendance-high';
        if (value >= 70) return 'attendance-medium';
        return 'attendance-low';
    };

    const [filterMode, setFilterMode] = useState<'all' | 'flagged' | 'chronic'>('all');
    const [sortKey, setSortKey] = useState<'name' | 'lastMessage'>('name');
    const [cohortFilter, setCohortFilter] = useState<{ type: StudentCohortKey; value: string } | null>(null);

    const handleToggleAttendance = (student: Student, present: boolean) => {
        const today = new Date();
        const dateKey = today.toISOString().slice(0, 10);
        const existing = attendanceRecords.find(entry => entry.studentId === student.id && entry.record.date === dateKey);
        if (existing && existing.record.present === present) {
            return;
        }
        const record: AttendanceRecord = {
            date: dateKey,
            present,
            notedAt: today.toISOString(),
        };

        if (existing) {
            updateAttendanceRecord(existing.id, current => ({ ...current, record }));
        } else {
            addAttendanceRecord({ id: `${student.id}-${dateKey}-${createId()}`, studentId: student.id, record });
        }
    };

    const flaggedStudents = useMemo(() => {
        const flags = new Map<string, 'warning' | 'critical'>();
        students.forEach(student => {
            const metrics = studentAttendanceMetrics.get(student.id);
            if (!metrics) return;
            const { consecutiveAbsences, last7, last30 } = metrics;
            const critical =
                consecutiveAbsences >= 3 ||
                (typeof last30 === 'number' && last30 < 60);
            const warning =
                !critical &&
                (consecutiveAbsences === 2 ||
                    (typeof last30 === 'number' && last30 < 75) ||
                    (typeof last7 === 'number' && last7 < 60));

            if (critical) {
                flags.set(student.id, 'critical');
            } else if (warning) {
                flags.set(student.id, 'warning');
            }
        });
        return flags;
    }, [students, studentAttendanceMetrics]);

    const lastMessageMap = useMemo(() => {
        const map = new Map<string, number>();
        studentMessages.forEach(entry => {
            const timestamp = new Date(entry.generatedAt).getTime();
            const current = map.get(entry.studentId) ?? 0;
            if (timestamp > current) {
                map.set(entry.studentId, timestamp);
            }
        });
        return map;
    }, [studentMessages]);

    const visibleStudents = useMemo(() => {
        let result = [...students];
        if (cohortFilter) {
            result = result.filter(student => matchesCohortSelection(student, cohortFilter));
        }
        if (filterMode === 'flagged') {
            result = result.filter(student => flaggedStudents.has(student.id));
        } else if (filterMode === 'chronic') {
            result = result.filter(student => chronicStudents.has(student.id));
        }
        if (sortKey === 'lastMessage') {
            result.sort((a, b) => {
                const timeA = lastMessageMap.get(a.id) ?? 0;
                const timeB = lastMessageMap.get(b.id) ?? 0;
                return timeB - timeA;
            });
        } else {
            result.sort((a, b) => a.name.localeCompare(b.name));
        }
        return result;
    }, [students, cohortFilter, filterMode, sortKey, flaggedStudents, chronicStudents, lastMessageMap]);

    const handleExportAttendance = () => {
        const data = students.map(student => ({
            id: student.id,
            name: student.name,
            records: studentAttendance.get(student.id) ?? [],
        }));
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `asistencia-dojo-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleResetAttendance = () => {
        if (window.confirm('¿Deseas borrar todos los registros de asistencia? Esta acción no se puede deshacer.')) {
            setAttendanceRecords([]);
        }
    };

    return (
        <div className="p-4 sm:p-8 text-high-contrast-white">
            <div className="flex flex-wrap gap-4 justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold">Gestión de Alumnos</h1>
                    <p className="text-secondary-gray text-sm">Monitorea asistencia, comunicaciones y pagos para anticipar la fuga.</p>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                    <select
                        value={filterMode}
                        onChange={e => setFilterMode(e.target.value as 'all' | 'flagged' | 'chronic')}
                        className="bg-space-black border border-neon-blue/30 rounded px-3 py-2 text-xs sm:text-sm text-high-contrast-white"
                    >
                        <option value="all">Todos los alumnos</option>
                        <option value="flagged">Solo con alertas</option>
                        <option value="chronic">Ausencias crónicas</option>
                    </select>
                    <select
                        value={sortKey}
                        onChange={e => setSortKey(e.target.value as 'name' | 'lastMessage')}
                        className="bg-space-black border border-neon-blue/30 rounded px-3 py-2 text-xs sm:text-sm text-high-contrast-white"
                    >
                        <option value="name">Ordenar por nombre</option>
                        <option value="lastMessage">Ordenar por último contacto IA</option>
                    </select>
                    <button onClick={handleExportAttendance} className="px-3 py-2 rounded border border-neon-blue/30 text-neon-blue hover:bg-neon-blue/20 transition-colors text-xs sm:text-sm">
                        Exportar asistencia
                    </button>
                    <button onClick={handleResetAttendance} className="px-3 py-2 rounded border border-rose-400/30 text-rose-300 hover:bg-rose-500/20 transition-colors text-xs sm:text-sm">
                        Reiniciar asistencia
                    </button>
                    <button onClick={handleAddStudent} className="flex items-center gap-2 px-4 py-2 rounded bg-gradient-to-r from-neon-blue to-cyan-400 hover:shadow-neon transition-shadow text-sm sm:text-base">
                        <PlusCircleIcon />
                        Añadir Alumno
                    </button>
                </div>
            </div>
            {cohortFilter && (
                <div className="flex flex-wrap items-center gap-2 mb-6">
                    <span className="text-xs text-secondary-gray">
                        Filtrando por {cohortFilterLabels[cohortFilter.type]}: <span className="text-high-contrast-white">{cohortFilter.value}</span>
                    </span>
                    <button
                        onClick={() => setCohortFilter(null)}
                        className="px-2 py-1 rounded border border-neon-blue/30 text-neon-blue hover:bg-neon-blue/20 text-xs transition-colors"
                    >
                        Quitar filtro
                    </button>
                </div>
            )}
            
            <div className="bg-nebula-blue border border-neon-blue/20 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-left">
                        <thead className="bg-space-black/50">
                            <tr className="text-sm font-semibold text-secondary-gray uppercase tracking-wider">
                                <th className="p-4">Perfil</th>
                                <th className="p-4">Nombre</th>
                                <th className="p-4">Disciplina</th>
                                <th className="p-4">Cinturón</th>
                                <th className="p-4">Pago</th>
                                <th className="p-4">Asistencia</th>
                                <th className="p-4">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visibleStudents.map(student => {
                                const feedback = studentFeedbackStats.get(student.id);
                                const metrics = studentAttendanceMetrics.get(student.id);
                                return (
                                    <tr
                                        key={student.id}
                                        className={`border-t border-neon-blue/10 hover:bg-neon-blue/10 ${
                                            flaggedStudents.get(student.id) === 'critical'
                                                ? 'bg-rose-500/10'
                                                : flaggedStudents.get(student.id) === 'warning'
                                                    ? 'bg-amber-500/10'
                                                    : ''
                                        }`}
                                    >
                                        <td className="p-4">
                                            <img src={student.profilePicUrl} alt={student.name} className="w-12 h-12 rounded-full object-cover" />
                                        </td>
                                        <td className="p-4 font-medium text-high-contrast-white whitespace-nowrap">{student.name}</td>
                                        <td className="p-4 text-high-contrast-white/80">{student.discipline}</td>
                                        <td className="p-4 text-high-contrast-white/80">{student.belt}</td>
                                        <td className="p-4">
                                            <span className={`${getPaymentStatusColor(student.paymentStatus)} px-2 py-1 text-sm`}> 
                                                {student.paymentStatus}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
                                                <span className={`${getAttendanceBadgeClass(metrics?.last7 ?? null)} `}>
                                                    7d: {typeof metrics?.last7 === 'number' ? `${metrics!.last7}%` : '—'}
                                                </span>
                                                <span className={`${getAttendanceBadgeClass(metrics?.last30 ?? null)} `}>
                                                    30d: {typeof metrics?.last30 === 'number' ? `${metrics!.last30}%` : '—'}
                                                </span>
                                                <span className="text-secondary-gray/80">
                                                    Ausencias seguidas: <span className="text-high-contrast-white">{metrics?.consecutiveAbsences ?? 0}</span>
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex gap-2 items-center flex-wrap">
                                            <button
                                                onClick={() => handleMotivate(student)}
                                                className="p-2 bg-blue-500/20 hover:bg-blue-500/50 rounded-full text-blue-300 hover:text-blue-200 transition-colors"
                                                title="Motivar con IA"
                                            >
                                                <SparklesIcon />
                                            </button>
                                            <button
                                                onClick={() => openTaskModal(student)}
                                                className="p-2 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-full text-emerald-300 hover:text-emerald-200 transition-colors"
                                                title="Seguimiento"
                                            >
                                                <ShieldCheckIcon />
                                            </button>
                                            <button
                                                onClick={() => handleEditStudent(student)}
                                                className="p-2 bg-yellow-500/20 hover:bg-yellow-500/50 rounded-full text-yellow-300 hover:text-yellow-200 transition-colors"
                                                title="Editar"
                                            >
                                                    <PencilIcon />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteStudent(student.id)}
                                                    className="p-2 bg-red-500/20 hover:bg-red-500/50 rounded-full text-red-300 hover:text-red-200 transition-colors"
                                                    title="Eliminar"
                                                >
                                                    <TrashIcon />
                                                </button>
                                                <span className="text-[10px] text-secondary-gray uppercase tracking-wide">
                                                    {(studentLogs.get(student.id)?.length ?? 0)} mensajes
                                                </span>
                                                <div className="flex items-center gap-1 text-[10px] text-secondary-gray">
                                                    <button
                                                        onClick={() => handleToggleAttendance(student, true)}
                                                        className="px-2 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 transition-colors"
                                                    >
                                                        Presente
                                                    </button>
                                                    <button
                                                        onClick={() => handleToggleAttendance(student, false)}
                                                        className="px-2 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 transition-colors"
                                                    >
                                                        Ausente
                                                    </button>
                                                    <span className="ml-1">
                                                        {(() => {
                                                            const todayKey = new Date().toISOString().slice(0, 10);
                                                            const records = studentAttendance.get(student.id) ?? [];
                                                            const todayRecord = records.find(rec => rec.date === todayKey);
                                                            if (!todayRecord) return 'Asistencia hoy: —';
                                                            return todayRecord.present ? 'Asistencia hoy: ✅' : 'Asistencia hoy: ❌';
                                                        })()}
                                                    </span>
                                                    <span className="text-[10px] text-secondary-gray">
                                                        ⭐ {feedback ? feedback.avg.toFixed(1) : '—'} ({feedback?.count ?? 0})
                                                    </span>
                                                    <button
                                                        onClick={() => handleFeedback(student)}
                                                        className="px-2 py-1 rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 transition-colors text-[10px]"
                                                    >
                                                        Feedback
                                                    </button>
                                                    <button
                                                        onClick={() => handleViewFeedbackHistory(student)}
                                                        className={`px-2 py-1 rounded transition-colors text-[10px] ${
                                                            feedback && feedback.count > 0
                                                                ? 'bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200'
                                                                : 'bg-secondary-gray/10 text-secondary-gray cursor-not-allowed'
                                                        }`}
                                                        disabled={!feedback || feedback.count === 0}
                                                    >
                                                        Historial
                                                    </button>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedStudent ? "Editar Alumno" : "Añadir Alumno"}>
                <StudentForm student={selectedStudent || {}} onSave={handleSaveStudent} onCancel={() => setIsModalOpen(false)} />
            </Modal>
            
            {isMotivateModalOpen && selectedStudent && (
                 <MotivateModal 
                    student={selectedStudent} 
                    onClose={() => setIsMotivateModalOpen(false)} 
                    onSaveLog={handleSaveMessage}
                    templates={templates}
                />
            )}

            {isFeedbackModalOpen && selectedStudent && (
                <FeedbackModal
                    student={selectedStudent}
                    onClose={() => setIsFeedbackModalOpen(false)}
                    onSaveFeedback={handleSaveFeedback}
                />
            )}

            {isFeedbackHistoryOpen && selectedStudent && (
                <FeedbackHistoryModal
                    student={selectedStudent}
                    records={feedbackByStudent.get(selectedStudent.id) ?? []}
                    onClose={() => setIsFeedbackHistoryOpen(false)}
                />
            )}

            {isTaskModalOpen && taskModalStudent && (
                <StudentTaskModal
                    student={taskModalStudent}
                    tasks={taskModalTasks}
                    onClose={closeTaskModal}
                    onComplete={taskId => {
                        completeStudentTask(taskModalStudent.id, taskId);
                    }}
                    onSnooze={taskId => {
                        snoozeStudentTask(taskModalStudent.id, taskId);
                    }}
                    formatRelativeTime={formatRelativeTime}
                />
            )}

        </div>
    );
};

export default Students;
