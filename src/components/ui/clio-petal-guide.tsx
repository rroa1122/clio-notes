import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';
import { Sparkles } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export interface ClioPetalGuideProps {
    hasPatient: boolean;
    hasEncounterTime: boolean;
    hasService: boolean;
    hasRecordedServices: boolean;
    isGeneratingOrDone: boolean;
    className?: string;
}

type GuideStep = 'patient' | 'time' | 'service' | 'add-service' | 'finalize' | 'completed';

interface CoordsState {
    x: number;
    y: number;
    rotation: number;
    direction: 'down' | 'up';
    isVisible: boolean;
}

/**
 * Finds the exact target element using direct input/button selectors
 */
function getTargetElement(step: GuideStep): HTMLElement | null {
    if (step === 'patient') {
        const input = document.querySelector('#clio-tour-patient input, [data-tour="client-identity"] input') as HTMLElement;
        if (input && input.offsetParent !== null) return input;
        return null;
    }
    if (step === 'time') {
        const timeEl = document.querySelector('#clio-tour-time') as HTMLElement;
        if (timeEl && timeEl.offsetParent !== null) return timeEl;
        const fallback = document.querySelector('[data-tour="encounter-time"] .rounded-full') as HTMLElement;
        return (fallback && fallback.offsetParent !== null) ? fallback : null;
    }
    if (step === 'service') {
        const serviceEl = document.querySelector('#clio-tour-service') as HTMLElement;
        if (serviceEl && serviceEl.offsetParent !== null) return serviceEl;
        const fallback = document.querySelector('[data-tour="service-provided"] .rounded-full, [data-tour="service-provided"] input') as HTMLElement;
        return (fallback && fallback.offsetParent !== null) ? fallback : null;
    }
    if (step === 'add-service') {
        const addBtn = document.querySelector('#clio-tour-add-btn') as HTMLElement;
        if (addBtn && addBtn.offsetParent !== null) return addBtn;
        const fallback = document.querySelector('[data-tour="add-service-btn"]') as HTMLElement;
        return (fallback && fallback.offsetParent !== null) ? fallback : null;
    }
    if (step === 'finalize') {
        const finBtn = document.querySelector('#clio-tour-finalize-btn') as HTMLElement;
        if (finBtn && finBtn.offsetParent !== null) return finBtn;
        const fallback = document.querySelector('[data-tour="finalize-btn"]') as HTMLElement;
        return (fallback && fallback.offsetParent !== null) ? fallback : null;
    }
    return null;
}

