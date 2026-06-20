import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    private handleReload = () => {
        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="error-boundary-container">
                    <div className="error-card">
                        <AlertCircle size={48} color="#ef4444" style={{ marginBottom: '1.5rem' }} />
                        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>Something went wrong</h1>
                        <p style={{ color: '#64748b', marginBottom: '2rem', lineHeight: '1.5' }}>
                            We encountered a runtime error. This has been logged, but the current screen cannot be displayed.
                        </p>

                        {this.state.error && (
                            <div className="error-code-box">
                                {this.state.error.toString()}
                            </div>
                        )}

                        <button
                            onClick={this.handleReload}
                            className="btn-primary"
                            style={{ margin: '0 auto' }}
                        >
                            <RefreshCw size={16} />
                            <span>Reload Application</span>
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
