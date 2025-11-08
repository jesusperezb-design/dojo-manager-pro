import React, { useMemo, useState, useEffect } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import type { Student, CampaignSegment, CampaignTemplate, CampaignRun, AIMessagesLogEntry, CampaignSchedule, CampaignFrequency } from '../types';
import { PaymentStatus, RiskLevel, Belt } from '../types';
import { generateCampaignMessage } from '../services/geminiService';

const SEGMENTS: CampaignSegment[] = ['Todos', 'Riesgo Alto', 'Pagos Pendientes', 'Nuevos Ingresos', 'Avanzados'];
const FREQUENCIES: { value: CampaignFrequency; label: string; days: number }[] = [
    { value: 'weekly', label: 'Semanal', days: 7 },
    { value: 'biweekly', label: 'Quincenal', days: 14 },
    { value: 'monthly', label: 'Mensual', days: 30 },
];

const createId = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2, 10));

const DEFAULT_TEMPLATES: CampaignTemplate[] = [
    {
        id: createId(),
        name: 'Reactivar alumnos en riesgo',
        segment: 'Riesgo Alto',
        prompt: 'Recuerda que estamos junto a ellos y ofrece una clase personalizada esta semana.',
        createdAt: new Date().toISOString(),
    },
    {
        id: createId(),
        name: 'Bienvenida nuevos ingresos',
        segment: 'Nuevos Ingresos',
        prompt: 'Dales tips para sus primeras dos semanas y recuérdales las sesiones de onboarding.',
        createdAt: new Date().toISOString(),
    },
];

