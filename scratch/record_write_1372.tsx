const fs = require('fs');
let code = fs.readFileSync('src/notes-module/pages/Record.tsx', 'utf8');

// Target the newly modified section
const startMarker = '{/* Action & Status Tier */}';
const endMarker = '{!showGuide && (';

const startIndex = code.indexOf(startMarker);
const endIndex = code.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
    const originalActionTier = `{/* Action & Status Tier */}
                            <div className="flex flex-col gap-4 pt-6 mt-2 border-t border-slate-100/50 dark:border-slate-800/60">
                                <div className="flex flex-row items-stretch gap-4 w-full max-w-3xl mx-auto px-4">
                                    {(() => {
                                        const hasIdentity = selectedPatient || patientInfo.name.trim().length > 0;
                                        const canAdd = hasIdentity && serviceDate && selectedSubTemplate && (selectedSubTemplate !== 'Custom Template' || patientInfo.customTemplateText?.trim().length > 0);
                                        return (
                                            <>
                                                <Button
                                                    onClick={handleAddService}
                                                    disabled={!canAdd}
                                                    className={cn(
                                                        "h-12 flex-1 rounded-full font-bold text-[12px] uppercase tracking-[0.2em] gap-2 transition-all duration-500 shadow-sm border",
                                                        canAdd 
                                                            ? (editingServiceId 
                                                                ? "bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 border-transparent active:scale-[0.98]"
                                                                : "bg-white dark:bg-slate-900 text-primary border-primary/20 dark:border-primary/30 hover:bg-primary/5 dark:hover:bg-primary/10 hover:border-primary/40 active:scale-[0.98]") 
                                                            : "bg-slate-50/50 dark:bg-slate-950/20 text-slate-400 dark:text-slate-600 border-slate-100 dark:border-slate-900 shadow-none cursor-not-allowed"
                                                    )}
                                                >
                                                    {editingServiceId ? <Check size={14} strokeWidth={3} /> : <Plus size={14} strokeWidth={3} />}
                                                    <span>
                                                        {editingServiceId 
                                                            ? (language === 'es' ? "Guardar Cambios" : "Save Changes") 
                                                            : (audioBlob && (patientInfo.context.trim() || patientInfo.customTemplateText?.trim()) 
                                                                ? (language === 'es' ? "Añadir Combinado" : "Add Combined") 
                                                                : (audioBlob 
                                                                    ? (language === 'es' ? "Añadir Audio" : "Add Audio") 
                                                                    : ((patientInfo.context.trim() || patientInfo.customTemplateText?.trim()) 
                                                                        ? (language === 'es' ? "Añadir Texto" : "Add Text") 
                                                                        : (language === 'es' ? "Añadir Servicio" : "Add Service"))))}
                                                    </span>
                                                </Button>
                                                {editingServiceId && (
                                                    <Button
                                                        onClick={handleCancelEdit}
                                                        variant="outline"
                                                        className="h-12 flex-1 rounded-full font-bold text-[12px] uppercase tracking-[0.2em] text-slate-400 hover:text-slate-600 border border-slate-200 dark:border-slate-800 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-950"
                                                    >
                                                        {language === 'es' ? "Cancelar" : "Cancel"}
                                                    </Button>
                                                )}
                                            </>
                                        );
                                    })()}

                                    {!editingServiceId && (
                                        <Button
                                            onClick={sendToGenerate}
                                            disabled={recordedServices.length === 0 || status === 'uploading' || status === 'processing'}
                                            className={cn(
                                                "h-12 flex-1 rounded-full font-bold text-[12px] uppercase tracking-[0.2em] gap-2 transition-all duration-500 active:scale-[0.98] shadow-md",
                                                recordedServices.length > 0
                                                    ? "bg-slate-800 dark:bg-slate-700 text-white hover:bg-slate-900 dark:hover:bg-slate-600 shadow-slate-900/10"
                                                    : "bg-slate-50 dark:bg-slate-950/20 text-slate-400 dark:text-slate-600 pointer-events-none border border-slate-100 dark:border-slate-900"
                                            )}
                                        >
                                            {status === 'processing' || status === 'uploading' ? (
                                                <>
                                                    <Loader2 className="animate-spin" size={14} />
                                                    <span>{language === 'es' ? "Procesando..." : "Processing..."}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <FileCheck size={14} />
                                                    <span>{language === 'es' ? "Finalizar" : "Finalize"} ({recordedServices.length})</span>
                                                </>
                                            )}
                                        </Button>
                                    )}
                                </div>
                                {(!selectedPatient && !patientInfo.name.trim()) || !selectedSubTemplate ? (
                                    <p className="text-center text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] animate-pulse transition-opacity duration-1000">
                                        {t('record.fill_fields_to_enable', 'Fill patient & service fields to enable')}
                                    </p>
                                ) : null}
                                `;

    const updated = code.substring(0, startIndex) + originalActionTier + code.substring(endIndex);
    fs.writeFileSync('src/notes-module/pages/Record.tsx', updated, 'utf8');
    console.log('Action tier reverted SUCCESS');
} else {
    console.error('Markers not found', { startIndex, endIndex });
}
