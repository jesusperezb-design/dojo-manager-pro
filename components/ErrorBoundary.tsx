import React from 'react';

type ErrorBoundaryState = { hasError: boolean; message?: string };

class ErrorBoundary extends React.Component<React.PropsWithChildren<{}>, ErrorBoundaryState> {
    props: React.PropsWithChildren<{}>;
    state: ErrorBoundaryState;

    constructor(props: React.PropsWithChildren<{}>) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
        return { hasError: true, message: error instanceof Error ? error.message : String(error) };
    }

    componentDidCatch(error: unknown, info: React.ErrorInfo) {
        console.error('UI error capturado:', error, info);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-space-black text-high-contrast-white flex flex-col items-center justify-center p-6">
                    <h1 className="text-2xl font-bold mb-4">Se ha producido un error al cargar el panel</h1>
                    <p className="text-secondary-gray text-sm max-w-xl text-center mb-6">
                        Refresca la página o borra los datos guardados del navegador. Si el problema persiste, comparte este mensaje con el equipo técnico:
                    </p>
                    <code className="bg-space-black/60 border border-neon-blue/30 rounded-lg px-4 py-3 text-sm text-secondary-gray">
                        {this.state.message}
                    </code>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
