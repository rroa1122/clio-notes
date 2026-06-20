import React, { useEffect, useState } from 'react';
import type { Note, ClioNote } from '../types';
import { useSearchParams } from 'react-router-dom';
import { storage } from '../lib/storage';
import type { Template } from '../lib/storage';
import { normalizeClioNote } from '../lib/clioUtils';
import EcwPrintNote from '../components/EcwPrintNote';
import TcmNoteShell from '../components/TcmNoteShell';
import { Loader2, ArrowLeft } from 'lucide-react';

const PrintNote: React.FC = () => {
    const [searchParams] = useSearchParams();
    const [note, setNote] = useState<ClioNote | null>(null);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const id = searchParams.get('id');
        if (!id) {
            setError("No note ID provided");
            setIsLoading(false);
            return;
        }

        const loadData = async () => {
            try {
                // Fetch Templates first
                const fetchedTemplates = await storage.getTemplates();
                setTemplates(fetchedTemplates);

                let storedNote;

                if (id === 'buffer') {
                    const buffer = localStorage.getItem('clio_print_buffer');
                    if (buffer) {
                        storedNote = JSON.parse(buffer);
                    }
                } else {
                    storedNote = await storage.getNote(id);
                }

                if (storedNote) {
                    const rawData = storedNote.rawResponse || storedNote.structured_note || storedNote;
                    const normalized = normalizeClioNote(rawData);
                    if (normalized) {
                        setNote(normalized);
                    } else {
                        setError("Failed to process note data");
                    }
                } else {
                    setError(id === 'buffer' ? "Session buffer is empty" : "Note not found in clinical database");
                }
            } catch (err) {
                console.error("Print error:", err);
                setError("An error occurred while loading the note");
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [searchParams]);

    // ORCHESTRATION: Handle Title and Print Trigger
    useEffect(() => {
        if (!note || isLoading) return;

        // PROFESSIONAL FILENAME: Set document title for PDF export
        const patientName = note.patient?.full_name || (note as any).patient_name || (note as any).meta?.patientName || "Patient";
        const template = (note as any).template || templates.find(t => t.id === note.meta?.template_id);
        const noteType = template?.name || (note as any).noteType || note.meta?.template_id || "Clinical Note";
        const dateString = new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');

        const professionalTitle = `${patientName} - ${noteType} - ${dateString}`;
        document.title = professionalTitle;

        // AUTOMATIC TRIGGER: Open print dialog
        const timer = setTimeout(() => {
            window.print();
        }, 800);

        return () => clearTimeout(timer);
    }, [note, isLoading]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-white">
                <Loader2 className="animate-spin text-teal-600 mb-4" size={32} />
                <p className="text-sm font-bold uppercase tracking-widest text-slate-400">Preparing Clinical Document...</p>
            </div>
        );
    }

    if (error || !note) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-white text-center">
                <div className="size-16 rounded-full bg-red-50 flex items-center justify-center text-red-500 mb-6">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                </div>
                <h2 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight">Print Error</h2>
                <p className="text-slate-500 text-sm max-w-xs mx-auto">{error || "The note could not be loaded."}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-12 px-4">
            {/* Navigation Overlay (Hidden in Print) */}
            <div className="fixed top-6 left-6 no-print z-50">
                <button
                    onClick={() => window.history.back()}
                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl shadow-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-all font-bold text-xs text-slate-600 dark:text-slate-300"
                >
                    <ArrowLeft size={16} />
                    Back to Workspace
                </button>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    /* SUPER-NUCLEAR RESET: Force full page flow for standalone route */
                    html, body, #root, .min-h-screen, .layout, .layout-container, .main-content, .page-container {
                        height: auto !important;
                        min-height: 0 !important;
                        overflow: visible !important;
                        display: block !important;
                        position: static !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                    }

                    .no-print { display: none !important; }
                    
                    /* Force container sizing */
                    .max-w-[850px] {
                        max-width: none !important;
                        width: 100% !important;
                        margin: 0 !important;
                        box-shadow: none !important;
                        border: none !important;
                    }

                    @page { 
                        size: auto; 
                        margin: 12mm !important; 
                    }
                }
            `}} />

            <div className="max-w-[850px] mx-auto bg-white shadow-2xl overflow-visible">
                {note.meta?.template_id?.startsWith('tcm_') ? (
                    <TcmNoteShell note={note} hideToolbar={true} isStandalone={true} />
                ) : (
                    <EcwPrintNote note={note} hideToolbar={true} isStandalone={true} />
                )}
            </div>
        </div>
    );
};

export default PrintNote;
