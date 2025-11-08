
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, type TooltipProps } from 'recharts';
import type { DojoProfile, Student } from '../types';
import { Belt } from '../types';

interface ProfileProps {
    profile: DojoProfile;
    students: Student[];
}

const Profile: React.FC<ProfileProps> = ({ profile, students }) => {
    
    const beltData = Object.values(Belt).map(belt => ({
        name: belt,
        value: students.filter(s => s.belt === belt).length
    })).filter(d => d.value > 0);

    const disciplineData = [...new Set(students.map(s => s.discipline))].map(discipline => ({
        name: discipline,
        value: students.filter(s => s.discipline === discipline).length
    })).filter(d => d.value > 0);
    
    const BELT_COLORS = ['#00F0FF', '#38BDF8', '#6366F1', '#8B5CF6', '#EC4899', '#F97316', '#34D399', '#2DD4BF'];
    const DISCIPLINE_COLORS = ['#22D3EE', '#2DD4BF', '#34D399', '#A3E635', '#FACC15', '#FB7185', '#A855F7', '#6366F1'];

    const PieTooltip: React.FC<TooltipProps<number, string>> = ({ active, payload }) => {
        if (!active || !payload || payload.length === 0) {
            return null;
        }

        const { name, value, percent } = payload[0];
        if (typeof value !== 'number') {
            return null;
        }

        const percentage = percent !== undefined ? `${Math.round(percent * 100)}%` : '';
        const label = value === 1 ? 'alumno' : 'alumnos';

        return (
            <div className="rounded-lg border border-neon-blue/40 bg-space-black/90 px-3 py-2 shadow-neon">
                <p className="text-sm font-semibold text-high-contrast-white">{name}</p>
                <p className="text-xs text-secondary-gray">{value} {label}{percentage ? ` (${percentage})` : ''}</p>
            </div>
        );
    };

    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }: any) => {
        const RADIAN = Math.PI / 180;
        const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        return (
            <text x={x} y={y} fill="#F8FAFC" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12}>
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    return (
        <div className="p-8 text-high-contrast-white">
            <h1 className="text-3xl font-bold mb-8">Perfil del Dojo</h1>

            <div 
                style={{backgroundImage: "url('https://picsum.photos/seed/techbg/1200/400')"}}
                className="relative bg-cover bg-center rounded-lg p-8 border border-neon-blue/20 mb-8"
            >
                <div className="absolute inset-0 bg-space-black/70 backdrop-blur-sm rounded-lg"></div>
                <div className="relative flex flex-col md:flex-row items-center gap-8">
                    <img src={profile.logoUrl} alt="Dojo Logo" className="w-32 h-32 rounded-full border-4 border-neon-blue shadow-neon"/>
                    <div>
                        <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-cyan-400">{profile.name}</h2>
                        <p className="text-secondary-gray mt-2">{profile.address}</p>
                        <div className="flex gap-6 mt-2">
                           <p><span className="font-semibold">Email:</span> {profile.contactEmail}</p>
                           <p><span className="font-semibold">Teléfono:</span> {profile.contactPhone}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-nebula-blue p-6 rounded-lg border border-neon-blue/20">
                    <h3 className="text-xl font-bold mb-4">Distribución por Cinturón</h3>
                    <div style={{ width: '100%', height: 250 }}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie data={beltData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} fill="#38BDF8" stroke="#0F172A" strokeWidth={2} label={renderCustomizedLabel} labelLine={false}>
                                    {beltData.map((entry, index) => <Cell key={`cell-${index}`} fill={BELT_COLORS[index % BELT_COLORS.length]} />)}
                                </Pie>
                                <Tooltip content={<PieTooltip />} />
                                <Legend verticalAlign="bottom" wrapperStyle={{ color: '#F8FAFC', fontSize: 12 }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="bg-nebula-blue p-6 rounded-lg border border-neon-blue/20">
                     <h3 className="text-xl font-bold mb-4">Distribución por Disciplina</h3>
                     <div style={{ width: '100%', height: 250 }}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie data={disciplineData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} fill="#34D399" stroke="#0F172A" strokeWidth={2} paddingAngle={3} label={renderCustomizedLabel} labelLine={false}>
                                     {disciplineData.map((entry, index) => <Cell key={`cell-${index}`} fill={DISCIPLINE_COLORS[index % DISCIPLINE_COLORS.length]} />)}
                                </Pie>
                                <Tooltip content={<PieTooltip />} />
                                <Legend verticalAlign="bottom" wrapperStyle={{ color: '#F8FAFC', fontSize: 12 }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
