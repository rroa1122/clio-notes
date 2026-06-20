import React, { useState } from 'react';
import type { AppSettings } from '../types';
import { X, Lock, Mail, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const AuthModal = ({ isOpen, onClose }: AuthModalProps) => {
    const { login, signup } = useAuth();
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setIsLoading(true);

        try {
            if (isLoginMode) {
                await login(email, password);
                onClose();
            } else {
                await signup(email, password);
                setSuccessMessage('Account created! Please check your email to confirm.');
                setIsLoginMode(true); // Switch back to login
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Authentication failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content auth-card animate-scaleIn">
                <button className="modal-close" onClick={onClose}>
                    <X size={24} />
                </button>

                <div className="auth-header">
                    <div className="auth-logo">
                        <div className="pulse-circle"></div>
                        <span className="logo-text">ClioNotes</span>
                    </div>
                    <h2>{isLoginMode ? 'Welcome Back' : 'Create Account'}</h2>
                    <p>{isLoginMode ? 'Secure access into your clinical workspace.' : 'Join the new standard in clinical documentation.'}</p>
                </div>

                {successMessage && (
                    <div className="bg-emerald-50 text-emerald-600 p-3 rounded-lg text-sm text-center mb-4 border border-emerald-100">
                        {successMessage}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="medical-input-group">
                        <label>Professional Email</label>
                        <div className="input-wrapper">
                            <div className="field-icon">
                                <Mail size={18} />
                            </div>
                            <input
                                type="email"
                                className="medical-input"
                                placeholder="name@clinic.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="medical-input-group">
                        <label>Password</label>
                        <div className="input-wrapper">
                            <div className="field-icon">
                                <Lock size={18} />
                            </div>
                            <input
                                type="password"
                                className="medical-input"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                        </div>
                    </div>

                    {error && <div className="auth-error">{error}</div>}

                    <button type="submit" className="btn-primary btn-block" disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                <span>{isLoginMode ? 'Verifying...' : 'Creating Account...'}</span>
                            </>
                        ) : (
                            <>
                                <span>{isLoginMode ? 'Sign In' : 'Create Account'}</span>
                                <ArrowRight size={20} />
                            </>
                        )}
                    </button>

                    <div className="mt-4 text-center">
                        <button
                            type="button"
                            onClick={() => {
                                setIsLoginMode(!isLoginMode);
                                setError('');
                                setSuccessMessage('');
                            }}
                            className="text-sm text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-white transition-colors flex items-center justify-center gap-2 mx-auto"
                        >
                            {isLoginMode ? (
                                <>Need an account? <span className="font-bold underline">Sign Up</span></>
                            ) : (
                                <>Already have an account? <span className="font-bold underline">Log In</span></>
                            )}
                        </button>
                    </div>

                    <div className="auth-footer">
                        <span>Protected by ISO 27001 Security</span>
                    </div>
                </form>
            </div>

            <style>{`
                .auth-card {
                    background: rgba(30, 30, 32, 0.95); /* Deep dark base */
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    width: 100%;
                    max-width: 420px;
                    padding: 2.5rem;
                    border-radius: 24px;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                }

                [data-theme='light'] .auth-card {
                    background: rgba(255, 255, 255, 0.95);
                    border: 1px solid rgba(0, 0, 0, 0.05);
                }

                .auth-header {
                    text-align: center;
                    margin-bottom: 2rem;
                }

                .auth-logo {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.75rem;
                    margin-bottom: 1.5rem;
                    color: var(--md-sys-color-primary);
                }

                .pulse-circle {
                    width: 12px;
                    height: 12px;
                    background: var(--md-sys-color-primary);
                    border-radius: 50%;
                    box-shadow: 0 0 0 rgba(0, 137, 123, 0.4);
                    animation: pulseAuth 2s infinite;
                }

                .logo-text {
                    font-size: 1.5rem;
                    font-weight: 700;
                    letter-spacing: -0.5px;
                }

                .auth-header h2 {
                    font-size: 1.75rem;
                    font-weight: 700;
                    margin-bottom: 0.5rem;
                    color: var(--md-sys-color-on-surface);
                }

                .auth-header p {
                    color: var(--md-sys-color-on-surface-variant);
                    font-size: 0.95rem;
                }

                .auth-form {
                    display: flex;
                    flex-direction: column;
                    gap: 1.25rem;
                }

                .btn-block {
                    width: 100%;
                    justify-content: center;
                    margin-top: 0.5rem;
                    height: 52px;
                }
                
                .auth-footer {
                    margin-top: 1.5rem;
                    text-align: center;
                    font-size: 0.75rem;
                    color: var(--md-sys-color-outline);
                    opacity: 0.7;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                @keyframes pulseAuth {
                    0% { box-shadow: 0 0 0 0 rgba(0, 137, 123, 0.4); }
                    70% { box-shadow: 0 0 0 10px rgba(0, 137, 123, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(0, 137, 123, 0); }
                }
            `}</style>
        </div>
    );
};

export default AuthModal;
