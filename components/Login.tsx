import React, { useState } from 'react';

interface LoginProps {
    onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        // Permitir cualquier entrada, incluso un solo carácter
        if (username.length > 0 && password.length > 0) {
            // Limpiar campos antes de hacer login
            setUsername('');
            setPassword('');
            setError('');
            onLogin();
        } else {
            setError('Por favor, introduce el usuario y la contraseña correcta.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-space-black p-4">
            <div className="w-full max-w-md bg-nebula-blue border border-neon-blue/30 rounded-lg shadow-neon p-8">
                <div className="flex flex-col items-center mb-6">
                    <div className="w-32 h-32 rounded-xl border border-neon-blue/40 shadow-neon mb-4 overflow-hidden bg-space-black flex items-center justify-center">
                        <img
                            src="/images/dojo/Logo2.png"
                            alt="Logo del Dojo"
                            className="w-full h-full object-contain"
                        />
                    </div>
                    <h1 className="text-3xl font-bold text-high-contrast-white">Dojo Manager Pro</h1>
                    <p className="text-secondary-gray">Edición Academia Nacional de Artes Marciales</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="text-sm font-bold text-secondary-gray block mb-2">Usuario</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-space-black p-3 rounded border border-neon-blue/50 focus:outline-none focus:ring-2 focus:ring-neon-blue text-high-contrast-white"
                            placeholder="sensei@dojo.com"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-bold text-secondary-gray block mb-2">Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-space-black p-3 rounded border border-neon-blue/50 focus:outline-none focus:ring-2 focus:ring-neon-blue text-high-contrast-white"
                            placeholder="••••••••"
                        />
                    </div>
                    
                    {error && <p className="text-red-400 text-sm">{error}</p>}

                    <div>
                        <button
                            type="submit"
                            className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-neon-blue to-cyan-400 text-high-contrast-white font-bold hover:shadow-neon transition-all duration-300"
                        >
                            Iniciar Sesión
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;
