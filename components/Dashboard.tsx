
import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList, type TooltipProps } from 'recharts';
import { Student, PaymentStatus, RiskLevel, MartialArtClass, Transaction, StudentsFilterPreset, CampaignTemplate, CampaignSchedule, TransactionType, Belt } from '../types';
import Modal from './Modal';
import { generateStudentInsightMessage, generateMotivationalMessage } from '../services/geminiService';
import CampaignsPanel from './CampaignsPanel';
import useLocalStorageList from '../hooks/useLocalStorageList';

interface StudentAlert {
    id: string;
    name: string;
    discipline: string;
    severity: 'CRÍTICO' | 'ATENCIÓN';
    tags: string[];
    details: string[];
    attendance: {
        consecutive: number;
        last30Days: number;
    };
}

interface DashboardProps {
    students: Student[];
    classes: MartialArtClass[];
    transactions: Transaction[];
    onNavigateToStudents?: (preset?: StudentsFilterPreset) => void;
    onNavigateToRetention?: () => void;
    onOpenCampaigns?: () => void;
}

// Estructuras locales para tareas y registros de interacción (coinciden con Students.tsx)
interface StoredAlertTask {
    id: string;
    title: string;
    completed: boolean;
    createdAt: string;
    completedAt?: string;
}

const getTaskStorageKey = (studentId: string) => `alert_tasks_${studentId}`;
const getInteractionStorageKey = (studentId: string) => `alert_interactions_${studentId}`;

const createId = () => (typeof crypto !== 'undefined' && (crypto as any).randomUUID ? (crypto as any).randomUUID() : Math.random().toString(36).slice(2, 10));

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

const recordTaskInteraction = (studentId: string, type: 'task:complete' | 'task:snooze' | 'task:add', note: string) => {
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

const StatCard: React.FC<{ title: string; value: string | number; gradient: string }> = ({ title, value, gradient }) => (
    <div className={`bg-nebula-blue p-6 rounded-lg border border-neon-blue/20 shadow-lg`}>
        <h3 className="text-secondary-gray text-sm font-medium uppercase">{title}</h3>
        <p className={`text-4xl font-bold text-transparent bg-clip-text ${gradient}`}>{value}</p>
    </div>
);

const FinancialTooltip: React.FC<TooltipProps<number, string>> = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) {
        return null;
    }

    const ingresosPayload = payload.find(item => item.dataKey === 'Ingresos');
    const gastosPayload = payload.find(item => item.dataKey === 'Gastos');

    const ingresos = Number(ingresosPayload?.value ?? 0);
    const gastos = Number(gastosPayload?.value ?? 0);
    const balance = ingresos - gastos;

    return (
        <div className="rounded-lg border border-neon-blue/40 bg-space-black/90 px-4 py-3 shadow-neon min-w-[180px]">
            <p className="text-sm font-semibold text-high-contrast-white mb-1">{label}</p>
            <div className="text-xs text-secondary-gray space-y-1">
                <div className="flex justify-between gap-4">
                    <span>Ingresos</span>
                    <span className="text-emerald-400 font-semibold">${ingresos.toLocaleString()}</span>
                </div>
                <div className="flex justify-between gap-4">
                    <span>Gastos</span>
                    <span className="text-rose-400 font-semibold">-${gastos.toLocaleString()}</span>
                </div>
                <div className="flex justify-between gap-4 border-t border-neon-blue/20 pt-1 mt-1">
                    <span>Balance</span>
                    <span className={`${balance >= 0 ? 'text-emerald-300' : 'text-rose-300'} font-semibold`}>
                        {balance >= 0 ? '+' : '-'}${Math.abs(balance).toLocaleString()}
                    </span>
                </div>
            </div>
        </div>
    );
};

