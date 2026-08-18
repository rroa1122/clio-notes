const fs = require('fs');
let code = fs.readFileSync('src/notes-module/pages/Record.tsx', 'utf8');

// Target 1: Desktop TimeIn
const dTimeInTarget = `<PopoverContent className="w-[300px] p-0 rounded-3xl overflow-hidden border border-border/70 shadow-2xl bg-card/95 backdrop-blur-xl" side="bottom" align="center" sideOffset={10}>
                                                    <div className="flex flex-col items-center">
                                                        <div className="w-full pt-6 pb-3 text-center">
                                                            <span className="font-semibold tracking-tight text-foreground text-base">{language === 'es' ? 'Seleccionar hora' : 'Select Time'}</span>
                                                            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">{language === 'es' ? 'Inicio del encuentro' : 'Encounter Start'}</div>
                                                        </div>
                                                        <div className="px-6 pb-6 w-full">
                                                            <TimeSpinner 
                                                                initialTimeStr={timeIn}
                                                                onConfirm={(timeStr) => {
                                                                    handleTimeInChange(timeStr);
                                                                    setIsTimePopoverOpen(false);
                                                                }} 
                                                            />
                                                        </div>
                                                    </div>
                                                </PopoverContent>`;

const dTimeInReplacement = `<PopoverContent className="w-[230px] p-3 rounded-2xl border border-border/50 shadow-xl bg-card/98 backdrop-blur-xl" side="bottom" align="center" sideOffset={8}>
                                                    <TimeSpinner 
                                                        initialTimeStr={timeIn}
                                                        onConfirm={(timeStr) => {
                                                            handleTimeInChange(timeStr);
                                                            setIsTimePopoverOpen(false);
                                                        }} 
                                                    />
                                                </PopoverContent>`;

const dTimeOutTarget = `<PopoverContent className="w-[300px] p-0 rounded-3xl overflow-hidden border border-border/70 shadow-2xl bg-card/95 backdrop-blur-xl" side="bottom" align="center" sideOffset={10}>
                                                    <div className="flex flex-col items-center">
                                                        <div className="w-full pt-6 pb-3 text-center">
                                                            <span className="font-semibold tracking-tight text-foreground text-base">{language === 'es' ? 'Seleccionar hora' : 'Select Time'}</span>
                                                            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">{language === 'es' ? 'Fin del encuentro' : 'Encounter End'}</div>
                                                        </div>
                                                        <div className="px-6 pb-6 w-full">
                                                            <TimeSpinner 
                                                                initialTimeStr={timeOut}
                                                                onConfirm={(timeStr) => {
                                                                    handleTimeOutChange(timeStr);
                                                                    setIsTimeOutPopoverOpen(false);
                                                                }} 
                                                            />
                                                        </div>
                                                    </div>
                                                </PopoverContent>`;

const dTimeOutReplacement = `<PopoverContent className="w-[230px] p-3 rounded-2xl border border-border/50 shadow-xl bg-card/98 backdrop-blur-xl" side="bottom" align="center" sideOffset={8}>
                                                    <TimeSpinner 
                                                        initialTimeStr={timeOut}
                                                        onConfirm={(timeStr) => {
                                                            handleTimeOutChange(timeStr);
                                                            setIsTimeOutPopoverOpen(false);
                                                        }} 
                                                    />
                                                </PopoverContent>`;

const mTimeInTarget = `<PopoverContent className="w-[280px] p-0 rounded-[2.5rem] overflow-hidden border-0 shadow-2xl bg-white dark:bg-slate-900" side="bottom" align="center" sideOffset={12}>
                                                    <div className="flex flex-col items-center">
                                                        <div className="w-full pt-8 pb-4 text-center">
                                                            <span className="font-semibold tracking-tight text-slate-800 dark:text-slate-100 text-base">{language === 'es' ? 'Hora de inicio' : 'Start Time'}</span>
                                                        </div>
                                                        <div className="px-6 pb-6 w-full">
                                                            <TimeSpinner 
                                                                initialTimeStr={timeIn}
                                                                onConfirm={(timeStr) => {
                                                                    handleTimeInChange(timeStr);
                                                                    setIsMobileTimeOpen(false);
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </PopoverContent>`;

const mTimeInReplacement = `<PopoverContent className="w-[230px] p-3 rounded-2xl border border-border/50 shadow-xl bg-card/98 backdrop-blur-xl" side="bottom" align="center" sideOffset={8}>
                                                    <TimeSpinner 
                                                        initialTimeStr={timeIn}
                                                        onConfirm={(timeStr) => {
                                                            handleTimeInChange(timeStr);
                                                            setIsMobileTimeOpen(false);
                                                        }}
                                                    />
                                                </PopoverContent>`;

const mTimeOutTarget = `<PopoverContent className="w-[280px] p-0 rounded-[2.5rem] overflow-hidden border-0 shadow-2xl bg-white dark:bg-slate-900" side="bottom" align="center" sideOffset={12}>
                                                    <div className="flex flex-col items-center">
                                                        <div className="w-full pt-8 pb-4 text-center">
                                                            <span className="font-semibold tracking-tight text-slate-800 dark:text-slate-100 text-base">{language === 'es' ? 'Hora de fin' : 'End Time'}</span>
                                                        </div>
                                                        <div className="px-6 pb-6 w-full">
                                                            <TimeSpinner 
                                                                initialTimeStr={timeOut}
                                                                onConfirm={(timeStr) => {
                                                                    handleTimeOutChange(timeStr);
                                                                    setIsMobileTimeOutOpen(false);
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </PopoverContent>`;

const mTimeOutReplacement = `<PopoverContent className="w-[230px] p-3 rounded-2xl border border-border/50 shadow-xl bg-card/98 backdrop-blur-xl" side="bottom" align="center" sideOffset={8}>
                                                    <TimeSpinner 
                                                        initialTimeStr={timeOut}
                                                        onConfirm={(timeStr) => {
                                                            handleTimeOutChange(timeStr);
                                                            setIsMobileTimeOutOpen(false);
                                                        }}
                                                    />
                                                </PopoverContent>`;

code = code.replace(dTimeInTarget, dTimeInReplacement);
code = code.replace(dTimeOutTarget, dTimeOutReplacement);
code = code.replace(mTimeInTarget, mTimeInReplacement);
code = code.replace(mTimeOutTarget, mTimeOutReplacement);

fs.writeFileSync('src/notes-module/pages/Record.tsx', code, 'utf8');
console.log('Record.tsx replacement complete!');
