const fs = require('fs');

const edit737 = JSON.parse(fs.readFileSync('scratch/c978_edit_737.json', 'utf8')).args;
const edit694 = JSON.parse(fs.readFileSync('scratch/c978_edit_694.json', 'utf8')).args;
const edit761 = JSON.parse(fs.readFileSync('scratch/c978_edit_761.json', 'utf8')).args;
const edit743 = JSON.parse(fs.readFileSync('scratch/c978_edit_743.json', 'utf8')).args;
const edit720 = JSON.parse(fs.readFileSync('scratch/c978_edit_720.json', 'utf8')).args;
const edit765 = JSON.parse(fs.readFileSync('scratch/c978_edit_765.json', 'utf8')).args;

let code = fs.readFileSync('src/notes-module/pages/Record.tsx', 'utf8').replace(/\r\n/g, '\n');

// 1. Apply Outer container (737)
code = code.replace(
    '<div className="flex flex-col items-center w-full pt-6 lg:pt-8 px-4 pb-12 animate-in fade-in duration-500">',
    '<div className="flex flex-col items-center justify-center w-full min-h-[calc(100dvh-4.5rem)] pt-2 lg:pt-3 px-2 sm:px-4 pb-3 lg:pb-4 animate-in fade-in duration-500">'
);

// 2. Apply Card container and CardContent (694 / 737)
code = code.replace(
    /<Card className="max-w-6xl w-full bg-transparent md:bg-surface border-0 md:border border-border\/60 shadow-none md:shadow-soft rounded-\[2\.5rem\]">/,
    '<Card className="w-full max-w-5xl lg:max-w-6xl xl:max-w-7xl 2xl:max-w-[1540px] bg-transparent md:bg-surface border-0 md:border border-border/60 shadow-none md:shadow-soft rounded-2xl md:rounded-3xl xl:rounded-[2rem] 2xl:rounded-[2.5rem] transition-all duration-300">'
);
code = code.replace(
    /<CardContent className="p-4 sm:p-6 md:p-8 space-y-6">/,
    '<CardContent className="p-3 sm:p-4 md:p-5 lg:p-6 xl:p-7 2xl:p-8 space-y-3 sm:space-y-4 md:space-y-4 xl:space-y-5">'
);

// 3. Top Tier layout & spacing (761)
code = code.replace(
    '<div className="hidden md:block space-y-8">',
    '<div className="hidden md:block space-y-2.5 md:space-y-3.5 xl:space-y-4">'
);
code = code.replace(
    '<div className="grid grid-cols-1 md:grid-cols-10 gap-6 md:gap-8 pb-8 border-b border-slate-100 dark:border-slate-800">',
    '<div className="grid grid-cols-1 md:grid-cols-10 gap-2.5 md:gap-3 lg:gap-4 xl:gap-5 pb-3 md:pb-3.5 xl:pb-4 border-b border-slate-100 dark:border-slate-800">'
);

// 4. Middle Tier capture interface (743)
code = code.replace(
    /<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">/,
    '<div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 xl:gap-5 2xl:gap-6 items-stretch">'
);

// 5. Replace Action & Status Tier and remove bottom Joint Note Stack (720 / 765)
// Find from Action & Status Tier to before patientCreateModal
const actionTierRegex = /\{\/\* Action & Status Tier \*\/\}[\s\S]*?(?=<input type="file" ref={fileInputRef})/;