const matchesSegment = (student: Student, segment: CampaignSegment) => {
    if (segment === 'Todos') return true;
    if (segment === 'Riesgo Alto') return student.riskLevel === RiskLevel.High;
    if (segment === 'Pagos Pendientes') {
        return student.paymentStatus === PaymentStatus.Pending || student.paymentStatus === PaymentStatus.Overdue;
    }
    if (segment === 'Nuevos Ingresos') {
        const joinDate = new Date(student.joinDate);
        const diffDays = (Date.now() - joinDate.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays <= 45;
    }
    if (segment === 'Avanzados') {
        return student.belt === Belt.Black || student.belt === Belt.Brown;
    }
    return false;
};

const toDateTimeLocal = (date: Date) => {
    const copy = new Date(date);
    copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
    return copy.toISOString().slice(0, 16);
};

const fromDateTimeLocal = (value: string) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const computeNextRunDate = (from: Date, frequency: CampaignFrequency) => {
    const next = new Date(from);
    if (frequency === 'weekly') {
        next.setDate(next.getDate() + 7);
    } else if (frequency === 'biweekly') {
        next.setDate(next.getDate() + 14);
    } else {
        next.setMonth(next.getMonth() + 1);
    }
    return next;
};

const appendFollowUpTask = (studentId: string, title: string) => {
    if (typeof window === 'undefined') return;
    const taskKey = `alert_tasks_${studentId}`;
    const interactionKey = `alert_interactions_${studentId}`;
    const createdAt = new Date().toISOString();
    try {
        const rawTasks = window.localStorage.getItem(taskKey);
        const tasks = rawTasks ? JSON.parse(rawTasks) : [];
        const newTask = {
            id: createId(),
            title,
            completed: false,
            createdAt,
        };
        window.localStorage.setItem(taskKey, JSON.stringify([...tasks, newTask]));

        const rawInteractions = window.localStorage.getItem(interactionKey);
        const interactions = rawInteractions ? JSON.parse(rawInteractions) : [];
        const updatedInteractions = [...interactions, { timestamp: createdAt, type: 'task:add', note: title }];
        window.localStorage.setItem(interactionKey, JSON.stringify(updatedInteractions));
    } catch (err) {
        console.warn('No se pudo programar la tarea de seguimiento para', studentId, err);
    }
};

interface CampaignsPanelProps {
    students: Student[];
    isOpen: boolean;
    onToggle: () => void;
    onTasksUpdated?: () => void;
}

const CampaignsPanel: React.FC<CampaignsPanelProps> = ({ students, isOpen, onToggle, onTasksUpdated }) => {
    const [templates, setTemplates] = useLocalStorage<CampaignTemplate[]>('campaign_templates', DEFAULT_TEMPLATES);
    const [runs, setRuns] = useLocalStorage<CampaignRun[]>('campaign_runs', []);
    const [messageLog, setMessageLog] = useLocalStorage<AIMessagesLogEntry[]>('ai_message_logs', []);
    const [schedules, setSchedules] = useLocalStorage<CampaignSchedule[]>('campaign_schedules', []);

    const [selectedTemplateId, setSelectedTemplateId] = useState<string>(templates[0]?.id ?? '');
    const [isGenerating, setIsGenerating] = useState(false);
    const [previewMessage, setPreviewMessage] = useState('');
    const [templateError, setTemplateError] = useState<string | null>(null);
    const [campaignError, setCampaignError] = useState<string | null>(null);
    const [scheduleError, setScheduleError] = useState<string | null>(null);

    const [newTemplate, setNewTemplate] = useState({
        name: '',
        segment: SEGMENTS[0],
        prompt: '',
    });

    const defaultStart = useMemo(() => {
        const base = new Date();
        base.setHours(9, 0, 0, 0);
        return toDateTimeLocal(base);
    }, []);

    const [newSchedule, setNewSchedule] = useState({
        templateId: templates[0]?.id ?? '',
        frequency: FREQUENCIES[0].value as CampaignFrequency,
        startAt: defaultStart,
        notes: '',
    });

    const selectedTemplate = templates.find(t => t.id === selectedTemplateId) ?? templates[0];

    useEffect(() => {
        if (!selectedTemplate && templates.length > 0) {
            setSelectedTemplateId(templates[0].id);
        }
    }, [templates]); // ensures selection valid

    useEffect(() => {
        setNewSchedule(prev => ({
            ...prev,
            templateId: selectedTemplate?.id ?? templates[0]?.id ?? '',
        }));
    }, [selectedTemplate?.id, templates]);

    const targetStudents = useMemo(() => {
        if (!selectedTemplate) return [];
        return students.filter(student => matchesSegment(student, selectedTemplate.segment));
    }, [students, selectedTemplate]);

    const sortedSchedules = useMemo(() => {
        return schedules
            .slice()
            .sort((a, b) => new Date(a.nextRunAt).getTime() - new Date(b.nextRunAt).getTime());
    }, [schedules]);

    const recentRuns = runs.slice().reverse().slice(0, 4);

    const formatDateTime = (iso?: string) => {
        if (!iso) return '—';
        const date = new Date(iso);
        return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
    };

    const handleCreateTemplate = () => {
        if (!newTemplate.name.trim()) {
            setTemplateError('El nombre de la plantilla es obligatorio.');
            return;
        }

        const template: CampaignTemplate = {
            id: createId(),
            name: newTemplate.name.trim(),
            segment: newTemplate.segment,
            prompt: newTemplate.prompt.trim(),
            createdAt: new Date().toISOString(),
        };
        const updated = [...templates, template];
        setTemplates(updated);
        setSelectedTemplateId(template.id);
        setNewTemplate({ name: '', segment: SEGMENTS[0], prompt: '' });
        setTemplateError(null);
    };

    const handleCreateSchedule = () => {
        if (!newSchedule.templateId) {
            setScheduleError('Selecciona una plantilla para programar la campaña.');
            return;
        }
        const template = templates.find(t => t.id === newSchedule.templateId);
        if (!template) {
            setScheduleError('La plantilla seleccionada ya no existe.');
            return;
        }
        const start = fromDateTimeLocal(newSchedule.startAt);
        if (!start) {
            setScheduleError('Define una fecha y hora válidas para la primera ejecución.');
            return;
        }
        const now = Date.now();
        if (start.getTime() <= now) {
            setScheduleError('La primera ejecución debe ser en el futuro.');
            return;
        }
        const schedule: CampaignSchedule = {
            id: createId(),
            templateId: template.id,
            segment: template.segment,
            frequency: newSchedule.frequency,
            createdAt: new Date().toISOString(),
            nextRunAt: start.toISOString(),
            isActive: true,
            notes: newSchedule.notes?.trim() ? newSchedule.notes.trim() : undefined,
        };
        setSchedules(prev => [...prev, schedule]);
        setScheduleError(null);
        const nextSuggested = computeNextRunDate(start, newSchedule.frequency);
        setNewSchedule(prev => ({
            ...prev,
            startAt: toDateTimeLocal(nextSuggested),
            notes: '',
        }));
    };

    const handleToggleSchedule = (id: string) => {
        setSchedules(prev =>
            prev.map(schedule =>
                schedule.id === id ? { ...schedule, isActive: !schedule.isActive } : schedule
            )
        );
    };

    const handleDeleteSchedule = (id: string) => {
        if (!window.confirm('¿Deseas eliminar esta programación?')) return;
        setSchedules(prev => prev.filter(schedule => schedule.id !== id));
    };

    const advanceSchedule = (schedule: CampaignSchedule, executedAtIso: string) => {
        const executedDate = new Date(executedAtIso);
        let next = computeNextRunDate(executedDate, schedule.frequency);
        const now = Date.now();
        while (next.getTime() <= now) {
            next = computeNextRunDate(next, schedule.frequency);
        }
        return {
            ...schedule,
            lastRunAt: executedAtIso,
            nextRunAt: next.toISOString(),
        };
    };

    const handleMarkScheduleExecuted = (id: string, executedAt?: string) => {
        const executed = executedAt ? new Date(executedAt) : new Date();
        setSchedules(prev =>
            prev.map(schedule =>
                schedule.id === id ? advanceSchedule(schedule, executed.toISOString()) : schedule
            )
        );
    };

    const advanceSchedulesForTemplate = (templateId: string, executedAt: string) => {
        setSchedules(prev =>
            prev.map(schedule =>
                schedule.templateId === templateId && schedule.isActive
                    ? advanceSchedule(schedule, executedAt)
                    : schedule
            )
        );
    };

    const handleGenerateMessage = async () => {
        if (!selectedTemplate) return;
        setIsGenerating(true);
        setCampaignError(null);
        try {
            const message = await generateCampaignMessage({
                segment: selectedTemplate.segment,
                customPrompt: selectedTemplate.prompt,
            });
            setPreviewMessage(message);
        } catch (err) {
            console.error(err);
            setCampaignError('No se pudo generar el mensaje. Intenta nuevamente.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSendCampaign = () => {
        if (!selectedTemplate || previewMessage.trim().length === 0) {
            setCampaignError('Genera un mensaje antes de registrar la campaña.');
            return;
        }
        if (targetStudents.length === 0) {
            setCampaignError('No hay alumnos en el segmento seleccionado.');
            return;
        }

        const executedAt = new Date().toISOString();
        const run: CampaignRun = {
            id: createId(),
            templateId: selectedTemplate.id,
            segment: selectedTemplate.segment,
            executedAt,
            studentIds: targetStudents.map(s => s.id),
        };

        const entries: AIMessagesLogEntry[] = targetStudents.map(student => ({
            id: createId(),
            studentId: student.id,
            templateId: selectedTemplate.id,
            generatedAt: executedAt,
            message: previewMessage,
        }));

        setRuns(prev => [...prev, run]);
        setMessageLog(prev => [...prev, ...entries]);
        setTemplates(prev => prev.map(template => template.id === selectedTemplate.id ? { ...template, lastUsedAt: executedAt } : template));
        setPreviewMessage('');
        setCampaignError(null);
        targetStudents.forEach(student => {
            appendFollowUpTask(student.id, `Seguimiento campaña: ${selectedTemplate.name}`);
        });
        onTasksUpdated?.();
        advanceSchedulesForTemplate(selectedTemplate.id, executedAt);
        alert('Campaña registrada. Recuerda enviar el mensaje por tus canales habituales.');
    };

    const segmentLabel = (segment?: CampaignSegment) => segment ?? 'Segmento';

    const activeSchedules = schedules.filter(schedule => schedule.isActive);

    return (
        <div className="bg-nebula-blue p-6 rounded-lg border border-neon-blue/20 shadow-lg">
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between text-left mb-6"
            >
                <div>
                    <h2 className="text-xl font-bold">Campañas con IA</h2>
                    <p className="text-secondary-gray text-sm">
                        {isOpen
                            ? 'Gestiona plantillas, mensajes y campañas programadas.'
                            : `${templates.length} plantillas · ${runs.length} envíos registrados · ${activeSchedules.length} programadas`}
                    </p>
                </div>
                <span className="text-xs text-secondary-gray flex items-center gap-1">
                    {isOpen ? 'Ocultar' : 'Ver'}
                    <span className="text-base leading-none">{isOpen ? '▾' : '▸'}</span>
                </span>
            </button>

            {isOpen && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div>
                        <h3 className="text-sm font-semibold uppercase text-secondary-gray mb-2">Plantillas</h3>
                        <select
                            value={selectedTemplate?.id ?? ''}
                            onChange={e => setSelectedTemplateId(e.target.value)}
                            className="w-full bg-space-black border border-neon-blue/30 rounded-md px-3 py-2 text-sm text-high-contrast-white"
                        >
                            {templates.map(template => (
                                <option key={template.id} value={template.id}>
                                    {template.name} · {segmentLabel(template.segment)}
                                </option>
                            ))}
                        </select>
                        {selectedTemplate && (
                            <div className="mt-3 text-xs text-secondary-gray space-y-1">
                                <p><span className="text-high-contrast-white">Segmento objetivo:</span> {segmentLabel(selectedTemplate.segment)}</p>
                                {selectedTemplate.prompt && <p><span className="text-high-contrast-white">Instrucciones:</span> {selectedTemplate.prompt}</p>}
                                {selectedTemplate.lastUsedAt && <p>Última ejecución: {new Date(selectedTemplate.lastUsedAt).toLocaleString()}</p>}
                                <p>Alumnos en la lista: <span className="text-neon-blue font-semibold">{targetStudents.length}</span></p>
                            </div>
                        )}
                    </div>

                    <div className="border border-neon-blue/20 rounded-lg p-4 bg-space-black/40">
                        <h4 className="text-sm font-semibold text-high-contrast-white mb-3">Crear nueva plantilla</h4>
                        <div className="space-y-3">
                            <input
                                placeholder="Nombre de la plantilla"
                                value={newTemplate.name}
                                onChange={e => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                                className="w-full bg-space-black border border-neon-blue/20 rounded-md px-3 py-2 text-sm text-high-contrast-white"
                            />
                            <select
                                value={newTemplate.segment}
                                onChange={e => setNewTemplate(prev => ({ ...prev, segment: e.target.value as CampaignSegment }))}
                                className="w-full bg-space-black border border-neon-blue/20 rounded-md px-3 py-2 text-sm text-high-contrast-white"
                            >
                                {SEGMENTS.map(segment => (
                                    <option key={segment} value={segment}>{segment}</option>
                                ))}
                            </select>
                            <textarea
                                placeholder="Instrucciones opcionales para la IA"
                                value={newTemplate.prompt}
                                onChange={e => setNewTemplate(prev => ({ ...prev, prompt: e.target.value }))}
                                rows={3}
                                className="w-full bg-space-black border border-neon-blue/20 rounded-md px-3 py-2 text-sm text-high-contrast-white"
                            />
                            <button
                                onClick={handleCreateTemplate}
                                className="w-full px-3 py-2 rounded-md bg-neon-blue/20 hover:bg-neon-blue/30 text-neon-blue transition-colors text-sm font-semibold"
                            >
                                Guardar plantilla
                            </button>
                            {templateError && <p className="text-xs text-rose-400">{templateError}</p>}
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="border border-neon-blue/20 rounded-lg p-4 bg-space-black/40">
                        <h4 className="text-sm font-semibold text-high-contrast-white mb-3">Generar mensaje</h4>
                        <button
                            onClick={handleGenerateMessage}
                            disabled={isGenerating || !selectedTemplate}
                            className="px-4 py-2 rounded-md bg-neon-blue/20 hover:bg-neon-blue/30 text-neon-blue transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isGenerating ? 'Generando…' : 'Generar con IA'}
                        </button>
                        {previewMessage && (
                            <div className="mt-3 border border-neon-blue/10 rounded-lg p-3 bg-space-black/60">
                                <p className="text-xs text-secondary-gray mb-2 uppercase tracking-wide">Vista previa</p>
                                <p className="text-sm text-high-contrast-white whitespace-pre-line">{previewMessage}</p>
                            </div>
                        )}
                    </div>

                    <div className="border border-emerald-500/20 rounded-lg p-4 bg-emerald-500/5">
                        <h4 className="text-sm font-semibold text-high-contrast-white mb-3">Registrar campaña</h4>
                        <p className="text-xs text-secondary-gray mb-3">Esta acción guarda el mensaje y el listado de alumnos impactados para que puedas continuar el seguimiento.</p>
                        <button
                            onClick={handleSendCampaign}
                            className="px-4 py-2 rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 transition-colors text-sm font-semibold"
                        >
                            Registrar envío ({targetStudents.length} alumnos)
                        </button>
                        {campaignError && <p className="text-xs text-rose-400 mt-2">{campaignError}</p>}
                    </div>

                    <div className="border border-neon-blue/20 rounded-lg p-4 bg-space-black/40">
                        <h4 className="text-sm font-semibold text-high-contrast-white mb-3">Programar campañas</h4>
                        <p className="text-xs text-secondary-gray mb-3">
                            Configura recordatorios recurrentes para tus segmentos clave.
                        </p>
                        <div className="space-y-3">
                            <select
                                value={newSchedule.templateId}
                                onChange={e => setNewSchedule(prev => ({ ...prev, templateId: e.target.value }))}
                                className="w-full bg-space-black border border-neon-blue/20 rounded-md px-3 py-2 text-sm text-high-contrast-white"
                            >
                                {templates.map(template => (
                                    <option key={template.id} value={template.id}>
                                        {template.name} · {segmentLabel(template.segment)}
                                    </option>
                                ))}
                            </select>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 gap-3">
                                <select
                                    value={newSchedule.frequency}
                                    onChange={e => setNewSchedule(prev => ({ ...prev, frequency: e.target.value as CampaignFrequency }))}
                                    className="w-full sm:w-1/2 bg-space-black border border-neon-blue/20 rounded-md px-3 py-2 text-sm text-high-contrast-white"
                                >
                                    {FREQUENCIES.map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                                <input
                                    type="datetime-local"
                                    value={newSchedule.startAt}
                                    onChange={e => setNewSchedule(prev => ({ ...prev, startAt: e.target.value }))}
                                    className="w-full sm:w-1/2 bg-space-black border border-neon-blue/20 rounded-md px-3 py-2 text-sm text-high-contrast-white"
                                />
                            </div>
                            <textarea
                                placeholder="Notas internas (opcional)"
                                value={newSchedule.notes}
                                onChange={e => setNewSchedule(prev => ({ ...prev, notes: e.target.value }))}
                                rows={2}
                                className="w-full bg-space-black border border-neon-blue/20 rounded-md px-3 py-2 text-sm text-high-contrast-white"
                            />
                            <button
                                onClick={handleCreateSchedule}
                                className="w-full px-3 py-2 rounded-md bg-neon-blue/20 hover:bg-neon-blue/30 text-neon-blue transition-colors text-sm font-semibold"
                            >
                                Guardar programación
                            </button>
                            {scheduleError && <p className="text-xs text-rose-400">{scheduleError}</p>}
                        </div>
                    </div>

                    <div className="border border-neon-blue/20 rounded-lg p-4 bg-space-black/40">
                        <h4 className="text-sm font-semibold text-high-contrast-white mb-3">Próximas ejecuciones</h4>
                        {sortedSchedules.length === 0 ? (
                            <p className="text-xs text-secondary-gray">No hay campañas programadas todavía.</p>
                        ) : (
                            <ul className="space-y-2 text-xs text-secondary-gray">
                                {sortedSchedules.map(schedule => {
                                    const template = templates.find(t => t.id === schedule.templateId);
                                    const nextDate = new Date(schedule.nextRunAt);
                                    const isOverdue = schedule.isActive && nextDate.getTime() <= Date.now();
                                    return (
                                        <li
                                            key={schedule.id}
                                            className={`border border-neon-blue/10 rounded-md px-3 py-3 bg-space-black/50 ${!schedule.isActive ? 'opacity-60' : ''}`}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="text-high-contrast-white font-semibold">
                                                        {template?.name ?? 'Plantilla eliminada'} · {segmentLabel(schedule.segment)}
                                                    </p>
                                                    <p>Frecuencia: {FREQUENCIES.find(opt => opt.value === schedule.frequency)?.label ?? schedule.frequency}</p>
                                                    <p className={isOverdue ? 'text-rose-300' : ''}>
                                                        Próxima ejecución: {formatDateTime(schedule.nextRunAt)}
                                                    </p>
                                                    <p>Última ejecución: {formatDateTime(schedule.lastRunAt)}</p>
                                                    {schedule.notes && (
                                                        <p className="italic text-secondary-gray/80 mt-1">“{schedule.notes}”</p>
                                                    )}
                                                </div>
                                                <div className="flex flex-col gap-2 min-w-[140px]">
                                                    <button
                                                        onClick={() => handleMarkScheduleExecuted(schedule.id)}
                                                        className="px-3 py-1 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 transition-colors"
                                                    >
                                                        Marcar enviada
                                                    </button>
                                                    <button
                                                        onClick={() => handleToggleSchedule(schedule.id)}
                                                        className="px-3 py-1 rounded-md bg-neon-blue/15 hover:bg-neon-blue/25 text-neon-blue transition-colors"
                                                    >
                                                        {schedule.isActive ? 'Pausar' : 'Reactivar'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteSchedule(schedule.id)}
                                                        className="px-3 py-1 rounded-md bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 transition-colors"
                                                    >
                                                        Eliminar
                                                    </button>
                                                </div>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>

                    <div className="border border-neon-blue/20 rounded-lg p-4 bg-space-black/40">
                        <h4 className="text-sm font-semibold text-high-contrast-white mb-3">Últimas campañas</h4>
                        {recentRuns.length === 0 ? (
                            <p className="text-xs text-secondary-gray">Aún no registras campañas.</p>
                        ) : (
                            <ul className="space-y-2 text-xs text-secondary-gray">
                                {recentRuns.map(run => {
                                    const template = templates.find(t => t.id === run.templateId);
                                    return (
                                        <li key={run.id} className="border border-neon-blue/10 rounded-md px-3 py-2 bg-space-black/50">
                                            <p className="text-high-contrast-white">{template?.name ?? 'Plantilla desconocida'} · {segmentLabel(run.segment)}</p>
                                            <p>{new Date(run.executedAt).toLocaleString()} · {run.studentIds.length} alumnos impactados</p>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
            )}
        </div>
    );
};

export default CampaignsPanel;
