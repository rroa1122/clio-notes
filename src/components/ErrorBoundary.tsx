import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: null });
        window.location.href = '/notes/new';
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                    <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-100 p-8 text-center space-y-6">
                        <div className="size-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                            <AlertCircle size={32} />
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Capa de Seguridad Activada</h2>
                            <p className="text-slate-500 font-medium leading-relaxed text-sm">
                                Hemos detectado un error inesperado. Esto ocurre frecuentemente cuando extensiones de traducción interfieren con la página.
                            </p>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-xl text-xs font-mono text-slate-400 text-left overflow-auto max-h-32">
                            {this.state.error?.toString()}
                        </div>

                        <Button
                            onClick={this.handleReset}
                            className="w-full h-12 rounded-xl font-bold bg-slate-900 hover:bg-slate-800 text-white gap-2"
                        >
                            <RefreshCw size={18} />
                            Reiniciar Aplicación
                        </Button>

                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                            ClinicFlow Resilience Module v1.0
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
