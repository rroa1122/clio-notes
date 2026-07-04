import React, { useState, useEffect, useRef } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'sonner';
import SignatureCanvas from 'react-signature-canvas';
import { CheckCircle2, RotateCcw } from 'lucide-react';
import TcmNoteShell from '../components/TcmNoteShell';
import { useLanguage } from '../../context/LanguageContext';

const SignNote = () => {
    const { token } = useParams<{ token: string }>();
    const { language } = useLanguage();
    const [note, setNote] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSigned, setIsSigned] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const sigPad = useRef<any>(null);

    useEffect(() => {
        const fetchNote = async () => {
            if (!token) return;
            try {
                const { data, error } = await supabase.rpc('get_note_by_signature_token', { p_token: token });
                if (error) throw error;
                if (!data) throw new Error(language === 'es' ? "Enlace expirado, inválido o ya firmado." : "Link expired, invalid, or already signed.");

                const parsedNote = data.content || data;
                setNote(parsedNote);
            } catch (err: any) {
                setError(err.message || (language === 'es' ? "Error al cargar la nota" : "Failed to load note"));
            } finally {
                setLoading(false);
            }
        };
        fetchNote();
    }, [token]);

    const handleClear = () => {
        if (sigPad.current) sigPad.current.clear();
    };

    const handleSave = async () => {
        if (!sigPad.current || sigPad.current.isEmpty()) {
            toast.error(language === 'es' ? "Por favor proporcione una firma" : "Please provide a signature");
            return;
        }

        setIsSaving(true);
        try {
            const dataUrl = sigPad.current.getTrimmedCanvas().toDataURL('image/png');

            const { data, error: submitError } = await supabase.rpc('sign_note_with_token', {
                p_token: token,
                p_signature: dataUrl
            });

            if (submitError) throw submitError;
            if (!data) throw new Error(language === 'es' ? "Enlace expirado o inválido durante el guardado." : "Link expired or invalid during save.");

            toast.success(language === 'es' ? "¡Firma enviada exitosamente!" : "Signature submitted successfully!");
            setIsSigned(true);
        } catch (err: any) {
            toast.error(err.message || (language === 'es' ? "Error al enviar la firma" : "Failed to submit signature"));
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-500">{language === 'es' ? "Cargando documento seguro..." : "Loading secure document..."}</div>;
    }

    if (error || !note) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center max-w-md">
                    <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 mb-2">{language === 'es' ? "Enlace inválido" : "Invalid Link"}</h2>
                    <p className="text-slate-600 text-sm">
                        {language === 'es' 
                            ? "Este enlace de firma ha expirado, es inválido o el documento ya ha sido firmado."
                            : "This signature link has expired, is invalid, or the document has already been signed."}
                    </p>
                </div>
            </div>
        );
    }

    if (isSigned) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center max-w-md">
                    <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 mb-2">{language === 'es' ? "Documento firmado exitosamente" : "Document Signed successfully"}</h2>
                    <p className="text-slate-600 text-sm">
                        {language === 'es' 
                            ? "Gracias por revisar y firmar esta nota de progreso. Ya puede cerrar esta ventana."
                            : "Thank you for reviewing and signing this progress note. You may now close this window."}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-200 py-8 px-4 font-sans">
            <div className="max-w-4xl mx-auto space-y-6">

                {/* Information Header */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between pointer-events-none">
                    <div>
                        <h1 className="text-lg font-bold text-slate-800 tracking-tight">{language === 'es' ? "Revisar y firmar nota" : "Review & Sign Note"}</h1>
                        <p className="text-sm text-slate-500">
                            {language === 'es' 
                                ? "Por favor revise la nota clínica a continuación y agregue su firma al final."
                                : "Please review the clinical note below and append your signature at the bottom."}
                        </p>
                    </div>
                </div>

                {/* Readonly Shell */}
                <div className="pointer-events-none opacity-90 shadow-lg relative bg-white rounded-xl overflow-hidden border border-slate-200 print:pointer-events-auto print:opacity-100">
                    <div className="absolute inset-0 bg-transparent z-50 pointer-events-auto"></div>
                    <TcmNoteShell note={note} hideToolbar={true} isStandalone={true} />
                </div>

                {/* Signature Block */}
                <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200">
                    <h2 className="text-lg font-bold text-slate-800 mb-4 tracking-tight border-b border-slate-100 pb-2">{language === 'es' ? "Firma electrónica" : "Electronic Signature"}</h2>

                    <div className="mb-4">
                        <p className="text-sm text-slate-600 italic leading-relaxed">
                            {language === 'es' 
                                ? "Doy fe de que he revisado la información clínica anterior y estoy de acuerdo con la evaluación y el plan según lo documentado."
                                : "I attest that I have reviewed the above clinical information and agree with the assessment and plan as documented."}
                        </p>
                    </div>

                    <div className="border-2 border-slate-200 border-dashed rounded-xl bg-slate-50 overflow-hidden relative group">
                        <SignatureCanvas
                            ref={sigPad}
                            canvasProps={{
                                className: 'signature-canvas w-full h-[250px] cursor-crosshair touch-none',
                            }}
                            minWidth={1.5}
                            maxWidth={3}
                            penColor="#0f172a"
                        />
                        <div className="absolute top-2 right-2 flex gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={handleClear}
                                className="p-2 rounded-md hover:bg-slate-200 text-slate-500 bg-white shadow-sm transition-colors border border-slate-100"
                                title={language === 'es' ? "Limpiar firma" : "Clear signature"}
                            >
                                <RotateCcw size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-end mt-6">
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="bg-blue-600 text-white font-bold tracking-widest rounded-lg px-8 py-3.5 uppercase text-xs hover:bg-blue-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isSaving 
                                ? (language === 'es' ? 'Enviando...' : 'Submitting...') 
                                : (language === 'es' ? 'Aprobar y firmar documento' : 'Approve & Sign Document')}
                            {!isSaving && <CheckCircle2 size={16} />}
                        </button>
                    </div>
                </div>

                <p className="text-xs text-center text-slate-400 mt-8 mb-4">
                    {language === 'es' ? "Portal Seguro de Firma" : "Secure Signature Portal"} &copy; {new Date().getFullYear()} ClioNotes Clinical Suite
                </p>
            </div>
        </div>
    );
};

export default SignNote;
