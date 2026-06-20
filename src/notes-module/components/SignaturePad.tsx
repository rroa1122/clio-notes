import React, { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Upload, CheckCircle2, Eraser } from 'lucide-react';
import { toast } from 'sonner';

interface SignaturePadProps {
    onSave: (signatureData: string) => void;
    onCancel: () => void;
}

const SignaturePad: React.FC<SignaturePadProps> = ({ onSave, onCancel }) => {
    const sigCanvas = useRef<SignatureCanvas>(null);
    const [signatureType, setSignatureType] = useState<'draw' | 'upload'>('draw');
    const [uploadPreview, setUploadPreview] = useState<string | null>(null);
    const clear = () => {
        if (signatureType === 'draw') {
            sigCanvas.current?.clear();
        } else {
            setUploadPreview(null);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setUploadPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const save = () => {
        try {
            if (signatureType === 'draw') {
                const canvas = sigCanvas.current;
                if (!canvas || canvas.isEmpty()) {
                    toast.error("Please draw a signature first");
                    return;
                }

                // Try trimmed, fallback to full if trim fails
                let dataUrl;
                try {
                    dataUrl = canvas.getTrimmedCanvas().toDataURL('image/png');
                } catch (e) {
                    dataUrl = canvas.toDataURL('image/png');
                }

                if (dataUrl) {
                    onSave(dataUrl);
                    toast.success("Signature captured!");
                }
            } else {
                if (uploadPreview) {
                    onSave(uploadPreview);
                    toast.success("Signature uploaded!");
                } else {
                    toast.error("Please upload a signature image first");
                }
            }
        } catch (err) {
            console.error("Signature save error:", err);
            toast.error("Failed to capture signature. Try again.");
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
                <button
                    onClick={() => setSignatureType('draw')}
                    className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${signatureType === 'draw'
                        ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    Draw Signature
                </button>
                <button
                    onClick={() => setSignatureType('upload')}
                    className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${signatureType === 'upload'
                        ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    Upload Image
                </button>
            </div>

            <div className="relative border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl bg-white dark:bg-slate-900 overflow-hidden">
                {signatureType === 'draw' ? (
                    <SignatureCanvas
                        ref={sigCanvas}
                        penColor="black"
                        canvasProps={{
                            className: "w-full h-48 cursor-crosshair",
                            width: 500,
                            height: 200
                        }}
                    />
                ) : (
                    <div className="h-48 flex flex-col items-center justify-center p-4">
                        {uploadPreview ? (
                            <img src={uploadPreview} alt="Signature Preview" className="max-h-full object-contain" />
                        ) : (
                            <label className="flex flex-col items-center gap-2 cursor-pointer text-slate-400 hover:text-primary transition-colors">
                                <Upload size={32} strokeWidth={1.5} />
                                <span className="text-xs font-bold uppercase tracking-widest">Select Signature File</span>
                                <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                            </label>
                        )}
                    </div>
                )}

                {(signatureType === 'upload' && uploadPreview) || (signatureType === 'draw') ? (
                    <button
                        onClick={clear}
                        className="absolute bottom-4 right-4 p-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-lg text-red-500 hover:bg-red-50 transition-all border border-slate-200 dark:border-white/5"
                        title="Clear Signature"
                    >
                        <Eraser size={16} />
                    </button>
                ) : null}
            </div>

            <div className="flex items-center gap-3">
                <button
                    onClick={onCancel}
                    className="flex-1 px-6 py-3 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                >
                    Cancel
                </button>
                <button
                    onClick={save}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-teal-500/20"
                >
                    <CheckCircle2 size={16} />
                    Confirm Signature
                </button>
            </div>
        </div>
    );
};

export default SignaturePad;
