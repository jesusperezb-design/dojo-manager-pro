
import React from 'react';
import type { MartialArtClass } from '../types';
import { ClassLevel } from '../types';
import { DAYS_OF_WEEK, CLASS_LEVEL_COLORS, INSTRUCTORS } from '../constants';
import { PencilIcon, TrashIcon } from './icons';
import Modal from './Modal';

interface ScheduleProps {
    classes: MartialArtClass[];
    setClasses: (classes: MartialArtClass[]) => void;
}

const Schedule: React.FC<ScheduleProps> = ({ classes, setClasses }) => {
    const today = new Date();
    const now = new Date();
    const todayIndex = (today.getDay() + 6) % 7; // 0 for Monday, 6 for Sunday
    const todayDate = today.getDate();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const getDateForDay = (dayIndex: number) => {
        const date = new Date();
        date.setDate(todayDate - (todayIndex - dayIndex));
        return date;
    };

    const formatTime = (date: Date) => {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    };

    const getDefaultStartTime = () => {
        const reference = new Date();
        const rounded = new Date(reference);
        rounded.setMinutes(Math.ceil(rounded.getMinutes() / 15) * 15, 0, 0);
        if (rounded.getTime() <= reference.getTime()) {
            rounded.setMinutes(rounded.getMinutes() + 15);
        }
        return formatTime(rounded);
    };

    const defaultDay = DAYS_OF_WEEK[todayIndex] as MartialArtClass['day'];

    const defaultInstructor = INSTRUCTORS[0] ?? 'Profesor asignado';

    const [modalMode, setModalMode] = React.useState<'create' | 'edit' | null>(null);
    const [formClass, setFormClass] = React.useState<Partial<MartialArtClass>>({
        name: '',
        day: defaultDay,
        time: getDefaultStartTime(),
        level: ClassLevel.Beginners,
        instructor: defaultInstructor,
    });
    const isModalOpen = modalMode !== null;

    const resetForm = () => {
        setFormClass({
            name: '',
            day: defaultDay,
            time: getDefaultStartTime(),
            level: ClassLevel.Beginners,
            instructor: defaultInstructor,
        });
    };

    const openCreateModal = () => {
        resetForm();
        setModalMode('create');
    };

    const openEditModal = (cls: MartialArtClass) => {
        setFormClass({ ...cls, instructor: cls.instructor || defaultInstructor });
        setModalMode('edit');
    };

    const closeModal = () => {
        setModalMode(null);
        resetForm();
    };

    const handleSaveClass = () => {
        if (!formClass.name || !formClass.time || !formClass.day || !formClass.level) {
            return;
        }

        const currentNow = new Date();
        const dayValue = formClass.day as MartialArtClass['day'];
        const dayIndex = DAYS_OF_WEEK.indexOf(dayValue);
        if (dayIndex === -1) {
            alert('Selecciona un día válido.');
            return;
        }

        const classDateTime = getClassDateTime(getDateForDay(dayIndex), formClass.time as string);
        if (classDateTime.getTime() <= currentNow.getTime()) {
            alert('No puedes programar una clase en una fecha u hora pasada.');
            return;
        }

        const classObj: MartialArtClass = {
            id: modalMode === 'edit' && formClass.id ? formClass.id : `c${Date.now()}`,
            name: formClass.name as string,
            day: dayValue,
            time: formClass.time as string,
            level: formClass.level as ClassLevel,
            instructor: (formClass.instructor as string) || defaultInstructor,
        };

        if (modalMode === 'edit' && formClass.id) {
            const updated = classes.map(c => c.id === formClass.id ? classObj : c);
            setClasses(updated);
        } else {
            setClasses([...classes, classObj]);
        }

        closeModal();
    };

    const handleDeleteClass = (cls: MartialArtClass) => {
        const confirmed = window.confirm(`¿Eliminar la clase "${cls.name}"?`);
        if (!confirmed) return;
        setClasses(classes.filter(c => c.id !== cls.id));
    };

    const getClassDateTime = (baseDate: Date, time: string) => {
        const [hours, minutes] = time.split(':').map(Number);
        const dateTime = new Date(baseDate);
        dateTime.setHours(hours ?? 0, minutes ?? 0, 0, 0);
        return dateTime;
    };

    return (
        <div className="p-8 text-high-contrast-white">
            <h1 className="text-3xl font-bold mb-8">Horario de Clases</h1>

            <div className="mb-6 flex justify-end">
                <button onClick={openCreateModal} className="px-4 py-2 rounded bg-gradient-to-r from-neon-blue to-cyan-400 hover:shadow-neon transition-shadow">Agregar Horario</button>
            </div>

            {isModalOpen && (
                <Modal isOpen={isModalOpen} onClose={closeModal} title={modalMode === 'edit' ? 'Editar Horario' : 'Nuevo Horario'}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-secondary-gray">Nombre de la Clase</label>
                            <input value={formClass.name ?? ''} onChange={e => setFormClass({...formClass, name: e.target.value})} className="mt-1 block w-full rounded-md bg-space-black border border-neon-blue/20 text-high-contrast-white p-2" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-secondary-gray">Día</label>
                            <select value={formClass.day ?? defaultDay} onChange={e => setFormClass({...formClass, day: e.target.value as MartialArtClass['day']})} className="mt-1 block w-full rounded-md bg-space-black border border-neon-blue/20 text-high-contrast-white p-2">
                                {DAYS_OF_WEEK.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-secondary-gray">Hora</label>
                            <input type="time" value={formClass.time ?? getDefaultStartTime()} onChange={e => setFormClass({...formClass, time: e.target.value})} className="mt-1 block w-full rounded-md bg-space-black border border-neon-blue/20 text-high-contrast-white p-2" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-secondary-gray">Nivel</label>
                            <select value={formClass.level ?? ClassLevel.Beginners} onChange={e => setFormClass({...formClass, level: e.target.value as ClassLevel})} className="mt-1 block w-full rounded-md bg-space-black border border-neon-blue/20 text-high-contrast-white p-2">
                                {Object.values(ClassLevel).map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-secondary-gray">Profesor</label>
                            <select
                                value={formClass.instructor ?? defaultInstructor}
                                onChange={e => setFormClass({...formClass, instructor: e.target.value})}
                                className="mt-1 block w-full rounded-md bg-space-black border border-neon-blue/20 text-high-contrast-white p-2"
                            >
                                {INSTRUCTORS.map(instructor => (
                                    <option key={instructor} value={instructor}>{instructor}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex justify-end gap-4">
                            <button onClick={closeModal} className="px-4 py-2 rounded border border-neon-blue/20">Cancelar</button>
                            <button onClick={handleSaveClass} className="px-4 py-2 rounded bg-gradient-to-r from-neon-blue to-cyan-400">
                                {modalMode === 'edit' ? 'Guardar Cambios' : 'Crear'}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {DAYS_OF_WEEK.map((day, index) => {
                    const dayDate = getDateForDay(index);
                    const isPastDay = dayDate < startOfToday;

                    return (
                        <div key={day} className={`bg-nebula-blue border border-neon-blue/20 rounded-lg p-4 ${isPastDay ? 'opacity-50' : ''}`}>
                            <h2 className="text-xl font-bold mb-4 text-center">
                                {day} <span className="text-secondary-gray text-sm">{dayDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit'})}</span>
                            </h2>
                            <div className="space-y-3">
                                {classes.filter(c => c.day === day).sort((a,b) => a.time.localeCompare(b.time)).map(c => (
                                    <div key={c.id} className="bg-space-black p-3 rounded-lg flex items-center gap-3">
                                        <div className={`w-2 h-16 rounded-full ${CLASS_LEVEL_COLORS[c.level]}`}></div>
                                        <div className="flex-grow">
                                            <p className="font-bold">{c.name}</p>
                                            <p className="text-secondary-gray text-sm">{c.level}</p>
                                            <p className="text-secondary-gray text-xs italic">{c.instructor || defaultInstructor}</p>
                                            <p className="text-neon-blue font-semibold">{c.time}</p>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            {(() => {
                                                const classDateTime = getClassDateTime(dayDate, c.time);
                                                const isClassInPast = classDateTime.getTime() <= now.getTime();
                                                return (
                                                    <>
                                                        <button
                                                            onClick={() => openEditModal(c)}
                                                            disabled={isClassInPast}
                                                            className="p-1.5 bg-yellow-500/20 hover:bg-yellow-500/50 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
                                                            title={isClassInPast ? 'Clase finalizada, no editable' : 'Editar clase'}
                                                        >
                                                            <PencilIcon />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteClass(c)}
                                                            disabled={isClassInPast}
                                                            className="p-1.5 bg-red-500/20 hover:bg-red-500/50 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
                                                            title={isClassInPast ? 'Clase finalizada, no eliminable' : 'Eliminar clase'}
                                                        >
                                                            <TrashIcon />
                                                        </button>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Schedule;
