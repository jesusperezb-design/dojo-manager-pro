
import React from 'react';
import type { Transaction } from '../types';
import { TransactionType } from '../types';
import Modal from './Modal';

interface FinancesProps {
    transactions: Transaction[];
}

const StatCard: React.FC<{ title: string; value: string; color: string }> = ({ title, value, color }) => (
    <div className="bg-nebula-blue p-6 rounded-lg border border-neon-blue/20">
        <h3 className="text-secondary-gray text-sm font-medium uppercase">{title}</h3>
        <p className={`text-4xl font-bold ${color}`}>{value}</p>
    </div>
);

interface FinancesState {
    transactions: Transaction[];
}

const Finances: React.FC<FinancesProps> = ({ transactions: initialTransactions }) => {
    const [transactions, setTransactions] = React.useState(initialTransactions);
    const [showNewTransactionModal, setShowNewTransactionModal] = React.useState(false);
    const [newTransaction, setNewTransaction] = React.useState({
        description: '',
        amount: '',
        type: TransactionType.Income,
        date: new Date().toISOString().split('T')[0]
    });

    const currentMonthTransactions = transactions.filter(t => new Date(t.date).getMonth() === new Date().getMonth());

    const handleAddTransaction = () => {
        const transaction = {
            id: `t${Date.now()}`,
            description: newTransaction.description,
            amount: parseFloat(newTransaction.amount),
            type: newTransaction.type,
            date: new Date(newTransaction.date).toISOString()
        };
        setTransactions([...transactions, transaction]);
        setShowNewTransactionModal(false);
        setNewTransaction({
            description: '',
            amount: '',
            type: TransactionType.Income,
            date: new Date().toISOString().split('T')[0]
        });
    };

    const handleDeleteTransaction = (id: string) => {
        setTransactions(transactions.filter(t => t.id !== id));
    };

    const totalIncome = currentMonthTransactions
        .filter(t => t.type === TransactionType.Income)
        .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = currentMonthTransactions
        .filter(t => t.type === TransactionType.Expense)
        .reduce((sum, t) => sum + t.amount, 0);
        
    const netProfit = totalIncome - totalExpenses;

    return (
        <div className="p-8 text-high-contrast-white">
            <h1 className="text-3xl font-bold mb-8">Finanzas</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <StatCard title="Ingresos (Mes Actual)" value={`$${totalIncome.toFixed(2)}`} color="text-green-400" />
                <StatCard title="Gastos (Mes Actual)" value={`$${totalExpenses.toFixed(2)}`} color="text-red-400" />
                <StatCard title="Beneficio Neto" value={`$${netProfit.toFixed(2)}`} color={netProfit >= 0 ? 'text-cyan-400' : 'text-red-400'} />
            </div>

            {showNewTransactionModal && (
                <Modal isOpen={showNewTransactionModal} onClose={() => setShowNewTransactionModal(false)} title="Nueva Transacción">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-secondary-gray">Descripción</label>
                            <input
                                type="text"
                                value={newTransaction.description}
                                onChange={e => setNewTransaction({...newTransaction, description: e.target.value})}
                                className="mt-1 block w-full rounded-md bg-space-black border border-neon-blue/20 text-high-contrast-white p-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-secondary-gray">Monto</label>
                            <input
                                type="number"
                                value={newTransaction.amount}
                                onChange={e => setNewTransaction({...newTransaction, amount: e.target.value})}
                                className="mt-1 block w-full rounded-md bg-space-black border border-neon-blue/20 text-high-contrast-white p-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-secondary-gray">Tipo</label>
                            <select
                                value={newTransaction.type}
                                onChange={e => setNewTransaction({...newTransaction, type: e.target.value as TransactionType})}
                                className="mt-1 block w-full rounded-md bg-space-black border border-neon-blue/20 text-high-contrast-white p-2"
                            >
                                <option value={TransactionType.Income}>Ingreso</option>
                                <option value={TransactionType.Expense}>Gasto</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-secondary-gray">Fecha</label>
                            <input
                                type="date"
                                value={newTransaction.date}
                                onChange={e => setNewTransaction({...newTransaction, date: e.target.value})}
                                className="mt-1 block w-full rounded-md bg-space-black border border-neon-blue/20 text-high-contrast-white p-2"
                            />
                        </div>
                        <div className="flex justify-end gap-4">
                            <button 
                                onClick={() => setShowNewTransactionModal(false)}
                                className="px-4 py-2 rounded border border-neon-blue/20 hover:bg-neon-blue/10"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleAddTransaction}
                                className="px-4 py-2 rounded bg-gradient-to-r from-neon-blue to-cyan-400 hover:shadow-neon transition-shadow"
                            >
                                Agregar
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            <div className="bg-nebula-blue border border-neon-blue/20 rounded-lg overflow-hidden">
                <div className="flex justify-between items-center p-4">
                    <h2 className="text-xl font-bold">Historial de Transacciones</h2>
                    <button 
                        onClick={() => setShowNewTransactionModal(true)}
                        className="px-4 py-2 rounded bg-gradient-to-r from-neon-blue to-cyan-400 hover:shadow-neon transition-shadow"
                    >
                        Nueva Transacción
                    </button>
                </div>
                <table className="w-full text-left">
                    <thead className="bg-space-black/50">
                        <tr>
                            <th className="p-4">Fecha</th>
                            <th className="p-4">Descripción</th>
                            <th className="p-4">Tipo</th>
                            <th className="p-4 text-right">Monto</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(t => (
                            <tr key={t.id} className="border-t border-neon-blue/10 hover:bg-neon-blue/10">
                                <td className="p-4 text-secondary-gray">{new Date(t.date).toLocaleDateString()}</td>
                                <td className="p-4 font-medium">{t.description}</td>
                                <td className="p-4">
                                    <span className={`font-semibold ${t.type === TransactionType.Income ? 'text-green-400' : 'text-red-400'}`}>
                                        {t.type}
                                    </span>
                                </td>
                                <td className={`p-4 text-right font-mono ${t.type === TransactionType.Income ? 'text-green-400' : 'text-red-400'}`}>
                                    {t.type === TransactionType.Income ? '+' : '-'}${t.amount.toFixed(2)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Finances;
