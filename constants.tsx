
import React from 'react';
// FIX: Import MartialArtClass to explicitly type INITIAL_CLASSES
import { Belt, PaymentStatus, ClassLevel, RiskLevel, TransactionType, View, MartialArtClass, AttendanceRecord, FeedbackRecord } from './types';

export const assetPath = (relativePath: string) => new URL(relativePath, import.meta.env.BASE_URL).pathname;
import { ChartBarIcon, UsersIcon, CalendarIcon, CurrencyDollarIcon, ShieldCheckIcon, PhotographIcon, UserCircleIcon, LogoutIcon } from './components/icons';

const createAttendanceRecord = (studentId: string, daysAgo: number, present: boolean, hour: number = 18): { id: string; studentId: string; record: AttendanceRecord } => {
    const base = new Date();
    base.setUTCHours(12, 0, 0, 0);
    base.setUTCDate(base.getUTCDate() - daysAgo);
    const dateStr = base.toISOString().slice(0, 10);
    const noted = new Date(base.getTime());
    noted.setUTCHours(hour, 30, 0, 0);
    return {
        id: `att-${studentId}-${dateStr}`,
        studentId,
        record: {
            date: dateStr,
            present,
            notedAt: noted.toISOString(),
        },
    };
};

const ATTENDANCE_PATTERNS: Record<string, { baseOffset: number; pattern: boolean[]; hour: number }> = {
    '1': { baseOffset: 2, pattern: [true, true, true, true], hour: 17 },
    '2': { baseOffset: 3, pattern: [true, false, true, true], hour: 18 },
    '3': { baseOffset: 4, pattern: [false, true, false, true], hour: 19 },
    '4': { baseOffset: 5, pattern: [true, true, false, false], hour: 20 },
    '5': { baseOffset: 6, pattern: [true, true, true, false], hour: 17 },
};

export const INSTRUCTORS = [
    'Sensei Hiro Tanaka',
    'Maestra Li Zhang',
    'Coach Miguel Reyes',
    'Sensei Ana Morales',
    'Instructor Carlos Vega',
    'Sensei Kaori Nakamura',
];

export const INITIAL_STUDENTS = [
    { id: '1', name: 'Ryu Hoshi', discipline: 'Karate', belt: Belt.Black, paymentStatus: PaymentStatus.Paid, riskLevel: RiskLevel.Low, profilePicUrl: assetPath('images/students/Ryu-Hoshi.png'), joinDate: '2022-01-15T00:00:00.000Z' },
    { id: '2', name: 'Chun-Li', discipline: 'Kung Fu', belt: Belt.Black, paymentStatus: PaymentStatus.Paid, riskLevel: RiskLevel.Low, profilePicUrl: assetPath('images/students/Chun-Li.png'), joinDate: '2022-03-20T00:00:00.000Z' },
    { id: '3', name: 'Ken Masters', discipline: 'Karate', belt: Belt.Brown, paymentStatus: PaymentStatus.Pending, riskLevel: RiskLevel.Medium, profilePicUrl: assetPath('images/students/Ken-Masters.png'), joinDate: '2023-05-10T00:00:00.000Z' },
    { id: '4', name: 'Fei Long', discipline: 'Jeet Kune Do', belt: Belt.Green, paymentStatus: PaymentStatus.Overdue, riskLevel: RiskLevel.High, profilePicUrl: assetPath('images/students/Fei-Long.png'), joinDate: '2023-08-01T00:00:00.000Z' },
    { id: '5', name: 'Sakura Kasugano', discipline: 'Karate', belt: Belt.Blue, paymentStatus: PaymentStatus.Paid, riskLevel: RiskLevel.Low, profilePicUrl: assetPath('images/students/Sakura-Kasugano.png'), joinDate: '2023-11-22T00:00:00.000Z' },
];

// FIX: Explicitly type INITIAL_CLASSES as MartialArtClass[] to ensure the 'day' property matches the required union type.
export const INITIAL_CLASSES: MartialArtClass[] = [
    { id: 'c1', name: 'Karate Kids', day: 'Lunes', time: '17:00', level: ClassLevel.Beginners, instructor: INSTRUCTORS[0] },
    { id: 'c2', name: 'Kung Fu Adultos', day: 'Lunes', time: '19:00', level: ClassLevel.Intermediate, instructor: INSTRUCTORS[1] },
    { id: 'c3', name: 'Sparring Avanzado', day: 'Martes', time: '20:00', level: ClassLevel.Advanced, instructor: INSTRUCTORS[2] },
    { id: 'c4', name: 'Yoga Marcial', day: 'Miércoles', time: '18:00', level: ClassLevel.AllLevels, instructor: INSTRUCTORS[3] },
    { id: 'c5', name: 'Defensa Personal', day: 'Jueves', time: '19:00', level: ClassLevel.AllLevels, instructor: INSTRUCTORS[4] },
    { id: 'c6', name: 'Karate Avanzado', day: 'Viernes', time: '19:00', level: ClassLevel.Advanced, instructor: INSTRUCTORS[5] },
];

