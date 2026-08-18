const fs = require('fs');
let code = fs.readFileSync('src/notes-module/pages/Record.tsx', 'utf8');

const targetSection = `{/* Action & Status Tier */}
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
                                ) : null}`;

const newSection = `{/* Action & Status Tier */}
                            <div className="flex flex-col gap-3.5 pt-4 mt-2 border-t border-slate-100/60 dark:border-slate-800/60">
                                {/* Elegant Recorded Services Tray */}
                                {recordedServices.length > 0 && (
                                    <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-4xl mx-auto px-4 py-2.5 rounded-2xl bg-slate-100/60 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/80 backdrop-blur-md shadow-xs animate-in fade-in slide-in-from-top-1 duration-300">
                                        <div className="flex items-center gap-1.5 mr-1.5">
                                            <Layers className="text-indigo-500" size={14} />
                                            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                {language === 'es' ? 'Añadidos' : 'Added'} ({recordedServices.length}):
                                            </span>
                                        </div>
                                        {recordedServices.map((svc, i) => (
                                            <div 
                                                key={svc.id} 
                                                className={cn(
                                                    "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs shadow-xs transition-all duration-200",
                                                    editingServiceId === svc.id 
                                                        ? "bg-indigo-50 dark:bg-indigo-950/50 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20"
                                                        : "bg-card border-border/80 text-foreground hover:border-primary/40"
                                                )}
                                            >
                                                <span className="size-4.5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center">
                                                    {i + 1}
                                                </span>
                                                <span className="font-medium truncate max-w-[160px] xl:max-w-[220px]">
                                                    {svc.subTemplate}
                                                </span>
                                                {(svc.timeIn || svc.timeOut || svc.units) && (
                                                    <span className="text-[11px] font-mono text-muted-foreground border-l border-border/60 pl-2 whitespace-nowrap">
                                                        {svc.timeIn && svc.timeOut 
                                                            ? \`\${svc.timeIn} - \${svc.timeOut}\` 
                                                            : (svc.timeIn ? svc.timeIn : \`\${parseInt(svc.units || '0') * 15}m\`)}
                                                    </span>
                                                )}
                                                <div className="flex items-center gap-1 border-l border-border/60 pl-1.5 ml-0.5">
                                                    <button 
                                                        onClick={() => handleEditService(svc)} 
                                                        className="size-5.5 flex items-center justify-center rounded-lg text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer"
                                                        title={language === 'es' ? "Editar" : "Edit"}
                                                    >
                                                        <Edit2 size={11} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleRemoveService(svc.id)} 
                                                        className="size-5.5 flex items-center justify-center rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                                        title={language === 'es' ? "Eliminar" : "Delete"}
                                                    >
                                                        <Trash2 size={11} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        <button 
                                            onClick={handleReset}
                                            className="h-7 px-2.5 rounded-xl text-muted-foreground hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-[11px] font-medium transition-colors cursor-pointer ml-1"
                                            title={language === 'es' ? "Descartar todos" : "Discard all"}
                                        >
                                            {language === 'es' ? 'Descartar' : 'Discard'}
                                        </button>
                                    </div>
                                )}

                                <div className="flex flex-row items-stretch gap-3.5 w-full max-w-xl xl:max-w-2xl mx-auto px-2">
                                    {(() => {
                                        const hasIdentity = selectedPatient || patientInfo.name.trim().length > 0;
                                        const canAdd = hasIdentity && serviceDate && selectedSubTemplate && (selectedSubTemplate !== 'Custom Template' || patientInfo.customTemplateText?.trim().length > 0);
                                        return (
                                            <>
                                                <Button
                                                    onClick={handleAddService}
                                                    disabled={!canAdd}
                                                    className={cn(
                                                        "h-11 flex-1 rounded-xl font-semibold text-xs uppercase tracking-wider gap-1.5 transition-all duration-200 shadow-xs border cursor-pointer",
                                                        canAdd 
                                                            ? (editingServiceId 
                                                                ? "bg-indigo-600 hover:bg-indigo-700 text-white border-transparent shadow-sm active:scale-98"
                                                                : "bg-card text-foreground border-border/80 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-secondary/60 active:scale-98") 
                                                            : "bg-muted/40 text-muted-foreground/60 border-border/40 shadow-none cursor-not-allowed"
                                                    )}
                                                >
                                                    {editingServiceId ? <Check size={14} strokeWidth={2.5} /> : <Plus size={14} strokeWidth={2.5} />}
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
                                                        className="h-11 flex-1 rounded-xl font-semibold text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground border border-border/80 bg-transparent hover:bg-secondary cursor-pointer active:scale-98"
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
                                                "h-11 flex-1 rounded-xl font-semibold text-xs uppercase tracking-wider gap-1.5 transition-all duration-200 active:scale-98 shadow-sm cursor-pointer",
                                                recordedServices.length > 0
                                                    ? "bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                                                    : "bg-muted/40 text-muted-foreground/60 pointer-events-none border border-border/40"
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
                                    <p className="text-center text-[10px] font-medium text-muted-foreground/80 uppercase tracking-wider transition-opacity duration-1000 mt-1">
                                        {t('record.fill_fields_to_enable', 'Fill patient & service fields to enable')}
                                    </p>
                                ) : null}`;

// Normalize CRLF
const normalizedCode = code.replace(/\r\n/g, '\n');
const normalizedTarget = targetSection.replace(/\r\n/g, '\n');
const normalizedNew = newSection.replace(/\r\n/g, '\n');

if (normalizedCode.includes(normalizedTarget)) {
    const updated = normalizedCode.replace(normalizedTarget, normalizedNew);
    fs.writeFileSync('src/notes-module/pages/Record.tsx', updated, 'utf8');
    console.log('Record.tsx action tier replaced SUCCESS');
} else {
    console.error('Target section NOT FOUND in Record.tsx');
}
