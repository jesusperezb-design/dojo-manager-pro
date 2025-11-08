
export enum Belt {
  White = "Blanco",
  Yellow = "Amarillo",
  Orange = "Naranja",
  Green = "Verde",
  Blue = "Azul",
  Purple = "Morado",
  Brown = "Marrón",
  Black = "Negro",
}

export enum PaymentStatus {
  Paid = "Pagado",
  Pending = "Pendiente",
  Overdue = "Vencido",
}

export enum RiskLevel {
    Low = "Bajo",
    Medium = "Medio",
    High = "Alto",
}

export interface Student {
    id: string;
    name: string;
    discipline: string;
    belt: Belt;
  paymentStatus: PaymentStatus;
  riskLevel: RiskLevel;
  profilePicUrl: string;
    joinDate: string; // ISO string
}

export type CampaignSegment = 'Todos' | 'Riesgo Alto' | 'Pagos Pendientes' | 'Nuevos Ingresos' | 'Avanzados';

export interface CampaignTemplate {
    id: string;
    name: string;
    segment: CampaignSegment;
    prompt: string;
    createdAt: string;
    lastUsedAt?: string;
}

export interface CampaignRun {
    id: string;
    templateId: string;
    segment: CampaignSegment;
    executedAt: string;
    studentIds: string[];
}

export type CampaignFrequency = 'weekly' | 'biweekly' | 'monthly';

export interface CampaignSchedule {
    id: string;
    templateId: string;
    segment: CampaignSegment;
    frequency: CampaignFrequency;
    createdAt: string;
    nextRunAt: string;
    lastRunAt?: string;
    isActive: boolean;
    notes?: string;
}

export type StudentCohortKey = 'discipline' | 'belt' | 'risk';

export interface StudentsFilterPreset {
    cohort?: { type: StudentCohortKey; value: string };
    focus?: 'chronic' | 'flagged';
    taskStudentId?: string;
}

export interface AIMessagesLogEntry {
    id: string;
    studentId: string;
    templateId?: string;
    generatedAt: string;
    message: string;
}

export interface AttendanceRecord {
    date: string; // YYYY-MM-DD
    present: boolean;
    notedAt: string;
    note?: string;
}

export interface FeedbackRecord {
    id: string;
    studentId: string;
    rating: number; // 1-5
    comment?: string;
    submittedAt: string;
    className?: string;
    instructor?: string;
}

export enum ClassLevel {
  Beginners = "Principiantes",
  Intermediate = "Intermedios",
  Advanced = "Avanzados",
  AllLevels = "Todos",
}

export interface MartialArtClass {
    id: string;
    name: string;
    day: "Lunes" | "Martes" | "Miércoles" | "Jueves" | "Viernes" | "Sábado" | "Domingo";
    time: string; // "HH:MM"
    level: ClassLevel;
    instructor: string;
}

export enum TransactionType {
    Income = "Ingreso",
    Expense = "Gasto",
}

export interface Transaction {
    id: string;
    date: string; // ISO String
    description: string;
    amount: number;
    type: TransactionType;
}

export interface CommunityPost {
    id: string;
    imageUrl: string;
    caption: string;
    author: string;
    date: string; // ISO String
}

export interface DojoProfile {
    name: string;
    logoUrl: string;
    contactEmail: string;
    contactPhone: string;
    address: string;
}

export type View = 'dashboard' | 'students' | 'schedule' | 'finances' | 'retention' | 'community' | 'profile';