export const INITIAL_ATTENDANCE_RECORDS: { id: string; studentId: string; record: AttendanceRecord }[] = [
    ...Object.entries(ATTENDANCE_PATTERNS).flatMap(([studentId, config]) =>
        config.pattern.map((present, weekIndex) =>
            createAttendanceRecord(studentId, config.baseOffset + weekIndex * 7, present, config.hour)
        )
    ),
];

export const INITIAL_FEEDBACK_RECORDS: FeedbackRecord[] = [
    { id: 'fb-1', studentId: '1', rating: 5, comment: 'Excelente energía y progreso!', submittedAt: '2024-10-12T18:45:00.000Z', className: 'Karate Kids', instructor: INSTRUCTORS[0] },
    { id: 'fb-2', studentId: '2', rating: 4, comment: 'Me gustó la sesión, quiero enfocarme en patadas.', submittedAt: '2024-10-10T19:30:00.000Z', className: 'Kung Fu Adultos', instructor: INSTRUCTORS[1] },
    { id: 'fb-3', studentId: '3', rating: 3, comment: 'Necesito reforzar la técnica, me sentí un poco perdido.', submittedAt: '2024-10-09T20:45:00.000Z', className: 'Sparring Avanzado', instructor: INSTRUCTORS[2] },
    { id: 'fb-4', studentId: '4', rating: 4, comment: 'Yoga Marcial me ayudó bastante con la movilidad.', submittedAt: '2024-10-11T21:20:00.000Z', className: 'Yoga Marcial', instructor: INSTRUCTORS[3] },
    { id: 'fb-5', studentId: '5', rating: 5, comment: 'Clases muy motivadoras, gracias!', submittedAt: '2024-10-13T18:40:00.000Z', className: 'Defensa Personal', instructor: INSTRUCTORS[4] },
];

export const INITIAL_TRANSACTIONS = [
    { id: 't1', date: new Date(new Date().setDate(1)).toISOString(), description: 'Cuota Mensual - Ryu Hoshi', amount: 50, type: TransactionType.Income },
    { id: 't2', date: new Date(new Date().setDate(2)).toISOString(), description: 'Cuota Mensual - Chun-Li', amount: 50, type: TransactionType.Income },
    { id: 't3', date: new Date(new Date().setDate(5)).toISOString(), description: 'Alquiler de local', amount: 800, type: TransactionType.Expense },
    { id: 't4', date: new Date(new Date().setDate(10)).toISOString(), description: 'Compra de equipamiento', amount: 250, type: TransactionType.Expense },
    { id: 't5', date: new Date(new Date().setDate(15)).toISOString(), description: 'Pago de servicios', amount: 120, type: TransactionType.Expense },
];

export const INITIAL_POSTS = [
    { id: 'p1', imageUrl: 'https://picsum.photos/seed/tourney/500/500', caption: '¡Gran día de torneo! Felicitaciones a todos los competidores.', author: 'Sensei', date: new Date().toISOString() },
    { id: 'p2', imageUrl: 'https://picsum.photos/seed/seminar/500/500', caption: 'Seminario de fin de semana con el Gran Maestro.', author: 'Sensei', date: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString() },
    { id: 'p3', imageUrl: 'https://picsum.photos/seed/belts/500/500', caption: 'Nuevos cinturones negros. ¡El camino recién empieza!', author: 'Sensei', date: new Date(new Date().setDate(new Date().getDate() - 5)).toISOString() },
];

export const INITIAL_PROFILE = {
    name: "Academia Marcial SPARTA",
    logoUrl: assetPath('images/dojo/dojo-profile.png'),
    contactEmail: "contacto@academiaartesmarciales.edu",
    contactPhone: "+1 (555) 123-4567",
    address: "123 Camino del Guerrero, Ciudad Marcial",
};

// FIX: Change JSX.Element to React.ReactElement to resolve the "Cannot find namespace 'JSX'" error.
export const NAV_ITEMS: { id: View; label: string; icon: React.ReactElement }[] = [
    { id: 'dashboard', label: 'Panel de Control', icon: <ChartBarIcon /> },
    { id: 'students', label: 'Alumnos', icon: <UsersIcon /> },
    { id: 'schedule', label: 'Horarios', icon: <CalendarIcon /> },
    { id: 'finances', label: 'Finanzas', icon: <CurrencyDollarIcon /> },
    { id: 'retention', label: 'Retención', icon: <ShieldCheckIcon /> },
    { id: 'community', label: 'Comunidad', icon: <PhotographIcon /> },
    { id: 'profile', label: 'Perfil del Dojo', icon: <UserCircleIcon /> },
];

export const CLASS_LEVEL_COLORS: { [key in ClassLevel]: string } = {
    [ClassLevel.Beginners]: 'bg-green-500',
    [ClassLevel.Intermediate]: 'bg-blue-500',
    [ClassLevel.Advanced]: 'bg-red-500',
    [ClassLevel.AllLevels]: 'bg-yellow-500',
};

export const DAYS_OF_WEEK = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