export function ClioPetalGuide({
    hasPatient,
    hasEncounterTime,
    hasService,
    hasRecordedServices,
    isGeneratingOrDone,
    className,
}: ClioPetalGuideProps) {
    const [mounted, setMounted] = useState(false);
    const [isDisabled, setIsDisabled] = useState(() => {
        try {
            return localStorage.getItem('clio_petal_guide_disabled') === 'true';
        } catch {
            return false;
        }
    });

    const [coords, setCoords] = useState<CoordsState>({
        x: -999,
        y: -999,
        rotation: 0,
        direction: 'down',
        isVisible: false,
    });

    const [pupilOffset, setPupilOffset] = useState({ x: 0, y: 0 });
    const [isBlinking, setIsBlinking] = useState(false);
    const [celebrate, setCelebrate] = useState(false);
    const prevStepRef = useRef<GuideStep | null>(null);
    const petalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Determine current active step based strictly on form state
    let currentStep: GuideStep = 'patient';

    if (isGeneratingOrDone) {
        currentStep = 'completed';
    } else if (hasRecordedServices) {
        currentStep = 'finalize';
    } else if (hasPatient && hasEncounterTime && hasService) {
        currentStep = 'add-service';
    } else if (hasPatient && hasEncounterTime) {
        currentStep = 'service';
    } else if (hasPatient) {
        currentStep = 'time';
    }

    // Step change celebration
    useEffect(() => {
        if (prevStepRef.current && prevStepRef.current !== currentStep) {
            setCelebrate(true);
            const timer = setTimeout(() => setCelebrate(false), 500);
            return () => clearTimeout(timer);
        }
        prevStepRef.current = currentStep;
    }, [currentStep]);

    // Natural occasional blinking
    useEffect(() => {
        const triggerBlink = () => {
            setIsBlinking(true);
            setTimeout(() => setIsBlinking(false), 160);
        };

        const interval = setInterval(triggerBlink, 4000);
        return () => clearInterval(interval);
    }, []);

    // Eye pupil tracking mouse cursor
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!petalRef.current || !coords.isVisible) return;
            const rect = petalRef.current.getBoundingClientRect();
            const petalCenterX = rect.left + rect.width / 2;
            const petalCenterY = rect.top + rect.height / 2;

            let dx = e.clientX - petalCenterX;
            let dy = e.clientY - petalCenterY;
            // Adjust tracking for 180deg inverted orientation
            if (coords.rotation === 180) {
                dx = -dx;
                dy = -dy;
            }

            const angle = Math.atan2(dy, dx);
            const maxDistance = 3.2;
            const distance = Math.min(maxDistance, Math.hypot(dx, dy) / 45);

            setPupilOffset({
                x: Math.cos(angle) * distance,
                y: Math.sin(angle) * distance,
            });
        };

        window.addEventListener('mousemove', handleMouseMove, { passive: true });
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [coords.isVisible, coords.rotation]);

    // Millimetric target positioning & shared glowing halo directly on target element
    useEffect(() => {
        if (isDisabled || currentStep === 'completed') {
            setCoords(prev => ({ ...prev, isVisible: false }));
            document.querySelectorAll('.clio-guide-active-glow').forEach(el => el.classList.remove('clio-guide-active-glow'));
            return;
        }

        const updatePosition = () => {
            const el = getTargetElement(currentStep);
            if (!el) {
                setCoords(prev => ({ ...prev, isVisible: false }));
                document.querySelectorAll('.clio-guide-active-glow').forEach(prevEl => prevEl.classList.remove('clio-guide-active-glow'));
                return;
            }

            // Sync the active glowing aura on the target element
            document.querySelectorAll('.clio-guide-active-glow').forEach(prevEl => {
                if (prevEl !== el) prevEl.classList.remove('clio-guide-active-glow');
            });
            if (!el.classList.contains('clio-guide-active-glow')) {
                el.classList.add('clio-guide-active-glow');
            }

            const rect = el.getBoundingClientRect();

            // Bottom buttons (add-service & finalize): point from BELOW upwards (☝️)
            const isBottomButton = currentStep === 'add-service' || currentStep === 'finalize';
            const rotation = isBottomButton ? 180 : 0;
            const direction: 'down' | 'up' = isBottomButton ? 'up' : 'down';

            // Center horizontally on target, or align over search input
            let targetX = rect.left + rect.width / 2;
            if (currentStep === 'patient') {
                targetX = rect.left + Math.min(130, rect.width / 2);
            }

            // For top inputs: tip points DOWN onto top edge (rect.top + 8)
            // For bottom buttons: tip points UP onto bottom edge, placed with generous clearance below
            const targetY = isBottomButton ? (rect.bottom + 102) : (rect.top + 8);

            setCoords({
                x: targetX,
                y: targetY,
                rotation,
                direction,
                isVisible: true,
            });
        };

        updatePosition();
        const interval = setInterval(updatePosition, 150);
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);

        return () => {
            clearInterval(interval);
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
            document.querySelectorAll('.clio-guide-active-glow').forEach(prevEl => prevEl.classList.remove('clio-guide-active-glow'));
        };
    }, [isDisabled, currentStep]);

    // Listener to re-enable
    useEffect(() => {
        const handleEnable = () => {
            localStorage.removeItem('clio_petal_guide_disabled');
            setIsDisabled(false);
        };
        window.addEventListener('clio-enable-petal-guide', handleEnable);
        return () => window.removeEventListener('clio-enable-petal-guide', handleEnable);
    }, []);

    if (!mounted || isDisabled || currentStep === 'completed' || !coords.isVisible) {
        return null;
    }

    const content = (
        <div
            ref={petalRef}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                transform: `translate3d(${coords.x}px, ${coords.y}px, 0)`,
                transition: 'transform 0.35s cubic-bezier(0.34, 1.35, 0.64, 1)',
                zIndex: 99999,
            }}
            className={cn("pointer-events-none select-none", className)}
        >
            {/* The tip is anchored at (coords.x, coords.y):
                - When pointing DOWN: translate(-50%, -100%) places bottom tip at target
                - When pointing UP: translate(-50%, 0) places top tip at target
            */}
            <div
                style={{
                    transform: coords.direction === 'up' ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
                }}
                className="relative flex flex-col items-center justify-center pointer-events-none"
            >
                {/* Bobbing animation wrapper */}
                <div
                    style={{
                        animation: coords.direction === 'up'
                            ? 'clio-bob-up 1.8s ease-in-out infinite'
                            : 'clio-bob-down 1.8s ease-in-out infinite',
                    }}
                    className="pointer-events-none flex items-center justify-center"
                >
                    {/* The Clio Petal Mascot: 100% pointer-events-none so it NEVER blocks user clicks */}
                    <div
                        style={{
                            transform: `rotate(${coords.rotation}deg)`,
                            transition: 'transform 0.35s cubic-bezier(0.34, 1.3, 0.64, 1)',
                        }}
                        className={cn(
                            "pointer-events-none relative flex items-center justify-center transition-all duration-300",
                            celebrate && "scale-125"
                        )}
                    >
                        {/* Ambient Glow Aura */}
                        <div className="absolute inset-0 size-12 rounded-full bg-indigo-500/35 blur-md pointer-events-none" />

                        {/* SVG Petal Body */}
                        <svg
                            viewBox="0 0 54 62"
                            className="w-[44px] h-[52px] drop-shadow-[0_6px_16px_rgba(79,70,229,0.55)] pointer-events-none"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <defs>
                                <linearGradient id="clio-mascot-gradient-v9" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#4338ca" />
                                    <stop offset="50%" stopColor="#6366f1" />
                                    <stop offset="100%" stopColor="#818cf8" />
                                </linearGradient>
                            </defs>

                            {/* Petal Silhouette */}
                            <path
                                d="M27 60 C24 50 4 34 4 19 C4 9 14 2 27 2 C40 2 50 9 50 19 C50 34 30 50 27 60 Z"
                                fill="url(#clio-mascot-gradient-v9)"
                                stroke="#c7d2fe"
                                strokeWidth="1.75"
                            />

                            {/* Minimalist Grok-style Left Eye */}
                            <rect
                                x={17.2 + pupilOffset.x * 0.7}
                                y={isBlinking ? 19.3 : (15 + pupilOffset.y * 0.7)}
                                width="3.6"
                                height={isBlinking ? "1.4" : "10"}
                                rx="1.8"
                                fill="#09090b"
                            />

                            {/* Minimalist Grok-style Right Eye */}
                            <rect
                                x={33.2 + pupilOffset.x * 0.7}
                                y={isBlinking ? 19.3 : (15 + pupilOffset.y * 0.7)}
                                width="3.6"
                                height={isBlinking ? "1.4" : "10"}
                                rx="1.8"
                                fill="#09090b"
                            />
                        </svg>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes clio-bob-down {
                    0%, 100% {
                        transform: translateY(0px);
                    }
                    50% {
                        transform: translateY(-4px);
                    }
                }
                @keyframes clio-bob-up {
                    0%, 100% {
                        transform: translateY(0px);
                    }
                    50% {
                        transform: translateY(4px);
                    }
                }
                .clio-guide-active-glow {
                    box-shadow: 0 0 0 1.5px rgba(99, 102, 241, 0.45), 0 0 14px rgba(99, 102, 241, 0.22) !important;
                    border-color: rgba(99, 102, 241, 0.55) !important;
                    transition: box-shadow 0.3s ease, border-color 0.3s ease !important;
                }
            `}</style>
        </div>
    );

    return createPortal(content, document.body);
}

/**
 * Petal Guide Toggle Button for Header
 */
export function ClioPetalGuideToggle() {
    const { language } = useLanguage();
    const isEs = language === 'es';

    const handleEnable = () => {
        localStorage.removeItem('clio_petal_guide_disabled');
        window.dispatchEvent(new CustomEvent('clio-enable-petal-guide'));
    };

    return (
        <button
            type="button"
            onClick={handleEnable}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 sm:px-3 rounded-full text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-95"
            title={isEs ? "Reactivar la guía interactiva de Clio" : "Reactivate Clio guided tour"}
        >
            <Sparkles size={13} className="text-indigo-600 dark:text-indigo-400 animate-pulse" />
            <span>{isEs ? "Guía Clio" : "Clio Guide"}</span>
        </button>
    );
}
