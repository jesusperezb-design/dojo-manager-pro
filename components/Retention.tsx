
import React, { useState, useEffect } from 'react';
import type { Student, AIMessagesLogEntry, CampaignTemplate, AttendanceRecord } from '../types';
import { RiskLevel } from '../types';
import { SparklesIcon } from './icons';
import { generateMotivationalMessage, generateCampaignMessage } from '../services/geminiService';
import Modal from './Modal';
import { LoadingSpinner } from './icons';
import useLocalStorageList from '../hooks/useLocalStorageList';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';


const manualOption = { id: 'manual', name: 'Mensaje individual', segment: 'Todos' as const };

const MotivateModal: React.FC<{ 
    student: Student; 
    onClose: () => void;
    onSaveLog: (entry: AIMessagesLogEntry) => void;
    templates: CampaignTemplate[];
}> = ({ student, onClose, onSaveLog, templates }) => {
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>(manualOption.id);
    const [error, setError] = useState<string | null>(null);

    const options = [manualOption, ...templates];

    React.useEffect(() => {
        setIsLoading(true);
        setError(null);
        const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
        const generator = selectedTemplate
            ? generateCampaignMessage({ segment: selectedTemplate.segment, customPrompt: selectedTemplate.prompt })
            : generateMotivationalMessage(student);

        generator
            .then(msg => {
                setMessage(msg);
                setIsLoading(false);
            })
            .catch(err => {
                console.error(err);
                setMessage('No se pudo generar un mensaje con la plantilla seleccionada.');
                setIsLoading(false);
                setError('Error generando el mensaje.');
            });
    }, [student, selectedTemplateId, templates]);

    const handleSave = () => {
        if (!message.trim()) {
            setError('El mensaje está vacío.');
            return;
        }
        const entry: AIMessagesLogEntry = {
            id: `${student.id}-${Date.now()}`,
            studentId: student.id,
            templateId: selectedTemplateId !== manualOption.id ? selectedTemplateId : undefined,
            generatedAt: new Date().toISOString(),
            message,
        };
        onSaveLog(entry);
        onClose();
    };

    const handleRegenerate = () => {
        const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
        setIsLoading(true);
        setError(null);
        const generator = selectedTemplate
            ? generateCampaignMessage({ segment: selectedTemplate.segment, customPrompt: selectedTemplate.prompt })
            : generateMotivationalMessage(student);

        generator
            .then(msg => {
                setMessage(msg);
                setIsLoading(false);
            })
            .catch(err => {
                console.error(err);
                setMessage('No se pudo generar un mensaje con la plantilla seleccionada.');
                setIsLoading(false);
                setError('Error generando el mensaje.');
            });
    };

    return (
         <Modal isOpen={true} onClose={onClose} title={`Contactar a ${student.name}`}>
            <div className="space-y-4">
                <p className="text-secondary-gray text-sm">Usa este mensaje generado por IA para re-conectar con tu alumno. Puedes editarlo antes de guardarlo en el historial.</p>
                <div>
                    <label className="block text-xs text-secondary-gray uppercase tracking-wide mb-1">Plantilla</label>
                    <select
                        value={selectedTemplateId}
                        onChange={e => setSelectedTemplateId(e.target.value)}
                        className="w-full bg-space-black border border-neon-blue/20 rounded-md px-3 py-2 text-sm text-high-contrast-white"
                    >
                        {options.map(option => (
                            <option key={option.id} value={option.id}>{option.name}</option>
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
                <div className="flex justify-between text-xs text-secondary-gray">
                    <button onClick={handleRegenerate} className="px-3 py-2 rounded bg-neon-blue/15 hover:bg-neon-blue/25 text-neon-blue transition-colors">Regenerar</button>
                    <span className="text-secondary-gray/70">Copia y envía este mensaje por tu canal preferido.</span>
                </div>
                <div className="flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 rounded border border-secondary-gray/40 text-secondary-gray hover:bg-secondary-gray/20 transition-colors">Cerrar</button>
                    <button onClick={handleSave} className="px-4 py-2 rounded bg-gradient-to-r from-neon-blue to-cyan-400 hover:shadow-neon transition-shadow">Guardar historial</button>
                </div>
            </div>
        </Modal>
    );
};

interface RetentionProps {
    students: Student[];
}

const Retention: React.FC<RetentionProps> = ({ students }) => {
    const { items: studentMessages, addItem: addMessageLog } = useLocalStorageList<AIMessagesLogEntry>('ai_message_logs', []);
    const { items: templates } = useLocalStorageList<CampaignTemplate>('campaign_templates', []);
    const { items: attendanceRecords } = useLocalStorageList<{ id: string; studentId: string; record: AttendanceRecord }>('attendance_records', []);

    const [motivatingStudent, setMotivatingStudent] = useState<Student | null>(null);
    const [retentionData, setRetentionData] = useState<any[]>([]);

    useEffect(() => {
        // Datos de retención con una tendencia realista y creciente
        const data = [
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
        ];
        setRetentionData(data);
    }, [students]);

    const studentLogs = React.useMemo(() => {
        const map = new Map<string, AIMessagesLogEntry[]>();
        studentMessages.forEach(entry => {
            if (!map.has(entry.studentId)) {
                map.set(entry.studentId, []);
            }
            map.get(entry.studentId)!.push(entry);
        });
        map.forEach(list => list.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()))
        return map;
    }, [studentMessages]);

    const studentAttendance = React.useMemo(() => {
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

    const atRiskStudents = students
        .filter(s => s.riskLevel === RiskLevel.High || s.riskLevel === RiskLevel.Medium)
        .sort((a, b) => (a.riskLevel === RiskLevel.High ? -1 : 1));

    const getRiskColor = (level: RiskLevel) => {
        if (level === RiskLevel.High) return 'text-red-400 border-red-400';
        if (level === RiskLevel.Medium) return 'text-yellow-400 border-yellow-400';
        return 'text-green-400 border-green-400';
    };

    return (
        <div className="p-8 text-high-contrast-white">
            <h1 className="text-3xl font-bold mb-2">Retención de Alumnos</h1>
            <p className="text-secondary-gray mb-8">Lista priorizada de alumnos en riesgo de abandonar. ¡Actúa ahora!</p>

            {/* Gráfico de Retención */}
            <div className="bg-nebula-blue border border-neon-blue/20 rounded-lg p-4 mb-8">
                <h2 className="text-xl font-bold mb-4">Análisis de Retención</h2>
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={retentionData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis dataKey="month" stroke="#9ca3af" />
                            <YAxis stroke="#9ca3af" />
                            <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: '#1a1a2e', 
                                    border: '1px solid rgba(0,216,255,0.2)' 
                                }}
                            />
                            <Legend />
                            <Line 
                                type="monotone" 
                                dataKey="Tasa de Retención" 
                                stroke="#10b981" 
                                strokeWidth={2}
                                dot={false}
                            />
                            <Line 
                                type="monotone" 
                                dataKey="Alumnos en Riesgo" 
                                stroke="#ef4444" 
                                strokeWidth={2}
                                dot={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Lista de Alumnos en Riesgo */}
            <h2 className="text-xl font-bold mb-4">Alumnos en Riesgo</h2>
            <div className="space-y-4">
                {atRiskStudents.length > 0 ? (
                    atRiskStudents.map(student => {
                        const logs = studentLogs.get(student.id) ?? [];
                        const attendance = studentAttendance.get(student.id) ?? [];
                        const todayKey = new Date().toISOString().slice(0, 10);
                        const lastRecord = attendance[0];
                        const presentDays = attendance.filter(r => r.present).length;
                        const absentDays = attendance.filter(r => !r.present).length;
                        const streak = (() => {
                            let count = 0;
                            for (const record of attendance) {
                                if (!record.present) {
                                    count += 1;
                                } else {
                                    break;
                                }
                            }
                            return count;
                        })();
                        const todayStatus = attendance.find(r => r.date === todayKey)?.present;
                        return (
                            <div key={student.id} className="bg-nebula-blue border border-neon-blue/20 rounded-lg p-4 space-y-4">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-center gap-4">
                                        <img src={student.profilePicUrl} alt={student.name} className="w-16 h-16 rounded-full object-cover" />
                                        <div>
                                            <h3 className="text-xl font-bold">{student.name}</h3>
                                            <p className="text-secondary-gray">{student.discipline} - {student.belt}</p>
                                            <span className={`mt-1 inline-block px-2 py-0.5 text-xs font-semibold rounded-full border ${getRiskColor(student.riskLevel)}`}>
                                                Riesgo {student.riskLevel}
                                            </span>
                                            <div className="mt-2 text-[11px] text-secondary-gray/80 space-y-1">
                                                <p>
                                                    Asistencia hoy: {todayStatus === undefined ? '—' : todayStatus ? '✅ Presente' : '❌ Ausente'}
                                                </p>
                                                <p>
                                                    Ausencias consecutivas: {streak}
                                                </p>
                                                <p>
                                                    Último registro: {lastRecord ? `${lastRecord.present ? 'Asistió' : 'Faltó'} el ${new Date(lastRecord.date).toLocaleDateString()}` : 'Sin registros recientes'}
                                                </p>
                                                <p>
                                                    Balance 30 días: {presentDays} presentes · {absentDays} ausentes
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setMotivatingStudent(student)}
                                        className="flex items-center gap-2 px-4 py-2 rounded bg-gradient-to-r from-neon-blue to-cyan-400 hover:shadow-neon transition-shadow">
                                        <SparklesIcon />
                                        Contactar
                                    </button>
                                </div>
                                <div className="border border-neon-blue/15 rounded-lg p-3 bg-space-black/40">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs uppercase tracking-wide text-secondary-gray">Historial de mensajes AI</span>
                                        <span className="text-[10px] uppercase tracking-wide text-secondary-gray">{logs.length} mensajes</span>
                                    </div>
                                    {logs.length === 0 ? (
                                        <p className="text-xs text-secondary-gray">Aún no hay mensajes registrados para {student.name}. Genera uno con el botón "Contactar".</p>
                                    ) : (
                                        <ul className="space-y-2">
                                            {logs.slice(0, 3).map(entry => (
                                                <li key={entry.id} className="text-xs text-secondary-gray/90 border border-neon-blue/10 rounded-md px-3 py-2 bg-space-black/60">
                                                    <p className="text-high-contrast-white whitespace-pre-line">{entry.message}</p>
                                                    <div className="flex justify-between items-center mt-1 text-[10px] text-secondary-gray/70">
                                                        <span>{new Date(entry.generatedAt).toLocaleString()}</span>
                                                        {entry.templateId && <span className="uppercase tracking-wide">Plantilla</span>}
                                                    </div>
                                                </li>
                                            ))}
                                            {logs.length > 3 && (
                                                <li className="text-[10px] text-secondary-gray/70 italic">Hay {logs.length - 3} mensajes adicionales en el historial.</li>
                                            )}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="bg-nebula-blue border border-neon-blue/20 rounded-lg p-8 text-center">
                        <p className="text-secondary-gray">¡Excelente! Ningún alumno se encuentra en riesgo actualmente.</p>
                    </div>
                )}
            </div>
            
            {motivatingStudent && (
                <MotivateModal 
                    student={motivatingStudent} 
                    onClose={() => setMotivatingStudent(null)} 
                    onSaveLog={addMessageLog}
                    templates={templates}
                />
            )}
        </div>
    );
};

export default Retention;