const Dashboard: React.FC<DashboardProps> = ({ 
    students = [], 
    classes = [], 
    transactions = [], 
    onNavigateToStudents,
    onNavigateToRetention,
    onOpenCampaigns 
}) => {
    // State for charts
    const [retentionData] = useState([
        { month: 'Nov', 'Tasa de Retención': 82.5, 'Alumnos en Riesgo': 17.5 },
        { month: 'Dic', 'Tasa de Retención': 83.2, 'Alumnos en Riesgo': 16.8 },
        { month: 'Ene', 'Tasa de Retención': 84.1, 'Alumnos en Riesgo': 15.9 },
        { month: 'Feb', 'Tasa de Retención': 85.3, 'Alumnos en Riesgo': 14.7 },
        { month: 'Mar', 'Tasa de Retención': 86.8, 'Alumnos en Riesgo': 13.2 },
        { month: 'Abr', 'Tasa de Retención': 87.4, 'Alumnos en Riesgo': 12.6 },
        { month: 'May', 'Tasa de Retención': 88.9, 'Alumnos en Riesgo': 11.1 },
        { month: 'Jun', 'Tasa de Retención': 89.5, 'Alumnos en Riesgo': 10.5 },
        { month: 'Jul', 'Tasa de Retención': 90.2, 'Alumnos en Riesgo': 9.8 },
        { month: 'Ago', 'Tasa de Retención': 91.1, 'Alumnos en Riesgo': 8.9 },
        { month: 'Sep', 'Tasa de Retención': 92.3, 'Alumnos en Riesgo': 7.7 },
        { month: 'Oct', 'Tasa de Retención': 93.5, 'Alumnos en Riesgo': 6.5 }
    ]);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [insightMessage, setInsightMessage] = useState<string>('');
    const [isAlertsOpen, setIsAlertsOpen] = useState(false);
    const [isFollowUpsOpen, setIsFollowUpsOpen] = useState(false);
    const [isCampaignsOverviewOpen, setIsCampaignsOverviewOpen] = useState(false);
    const [isCampaignsPanelOpen, setIsCampaignsPanelOpen] = useState(false);
    const [followUpsFilter, setFollowUpsFilter] = useState<'all' | 'risk' | 'overdue' | 'campaign'>('all');
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [taskModalStudent, setTaskModalStudent] = useState<Student | null>(null);
    const [taskModalTasks, setTaskModalTasks] = useState<StoredAlertTask[]>([]);
    const [taskModalVersion, setTaskModalVersion] = useState(0);

    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [historyStudent, setHistoryStudent] = useState<Student | null>(null);
    const [historyLogs, setHistoryLogs] = useState<any[]>([]);
    const [newTaskTitle, setNewTaskTitle] = useState('');

    // Process financial data for chart
    const monthlyData = useMemo(() => {
        const data: { [key: string]: { name: string; Ingresos: number; Gastos: number } } = {};
        const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

        transactions.forEach(t => {
            const date = new Date(t.date);
            const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
            if (!data[monthKey]) {
                data[monthKey] = { name: monthNames[date.getMonth()], Ingresos: 0, Gastos: 0 };
            }
            if (t.type === TransactionType.Income) {
                data[monthKey].Ingresos += t.amount;
            } else {
                data[monthKey].Gastos += t.amount;
            }
        });

        return Object.values(data).reverse();
    }, [transactions]);

    const stats = useMemo(() => {
        const pendingPayments = students.filter(s => s.paymentStatus === PaymentStatus.Pending || s.paymentStatus === PaymentStatus.Overdue).length;
        const atRiskCount = students.filter(s => s.riskLevel === RiskLevel.High).length;
        const atRiskPercentage = students.length > 0 ? Math.round((atRiskCount / students.length) * 100) : 0;

        return {
            activeStudents: students.length,
            pendingPayments,
            weeklyClasses: classes.length,
            atRiskPercentage
        };
    }, [students, classes]);

    const alerts = useMemo(() => {
        return students
            .filter(s => s.riskLevel === RiskLevel.High || s.paymentStatus === PaymentStatus.Overdue)
            .map(s => {
                const isCritical = s.riskLevel === RiskLevel.High && s.paymentStatus === PaymentStatus.Overdue;
                const tags: string[] = [];
                
                if (s.paymentStatus === PaymentStatus.Overdue) tags.push('Vencido');
                if (s.riskLevel === RiskLevel.High) tags.push('Riesgo Alto');
                if (s.riskLevel === RiskLevel.Medium) tags.push('Riesgo Medio');
                tags.push('Baja asistencia');

                return {
                    id: s.id,
                    name: s.name,
                    discipline: s.discipline,
                    severity: isCritical ? 'CRÍTICO' : 'ATENCIÓN',
                    tags,
                    details: [
                        `${s.paymentStatus === PaymentStatus.Overdue ? 'Pago vencido' : 'Pago pendiente'}`,
                        `${s.riskLevel === RiskLevel.High ? 'Riesgo alto' : 'Riesgo medio'}`,
                        'Asistencia 50% (30 días)'
                    ],
                    attendance: {
                        consecutive: 0,
                        last30Days: 50
                    }
                } as StudentAlert;
            });
    }, [students]);

    const priorityAlerts = useMemo(() => {
        const alerts = [];

        // Alertas de pagos vencidos
        const overdueStudents = students.filter(s => s.paymentStatus === PaymentStatus.Overdue);
        if (overdueStudents.length > 0) {
            alerts.push({
                type: 'danger',
                message: `${overdueStudents.length} alumnos con pagos vencidos`,
                action: () => onNavigateToStudents?.({ focus: 'chronic' })
            });
        }

        // Alertas de alto riesgo
        const highRiskStudents = students.filter(s => s.riskLevel === RiskLevel.High);
        if (highRiskStudents.length > 0) {
            alerts.push({
                type: 'warning',
                message: `${highRiskStudents.length} alumnos en riesgo alto de deserción`,
                action: () => onNavigateToStudents?.({ focus: 'flagged' })
            });
        }

        return alerts;
    }, [students, onNavigateToStudents]);

    const pendingTasks = useMemo(() => {
        const items: Array<{
            student: Student;
            task: StoredAlertTask;
            severity?: 'critical' | 'warning';
            createdAtMs: number | null;
            isOverdue: boolean;
            isCampaign: boolean;
        }> = [];

        let criticalCount = 0;
        let campaignCount = 0;
        let overdueCount = 0;
        let oldestOpenMs: number | null = null;
        let newestOpenMs: number | null = null;

        const now = Date.now();
        const overdueThreshold = now - 2 * 24 * 60 * 60 * 1000;

        students.forEach(student => {
            try {
                const severity = student.riskLevel === RiskLevel.High ? 'critical' : student.riskLevel === RiskLevel.Medium ? 'warning' : undefined;
                const tasks = loadStudentTasks(student.id).filter(task => !task.completed);
                tasks.forEach(task => {
                    const createdAtMs = task.createdAt ? new Date(task.createdAt).getTime() : NaN;
                    const normalizedCreatedAt = Number.isNaN(createdAtMs) ? null : createdAtMs;
                    const isCampaign = /camp(aña|ana|aign)/i.test(task.title);
                    const isOverdue = normalizedCreatedAt !== null && normalizedCreatedAt < overdueThreshold;

                    if (severity === 'critical') criticalCount += 1;
                    if (isCampaign) campaignCount += 1;
                    if (isOverdue) overdueCount += 1;

                    if (normalizedCreatedAt !== null) {
                        if (oldestOpenMs === null || normalizedCreatedAt < oldestOpenMs) {
                            oldestOpenMs = normalizedCreatedAt;
                        }
                        if (newestOpenMs === null || normalizedCreatedAt > newestOpenMs) {
                            newestOpenMs = normalizedCreatedAt;
                        }
                    }

                    items.push({
                        student,
                        task,
                        severity,
                        createdAtMs: normalizedCreatedAt,
                        isOverdue,
                        isCampaign,
                    });
                });
            } catch (err) {
                console.warn('No se pudieron leer las tareas del alumno', student.id, err);
            }
        });

        items.sort((a, b) => {
            const aTime = a.createdAtMs ?? Number.MAX_SAFE_INTEGER;
            const bTime = b.createdAtMs ?? Number.MAX_SAFE_INTEGER;
            return aTime - bTime;
        });

        return {
            items,
            criticalCount,
            campaignCount,
            overdueCount,
            oldestOpenMs,
            newestOpenMs,
        };
    }, [students, taskModalVersion]);

    const formatCount = useCallback((count: number, singular: string, plural: string) => {
        return `${count} ${count === 1 ? singular : plural}`;
    }, []);

    const filteredFollowUps = useMemo(() => {
        return pendingTasks.items.filter(item => {
            if (followUpsFilter === 'risk') return item.severity === 'critical';
            if (followUpsFilter === 'campaign') return item.isCampaign;
            if (followUpsFilter === 'overdue') return item.isOverdue;
            return true;
        });
    }, [pendingTasks, followUpsFilter]);

    const { items: campaignTemplates } = useLocalStorageList<CampaignTemplate>('campaign_templates', []);
    const { items: campaignSchedules } = useLocalStorageList<CampaignSchedule>('campaign_schedules', []);

    const campaignSummary = useMemo(() => {
        const active = campaignSchedules.filter(schedule => schedule.isActive);
        const now = Date.now();
        const sevenDays = 7 * 24 * 60 * 60 * 1000;

        const enriched = active
            .map(schedule => {
                const template = campaignTemplates.find(t => t.id === schedule.templateId);
                const nextRun = new Date(schedule.nextRunAt);
                const nextRunMs = Number.isNaN(nextRun.getTime()) ? null : nextRun.getTime();
                return {
                    schedule,
                    templateName: template?.name ?? 'Plantilla sin nombre',
                    nextRunMs,
                    formattedDate: nextRunMs ? nextRun.toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Sin fecha',
                    frequencyLabel: schedule.frequency === 'weekly' ? 'Semanal' : schedule.frequency === 'biweekly' ? 'Quincenal' : 'Mensual',
                };
            })
            .filter(item => item.nextRunMs !== null)
            .sort((a, b) => (a.nextRunMs ?? Infinity) - (b.nextRunMs ?? Infinity));

        const overdue = enriched.filter(item => (item.nextRunMs ?? 0) <= now);
        const upcoming = enriched.filter(item => (item.nextRunMs ?? 0) > now && (item.nextRunMs ?? 0) <= now + sevenDays);
        const next = enriched.find(item => (item.nextRunMs ?? 0) >= now) ?? null;

        return {
            activeCount: active.length,
            overdue,
            upcoming,
            next,
        };
    }, [campaignSchedules, campaignTemplates]);

    const handleGenerateInsight = async (student: Student) => {
        setSelectedStudent(student);
        const message = await generateStudentInsightMessage(student);
        setInsightMessage(message);
    };

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

    const createTaskForStudent = (studentId: string, title: string) => {
        const tasks = loadStudentTasks(studentId);
        const newTask: StoredAlertTask = { id: createId(), title, completed: false, createdAt: new Date().toISOString() };
        saveStudentTasks(studentId, [...tasks, newTask]);
        recordTaskInteraction(studentId, 'task:add', title);
        setTaskModalVersion(v => v + 1);
        if (taskModalStudent?.id === studentId) setTaskModalTasks(prev => [...prev, newTask]);
    };

    const completeStudentTask = (studentId: string, taskId: string) => {
        const tasks = loadStudentTasks(studentId);
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;
        const nowIso = new Date().toISOString();
        const updated = tasks.map(t => t.id === taskId ? { ...t, completed: true, completedAt: nowIso } : t);
        saveStudentTasks(studentId, updated);
        recordTaskInteraction(studentId, 'task:complete', task.title);
        setTaskModalVersion(v => v + 1);
        if (taskModalStudent?.id === studentId) setTaskModalTasks(updated);
    };

    const snoozeStudentTask = (studentId: string, taskId: string) => {
        const tasks = loadStudentTasks(studentId);
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;
        const nowIso = new Date().toISOString();
        const updated = tasks.map(t => t.id === taskId ? { ...t, createdAt: nowIso, completed: false, completedAt: undefined } : t);
        saveStudentTasks(studentId, updated);
        recordTaskInteraction(studentId, 'task:snooze', task.title);
        setTaskModalVersion(v => v + 1);
        if (taskModalStudent?.id === studentId) setTaskModalTasks(updated);
    };

    const openHistoryForStudent = (student: Student) => {
        setHistoryStudent(student);
        // load AI message logs
        try {
            const raw = window.localStorage.getItem('ai_message_logs');
            const parsed = raw ? JSON.parse(raw) : [];
            const filtered = parsed.filter((entry: any) => entry.studentId === student.id);
            // interactions
            const interactionsRaw = window.localStorage.getItem(getInteractionStorageKey(student.id));
            const interactions = interactionsRaw ? JSON.parse(interactionsRaw) : [];
            setHistoryLogs([...interactions, ...filtered].sort((a: any, b: any) => new Date(b.timestamp || b.generatedAt).getTime() - new Date(a.timestamp || a.generatedAt).getTime()));
        } catch (err) {
            setHistoryLogs([]);
        }
        setIsHistoryOpen(true);
    };

    const closeHistory = () => {
        setIsHistoryOpen(false);
        setHistoryStudent(null);
        setHistoryLogs([]);
    };

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
    }, []);

    const formatRelativeFromMs = useCallback((ms: number | null) => {
        if (ms === null) return 'Reciente';
        return formatRelativeTime(new Date(ms).toISOString());
    }, [formatRelativeTime]);

    const followUpSummary = useMemo(() => {
        return {
            open: pendingTasks.items.length,
            urgent: pendingTasks.criticalCount,
            campaigns: pendingTasks.campaignCount,
            lastOpened: formatRelativeFromMs(pendingTasks.oldestOpenMs),
            lastUpdated: formatRelativeFromMs(pendingTasks.newestOpenMs),
        };
    }, [pendingTasks, formatRelativeFromMs]);

    return (
        <div className="p-8 text-high-contrast-white">
            <h1 className="text-3xl font-bold mb-8">Panel de Control</h1>
            
            {/* Estadísticas Principales */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <StatCard 
                    title="Alumnos Activos" 
                    value={stats.activeStudents} 
                    gradient="bg-gradient-to-r from-green-400 to-cyan-400" 
                />
                <StatCard 
                    title="Pagos Pendientes" 
                    value={stats.pendingPayments} 
                    gradient="bg-gradient-to-r from-yellow-400 to-orange-400" 
                />
                <StatCard 
                    title="Clases Semanales" 
                    value={stats.weeklyClasses} 
                    gradient="bg-gradient-to-r from-blue-400 to-purple-400" 
                />
                <StatCard 
                    title="Alumnos en Riesgo" 
                    value={`${stats.atRiskPercentage}%`} 
                    gradient="bg-gradient-to-r from-red-400 to-pink-400" 
                />
            </div>

            {/* Secciones principales */}
            <div className="space-y-6 mb-8">
                <div className="bg-nebula-blue p-6 rounded-lg border border-neon-blue/20 shadow-lg">
                    <button
                        type="button"
                        onClick={() => setIsAlertsOpen(prev => !prev)}
                        className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-left"
                    >
                        <div>
                            <h2 className="text-xl font-bold">Alertas Prioritarias</h2>
                            <p className="text-xs uppercase tracking-wide text-secondary-gray mt-1">
                                {alerts.length > 0 ? `${alerts.length} pendientes` : 'Sin alertas pendientes'}
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            {alerts.length > 0 && (
                                <span className="text-[10px] uppercase tracking-wide px-2 py-1 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30">
                                    Acción requerida
                                </span>
                            )}
                            <span className="text-xs text-secondary-gray flex items-center gap-1">
                                {isAlertsOpen ? 'Ocultar' : 'Ver'}
                                <span className="text-base leading-none">{isAlertsOpen ? '▾' : '▸'}</span>
                            </span>
                        </div>
                    </button>
                    {isAlertsOpen && (
                        alerts.length === 0 ? (
                            <p className="text-secondary-gray text-sm mt-4">Todo marcha bien. No hay alertas activas en este momento.</p>
                        ) : (
                            <div className="mt-4 space-y-4">
                                {alerts.map(alert => (
                                    <div key={alert.id} className="rounded-lg border border-neon-blue/15 bg-space-black/60 px-4 py-3">
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-0.5 text-[11px] uppercase tracking-wide font-semibold rounded-full ${alert.severity === 'CRÍTICO' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'}`}>
                                                        {alert.severity === 'CRÍTICO' ? 'Crítico' : 'Atención'}
                                                    </span>
                                                    <span className="text-xs text-secondary-gray">{alert.discipline}</span>
                                                </div>
                                                <p className="text-base font-semibold text-high-contrast-white mt-2">{alert.name}</p>
                                                <p className="text-sm text-secondary-gray mt-1">{alert.details.join(' · ')}</p>
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    {alert.tags.map((tag, idx) => (
                                                        <span key={idx} className="px-2 py-0.5 text-xs rounded-md bg-nebula-blue/40 border border-neon-blue/20">{tag}</span>
                                                    ))}
                                                </div>
                                                <p className="text-xs text-secondary-gray mt-2">Ausencias consecutivas: {alert.attendance.consecutive} · Asistencia 30 días: {alert.attendance.last30Days}%</p>
                                            </div>
                                            <div className="flex flex-wrap justify-end gap-2 text-xs">
                                                <button onClick={() => onNavigateToStudents?.({ focus: 'flagged', taskStudentId: alert.id })} className="px-3 py-1 rounded-md bg-nebula-blue/15 hover:bg-nebula-blue/25 text-neon-blue transition-colors">Contactar</button>
                                                <button onClick={() => { const student = students.find(s => s.id === alert.id); if (student) openTaskModal(student); }} className="px-3 py-1 rounded-md bg-space-black/40 border border-neon-blue/20 hover:bg-space-black/60 text-secondary-gray transition-colors">Crear tarea</button>
                                                <button onClick={() => { const tasks = loadStudentTasks(alert.id); const pending = tasks.find(t => !t.completed); if (pending) completeStudentTask(alert.id, pending.id); }} className="px-3 py-1 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 transition-colors">Marcar resuelta</button>
                                                <button onClick={() => { const tasks = loadStudentTasks(alert.id); const pending = tasks.find(t => !t.completed); if (pending) snoozeStudentTask(alert.id, pending.id); }} className="px-3 py-1 rounded-md bg-secondary-gray/15 hover:bg-secondary-gray/25 text-secondary-gray transition-colors">Posponer</button>
                                                <button onClick={() => { const student = students.find(s => s.id === alert.id); if (student) openHistoryForStudent(student); }} className="px-3 py-1 rounded-md border border-neon-blue/20 hover:bg-neon-blue/20 text-neon-blue transition-colors">Ver historial</button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                </div>

                <div className="bg-nebula-blue p-6 rounded-lg border border-neon-blue/20 shadow-lg">
                    <button
                        type="button"
                        onClick={() => setIsFollowUpsOpen(prev => !prev)}
                        className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-left"
                    >
                        <div>
                            <h2 className="text-xl font-bold">Seguimiento pendiente</h2>
                            <p className="text-xs uppercase tracking-wide text-secondary-gray mt-1">
                                Resumen de recordatorios para alumnos con seguimiento activo
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-secondary-gray">
                            <span className="px-2.5 py-1 rounded-md border border-neon-blue/20 bg-neon-blue/10 text-neon-blue">
                                {formatCount(followUpSummary.open, 'abierta', 'abiertas')}
                            </span>
                            <span className="px-2.5 py-1 rounded-md border border-rose-500/30 bg-rose-500/10 text-rose-300">
                                {formatCount(followUpSummary.urgent, 'urgente', 'urgentes')}
                            </span>
                            <span className="px-2.5 py-1 rounded-md border border-purple-500/30 bg-purple-500/10 text-purple-200">
                                {formatCount(followUpSummary.campaigns, 'campaña', 'campañas')}
                            </span>
                            <span className="px-2.5 py-1 rounded-md border border-secondary-gray/30 bg-secondary-gray/15 text-secondary-gray">
                                Abierta {followUpSummary.lastOpened}
                            </span>
                            <span className="px-2.5 py-1 rounded-md border border-secondary-gray/30 bg-secondary-gray/15 text-secondary-gray">
                                Actualización {followUpSummary.lastUpdated}
                            </span>
                            <span className="text-xs text-secondary-gray flex items-center gap-1 ml-auto">
                                {isFollowUpsOpen ? 'Ocultar' : 'Ver'}
                                <span className="text-base leading-none">{isFollowUpsOpen ? '▾' : '▸'}</span>
                            </span>
                        </div>
                    </button>
                    {isFollowUpsOpen && (
                        <div className="mt-4 space-y-4">
                            <div className="flex flex-wrap gap-2 text-xs">
                                {[
                                    {
                                        key: 'all' as const,
                                        label: formatCount(followUpSummary.open, 'abierta', 'abiertas'),
                                        active: 'border-neon-blue/60 text-neon-blue bg-neon-blue/15',
                                        inactive: 'border-neon-blue/20 text-secondary-gray hover:bg-neon-blue/10',
                                    },
                                    {
                                        key: 'risk' as const,
                                        label: formatCount(followUpSummary.urgent, 'urgente', 'urgentes'),
                                        active: 'border-rose-400/60 text-rose-300 bg-rose-500/15',
                                        inactive: 'border-rose-400/20 text-secondary-gray hover:bg-rose-500/10',
                                    },
                                    {
                                        key: 'overdue' as const,
                                        label: formatCount(pendingTasks.overdueCount, 'vencida', 'vencidas'),
                                        active: 'border-amber-400/60 text-amber-200 bg-amber-500/15',
                                        inactive: 'border-amber-400/20 text-secondary-gray hover:bg-amber-500/10',
                                    },
                                    {
                                        key: 'campaign' as const,
                                        label: formatCount(followUpSummary.campaigns, 'campaña', 'campañas'),
                                        active: 'border-purple-400/60 text-purple-200 bg-purple-500/15',
                                        inactive: 'border-purple-400/20 text-secondary-gray hover:bg-purple-500/10',
                                    },
                                ].map(option => (
                                    <button
                                        key={option.key}
                                        onClick={() => setFollowUpsFilter(option.key)}
                                        className={`px-3 py-1 rounded-md border transition-colors ${followUpsFilter === option.key ? option.active : option.inactive}`}
                                        aria-pressed={followUpsFilter === option.key}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                                <button
                                    onClick={() => {
                                        const target = filteredFollowUps[0]?.student.id;
                                        onNavigateToStudents?.({ focus: 'flagged', taskStudentId: target });
                                    }}
                                    className="px-3 py-1 rounded-md border border-neon-blue/20 hover:bg-neon-blue/20 transition-colors text-neon-blue"
                                >
                                    Ver alumnos
                                </button>
                                <button
                                    onClick={() => {
                                        setIsCampaignsPanelOpen(true);
                                        onOpenCampaigns?.();
                                    }}
                                    className="px-3 py-1 rounded-md border border-secondary-gray/30 hover:bg-secondary-gray/20 transition-colors text-secondary-gray"
                                >
                                    Abrir panel de campañas
                                </button>
                            </div>
                            {priorityAlerts.length > 0 && (
                                <div className="space-y-2">
                                    {priorityAlerts.map((item, idx) => (
                                        <div
                                            key={idx}
                                            className={`px-4 py-2 rounded-md border ${
                                                item.type === 'danger'
                                                    ? 'border-rose-500/30 bg-rose-500/10 text-rose-200'
                                                    : 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                                            } flex items-center justify-between text-xs`}
                                        >
                                            <span>{item.message}</span>
                                            {item.action && (
                                                <button onClick={item.action} className="ml-3 underline hover:text-high-contrast-white">
                                                    Revisar
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="space-y-3">
                                {filteredFollowUps.length === 0 ? (
                                    <p className="text-sm text-secondary-gray">No hay tareas que coincidan con el filtro seleccionado.</p>
                                ) : (
                                    filteredFollowUps.slice(0, 6).map(item => {
                                        const createdLabel = item.createdAtMs ? new Date(item.createdAtMs).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Reciente';
                                        return (
                                            <div key={`${item.student.id}-${item.task.id}`} className="rounded-lg border border-neon-blue/15 bg-space-black/60 px-4 py-3">
                                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-sm font-semibold text-high-contrast-white">{item.student.name}</p>
                                                            {item.severity === 'critical' && (
                                                                <span className="px-2 py-0.5 text-[10px] uppercase tracking-wide rounded-md bg-rose-500/15 text-rose-300 border border-rose-500/30">
                                                                    Riesgo alto
                                                                </span>
                                                            )}
                                                            {item.isCampaign && (
                                                                <span className="px-2 py-0.5 text-[10px] uppercase tracking-wide rounded-md bg-purple-500/15 text-purple-200 border border-purple-500/30">
                                                                    Campaña
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-secondary-gray mt-1">{item.task.title}</p>
                                                        <p className="text-xs text-secondary-gray mt-1">
                                                            Creada: {createdLabel} · {formatRelativeFromMs(item.createdAtMs)}
                                                        </p>
                                                    </div>
                                                    <div className="flex flex-wrap justify-end gap-2 text-xs">
                                                        <button
                                                            onClick={() => completeStudentTask(item.student.id, item.task.id)}
                                                            className="px-3 py-1 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 transition-colors"
                                                        >
                                                            Marcar completada
                                                        </button>
                                                        <button
                                                            onClick={() => snoozeStudentTask(item.student.id, item.task.id)}
                                                            className="px-3 py-1 rounded-md bg-secondary-gray/15 hover:bg-secondary-gray/25 text-secondary-gray transition-colors"
                                                        >
                                                            Posponer
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                const st = students.find(s => s.id === item.student.id);
                                                                if (st) openTaskModal(st);
                                                                onNavigateToStudents?.({ taskStudentId: item.student.id });
                                                            }}
                                                            className="px-3 py-1 rounded-md border border-neon-blue/20 hover:bg-neon-blue/20 text-neon-blue transition-colors"
                                                        >
                                                            Abrir alumno
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="bg-nebula-blue p-6 rounded-lg border border-neon-blue/20 shadow-lg">
                    <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setIsCampaignsOverviewOpen(prev => !prev)}
                        onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') setIsCampaignsOverviewOpen(prev => !prev); }}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 cursor-pointer"
                        aria-expanded={isCampaignsOverviewOpen}
                    >
                        <div>
                            <h2 className="text-xl font-bold">Campañas Programadas</h2>
                            <p className="text-xs uppercase tracking-wide text-secondary-gray mt-1">
                                {campaignSummary.activeCount > 0 ? `${campaignSummary.activeCount} activas · ${campaignSummary.overdue.length} vencidas · ${campaignSummary.upcoming.length} próximas` : 'Aún no hay campañas en el calendario'}
                            </p>
                            {campaignSummary.next && (
                                <p className="text-xs text-secondary-gray/70 mt-1">
                                    Próxima ejecución: {campaignSummary.next.templateName} · {campaignSummary.next.formattedDate}
                                </p>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            <span className={`px-2.5 py-1 text-[11px] uppercase tracking-wide rounded-full border ${campaignSummary.overdue.length > 0 ? 'border-rose-400/40 bg-rose-500/10 text-rose-300' : 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200'}`}>
                                {campaignSummary.overdue.length > 0 ? `${campaignSummary.overdue.length} vencidas` : 'Al día'}
                            </span>
                            <button
                                type="button"
                                onClick={event => {
                                    event.stopPropagation();
                                    setIsCampaignsPanelOpen(true);
                                    onOpenCampaigns?.();
                                }}
                                className="px-3 py-1.5 rounded-md bg-neon-blue/15 hover:bg-neon-blue/25 text-neon-blue border border-neon-blue/30 transition-colors"
                            >
                                Gestionar campañas
                            </button>
                            <span className="text-xs text-secondary-gray flex items-center gap-1">
                                {isCampaignsOverviewOpen ? 'Ocultar' : 'Ver'}
                                <span className="text-base leading-none">{isCampaignsOverviewOpen ? '▾' : '▸'}</span>
                            </span>
                        </div>
                    </div>
                    {isCampaignsOverviewOpen && (
                        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div className="border border-rose-500/20 rounded-lg bg-rose-500/5 p-4">
                                <h3 className="text-sm font-semibold text-rose-300 mb-2">Vencidas</h3>
                                {campaignSummary.overdue.length === 0 ? (
                                    <p className="text-xs text-secondary-gray">Sin pendientes atrasados.</p>
                                ) : (
                                    <ul className="space-y-2 text-xs text-secondary-gray">
                                        {campaignSummary.overdue.slice(0, 3).map(item => (
                                            <li key={item.schedule.id} className="flex justify-between gap-3">
                                                <span className="text-high-contrast-white">{item.templateName}</span>
                                                <span>{item.formattedDate}</span>
                                            </li>
                                        ))}
                                        {campaignSummary.overdue.length > 3 && (
                                            <li className="text-rose-300">+ {campaignSummary.overdue.length - 3} más…</li>
                                        )}
                                    </ul>
                                )}
                            </div>
                            <div className="border border-neon-blue/20 rounded-lg bg-space-black/40 p-4">
                                <h3 className="text-sm font-semibold text-neon-blue mb-2">Próximas 7 días</h3>
                                {campaignSummary.upcoming.length === 0 ? (
                                    <p className="text-xs text-secondary-gray">No hay campañas en la próxima semana.</p>
                                ) : (
                                    <ul className="space-y-2 text-xs text-secondary-gray">
                                        {campaignSummary.upcoming.slice(0, 3).map(item => (
                                            <li key={item.schedule.id}>
                                                <p className="text-high-contrast-white">{item.templateName}</p>
                                                <p>{item.frequencyLabel} · {item.formattedDate}</p>
                                            </li>
                                        ))}
                                        {campaignSummary.upcoming.length > 3 && (
                                            <li className="text-neon-blue/80">+ {campaignSummary.upcoming.length - 3} adicionales…</li>
                                        )}
                                    </ul>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Campañas con IA */}
            <div className="mb-8 bg-nebula-blue p-6 rounded-lg border border-neon-blue/20 shadow-lg">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold">Campañas con IA</h2>
                        <p className="text-xs uppercase tracking-wide text-secondary-gray mt-1">Gestiona plantillas, mensajes y campañas programadas.</p>
                        <div className="mt-3 flex flex-wrap gap-3 text-xs text-secondary-gray">
                            <span className="px-3 py-1 rounded-md bg-space-black/40 border border-neon-blue/20">{campaignTemplates.length} plantillas</span>
                            <span className="px-3 py-1 rounded-md bg-space-black/40 border border-neon-blue/20">{campaignSchedules.length} programaciones</span>
                            <span className="px-3 py-1 rounded-md bg-space-black/40 border border-neon-blue/20">{campaignSummary.activeCount} activas</span>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsCampaignsPanelOpen(prev => !prev)}
                        className="self-start px-3 py-1 rounded-md border border-neon-blue/20 text-xs text-secondary-gray hover:bg-neon-blue/20 hover:text-neon-blue transition-colors"
                    >
                        {isCampaignsPanelOpen ? 'Ocultar panel' : 'Ver panel'}
                    </button>
                </div>
                {isCampaignsPanelOpen && (
                    <div className="mt-6">
                        <CampaignsPanel
                            students={students}
                            isOpen={isCampaignsPanelOpen}
                            onToggle={() => setIsCampaignsPanelOpen(false)}
                            onTasksUpdated={() => setIsFollowUpsOpen(true)}
                        />
                    </div>
                )}
            </div>

            {/* Retención vs. Mes Anterior */}
            <div className="mb-8 bg-nebula-blue p-6 rounded-lg border border-neon-blue/20 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold">Retención vs. Mes Anterior</h2>
                        <p className="text-xs uppercase tracking-wide text-secondary-gray mt-1">Actual: 93.5% · Anterior: 92.3%</p>
                    </div>
                    <div className="text-3xl font-bold text-emerald-400">+1.2%</div>
                </div>
                <button onClick={onNavigateToRetention} className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-md border border-neon-blue/20 text-sm text-neon-blue hover:bg-neon-blue/20 transition-colors">Ver análisis detallado</button>
            </div>

            {/* Gráficos principales */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="bg-nebula-blue p-6 rounded-lg border border-neon-blue/20 shadow-lg">
                    <h2 className="text-xl font-bold mb-4">Resumen Financiero</h2>
                    <div style={{ width: '100%', height: 300 }}><ResponsiveContainer>
                        <BarChart data={monthlyData} margin={{ top: 20, right: 20, left: -10, bottom: 5 }} barCategoryGap="35%">
                            <defs>
                                <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#34d399" stopOpacity={1} />
                                    <stop offset="100%" stopColor="#0ea5e9" stopOpacity={1} />
                                </linearGradient>
                                <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#fb7185" stopOpacity={1} />
                                    <stop offset="100%" stopColor="#facc15" stopOpacity={1} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#94A3B820" />
                            <XAxis dataKey="name" stroke="#94A3B8" />
                            <YAxis stroke="#94A3B8" tickFormatter={(value) => `$${Number(value).toLocaleString()}`} />
                            <Tooltip content={<FinancialTooltip />} />
                            <Legend wrapperStyle={{color: '#F8FAFC'}} iconType="circle" />
                            <Bar dataKey="Ingresos" fill="url(#incomeGradient)" radius={[12, 12, 4, 4]} maxBarSize={42}>
                                <LabelList dataKey="Ingresos" position="top" formatter={(value: number) => `$${value.toLocaleString()}`} style={{ fill: '#F8FAFC', fontSize: 12 }} />
                            </Bar>
                            <Bar dataKey="Gastos" fill="url(#expenseGradient)" radius={[12, 12, 4, 4]} maxBarSize={42}>
                                <LabelList dataKey="Gastos" position="top" formatter={(value: number) => `$${value.toLocaleString()}`} style={{ fill: '#F8FAFC', fontSize: 12 }} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer></div>
                </div>
                <div className="bg-nebula-blue p-6 rounded-lg border border-neon-blue/20 shadow-lg">
                    <h2 className="text-xl font-bold mb-4">Análisis de Retención</h2>
                    <div style={{ width: '100%', height: 300 }}><ResponsiveContainer>
                        <LineChart data={retentionData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#94A3B820" />
                            <XAxis dataKey="month" stroke="#94A3B8" />
                            <YAxis stroke="#94A3B8" />
                            <Tooltip contentStyle={{ backgroundColor: '#020617', border: '1px solid #00D8FF80', color: '#F8FAFC' }} />
                            <Legend wrapperStyle={{color: '#F8FAFC'}} />
                            <Line type="monotone" dataKey="Tasa de Retención" stroke="#10b981" strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="Alumnos en Riesgo" stroke="#ef4444" strokeWidth={2} dot={false} />
                        </LineChart>
                    </ResponsiveContainer></div>
                </div>
            </div>

            {/* Task modal (reutilizable dentro del dashboard) */}
            {isTaskModalOpen && taskModalStudent && (
                <Modal isOpen={true} onClose={closeTaskModal} title={`Seguimiento de ${taskModalStudent.name}`}>
                    <div className="space-y-4">
                        {taskModalTasks.length === 0 ? (
                            <p className="text-sm text-secondary-gray">No hay tareas activas para este alumno.</p>
                        ) : (
                            <ul className="space-y-3 max-h-80 overflow-y-auto pr-2">
                                {taskModalTasks.map(task => (
                                    <li key={task.id} className="border border-neon-blue/20 rounded-lg bg-space-black/60 px-4 py-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-semibold text-high-contrast-white">{task.title}</p>
                                                <p className="text-xs text-secondary-gray mt-1">Creada {new Date(task.createdAt).toLocaleString('es-ES')}</p>
                                                {task.completed && task.completedAt && <p className="text-xs text-emerald-300 mt-1">Completada {new Date(task.completedAt).toLocaleString('es-ES')}</p>}
                                            </div>
                                            <div className="flex gap-2 text-xs">
                                                {!task.completed && (
                                                    <>
                                                        <button onClick={() => completeStudentTask(taskModalStudent.id, task.id)} className="px-3 py-1 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300">Marcar completada</button>
                                                        <button onClick={() => snoozeStudentTask(taskModalStudent.id, task.id)} className="px-3 py-1 rounded-md bg-secondary-gray/15 hover:bg-secondary-gray/25 text-secondary-gray">Posponer</button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}

                        <div className="pt-2">
                            <label className="block text-xs uppercase tracking-wide text-secondary-gray mb-1">Nueva tarea</label>
                            <div className="flex gap-2">
                                <input value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} className="flex-1 bg-space-black border border-neon-blue/20 rounded px-3 py-2 text-sm text-high-contrast-white" placeholder="Título de la tarea" />
                                <button onClick={() => {
                                    if (!newTaskTitle.trim() || !taskModalStudent) return;
                                    createTaskForStudent(taskModalStudent.id, newTaskTitle.trim());
                                    setNewTaskTitle('');
                                }} className="px-4 py-2 rounded bg-gradient-to-r from-neon-blue to-cyan-400">Crear</button>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <button onClick={closeTaskModal} className="px-4 py-2 rounded border border-secondary-gray/40 text-secondary-gray">Cerrar</button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Interaction / AI messages history modal */}
            {isHistoryOpen && historyStudent && (
                <Modal isOpen={true} onClose={closeHistory} title={`Historial · ${historyStudent.name}`}>
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                        {historyLogs.length === 0 ? (
                            <p className="text-sm text-secondary-gray">No hay registros en el historial.</p>
                        ) : (
                            historyLogs.map((entry, idx) => (
                                <div key={idx} className="rounded-lg border border-neon-blue/20 bg-space-black/60 p-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-sm text-high-contrast-white">{entry.message || entry.note || entry.type}</p>
                                            <p className="text-xs text-secondary-gray mt-1">{new Date(entry.generatedAt || entry.timestamp).toLocaleString('es-ES')}</p>
                                        </div>
                                        <div className="text-xs text-secondary-gray">{formatRelativeTime(entry.generatedAt || entry.timestamp)}</div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    <div className="flex justify-end mt-4">
                        <button onClick={closeHistory} className="px-4 py-2 rounded border border-secondary-gray/40 text-secondary-gray">Cerrar</button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default Dashboard;