const newActionAndCapsuleTier = `{/* Action & Status Tier */}
                            <div className="flex flex-col gap-2 xl:gap-2.5 pt-2.5 md:pt-3 xl:pt-4 mt-1 border-t border-slate-100/50 dark:border-slate-800/60">
                                {/* Compact Recorded Services Capsule Ribbon */}
                                {recordedServices.length > 0 && (
                                    <div className="flex flex-wrap items-center justify-center gap-2 max-w-4xl mx-auto px-2 animate-in fade-in slide-in-from-top-1 duration-300">
                                        <div className="flex items-center gap-1.5 mr-1">
                                            <Layers className="text-indigo-500/70" size={13} />
                                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                                {language === 'es' ? 'Añadidos' : 'Added'} ({recordedServices.length}):
                                            </span>
                                        </div>
                                        {recordedServices.map((svc, i) => (
                                            <div 
                                                key={svc.id} 
                                                className={cn(
                                                    "inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-[11px] shadow-sm transition-all duration-300",
                                                    editingServiceId === svc.id 
                                                        ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20"
                                                        : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700"
                                                )}
                                            >
                                                <span className="size-4 rounded-full bg-indigo-600 text-white font-bold text-[9px] flex items-center justify-center">
                                                    {i + 1}
                                                </span>
                                                <span className="font-semibold truncate max-w-[140px] xl:max-w-[200px]">
                                                    {svc.subTemplate}
                                                </span>
                                                {(svc.timeIn || svc.timeOut || svc.units) && (
                                                    <span className="text-[10px] opacity-70 border-l border-slate-200 dark:border-slate-700 pl-1.5 whitespace-nowrap">
                                                        {svc.timeIn && svc.timeOut 
                                                            ? \`\${svc.timeIn}-\${svc.timeOut}\` 
                                                            : (svc.timeIn ? svc.timeIn : \`\${parseInt(svc.units || '0') * 15}m\`)}
                                                    </span>
                                                )}
                                                <div className="flex items-center gap-0.5 border-l border-slate-200 dark:border-slate-700 pl-1">
                                                    <button 
                                                        onClick={() => handleEditService(svc)} 
                                                        className="size-5 flex items-center justify-center rounded-full text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"
                                                        title={language === 'es' ? "Editar" : "Edit"}
                                                    >
                                                        <Edit2 size={10} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleRemoveService(svc.id)} 
                                                        className="size-5 flex items-center justify-center rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                                                        title={language === 'es' ? "Eliminar" : "Delete"}
                                                    >
                                                        <Trash2 size={10} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        <button 
                                            onClick={handleReset}
                                            className="text-[10px] font-bold text-slate-400 hover:text-rose-500 transition-colors px-1.5 py-0.5"
                                            title={language === 'es' ? "Descartar todos" : "Discard all"}
                                        >
                                            {language === 'es' ? 'Descartar' : 'Discard'}
                                        </button>
                                    </div>
                                )}

                                <div className="flex flex-row items-stretch gap-3 xl:gap-4 w-full max-w-2xl xl:max-w-3xl 2xl:max-w-4xl mx-auto px-2">
                                    {(() => {
                                        const hasIdentity = selectedPatient || patientInfo.name.trim().length > 0;
                                        const canAdd = hasIdentity && serviceDate && selectedSubTemplate && (selectedSubTemplate !== 'Custom Template' || patientInfo.customTemplateText?.trim().length > 0);
                                        return (
                                            <>
                                                <Button
                                                    onClick={handleAddService}
                                                    disabled={!canAdd}
                                                    className={cn(
                                                        "h-10 md:h-10.5 xl:h-11 flex-1 rounded-full font-bold text-[11px] xl:text-xs uppercase tracking-[0.14em] gap-1.5 transition-all duration-300 shadow-sm border cursor-pointer",
                                                        canAdd 
                                                            ? (editingServiceId 
                                                                ? "bg-primary text-primary-foreground hover:bg-primary/90 border-transparent shadow-md shadow-primary/20 active:scale-95"
                                                                : "bg-card text-primary border-primary/25 hover:bg-primary/5 hover:border-primary/50 shadow-primary/5 active:scale-95") 
                                                            : "bg-muted/40 text-muted-foreground/60 border-border/40 shadow-none cursor-not-allowed"
                                                    )}
                                                >
                                                    {editingServiceId ? <Check size={13} strokeWidth={3} /> : <Plus size={13} strokeWidth={3} />}
                                                    <span>
                                                        {editingServiceId 
                                                            ? (language === 'es' ? "Guardar Cambios" : "Save Changes") 
                                                            : (audioBlob && (patientInfo.context.trim() || patientInfo.customTemplateText?.trim()) 
                                                                ? (language === 'es' ? "Añadir Combinado" : "Add Combined") 
                                                                : (audioBlob 
                                                                    ? (language === 'es' ? "Añadir Audio" : "Add Audio") 
                                                                    : ((patientInfo.context.trim() || patientInfo.customTemplateText?.trim()) 
                                                                        ? (language === 'es' ? "Añadir Texto" : "Add Texto") 
                                                                        : (language === 'es' ? "Añadir Servicio" : "Add Service"))))}
                                                    </span>
                                                </Button>
                                                {editingServiceId && (
                                                    <Button
                                                        onClick={handleCancelEdit}
                                                        variant="outline"
                                                        className="h-10 md:h-10.5 xl:h-11 flex-1 rounded-full font-bold text-[11px] xl:text-xs uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground border border-border/80 bg-transparent hover:bg-secondary cursor-pointer active:scale-95"
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
                                                "h-10 md:h-10.5 xl:h-11 flex-1 rounded-full font-bold text-[11px] xl:text-xs uppercase tracking-[0.14em] gap-1.5 transition-all duration-300 active:scale-95 shadow-md cursor-pointer",
                                                recordedServices.length > 0
                                                    ? "bg-foreground text-background hover:bg-foreground/90 shadow-foreground/10"
                                                    : "bg-muted/40 text-muted-foreground/60 pointer-events-none border border-border/40"
                                            )}
                                        >
                                            {status === 'processing' || status === 'uploading' ? (
                                                <>
                                                    <Loader2 className="animate-spin" size={13} />
                                                    <span>{language === 'es' ? "Procesando..." : "Processing..."}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <FileCheck size={13} />
                                                    <span>{language === 'es' ? "Finalizar" : "Finalize"} ({recordedServices.length})</span>
                                                </>
                                            )}
                                        </Button>
                                    )}
                                </div>
                                {(!selectedPatient && !patientInfo.name.trim()) || !selectedSubTemplate ? (
                                    <p className="text-center text-[9px] xl:text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.14em] animate-pulse transition-opacity duration-1000 mt-0.5">
                                        {t('record.fill_fields_to_enable', 'Fill patient & service fields to enable')}
                                    </p>
                                ) : null}
                                {!showGuide && (
                                    <div className="flex justify-center mt-1.5">
                                        <button 
                                            onClick={() => {
                                                localStorage.removeItem('clio_hide_guide');
                                                setShowGuide(true);
                                            }}
                                            className="text-[9px] xl:text-[10px] font-bold uppercase tracking-widest text-[#6366f1] hover:text-[#6366f1]/80 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors flex items-center gap-1.5 p-1 px-3 rounded-full hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 border border-indigo-50 dark:border-indigo-950/30"
                                        >
                                            <Compass className="size-3 text-[#6366f1] dark:text-indigo-400 animate-[spin_10s_linear_infinite]" />
                                            <span>{language === 'es' ? 'Mostrar Guía de Inicio' : 'Show Quick Start Guide'}</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>


                    </CardContent>
                </Card>
            )}

            `;

code = code.replace(actionTierRegex, newActionAndCapsuleTier);

fs.writeFileSync('src/notes-module/pages/Record.tsx', code, 'utf8');
console.log('Restored complete responsive layout + compact capsule ribbon from c978 successfully');
