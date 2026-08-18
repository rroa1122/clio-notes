const fs = require('fs');
let code = fs.readFileSync('src/notes-module/components/AgendaWeeklyBoard.tsx', 'utf8');

// Popover 1 (mobile empty)
const p1Target = `<PopoverContent className="w-[280px] p-0 rounded-[2rem] overflow-hidden border-0 shadow-[0_20px_70px_-10px_rgba(0,0,0,0.15)] bg-popover/80 backdrop-blur-xl" side="top" align="center" sideOffset={12}>
                            <div className="flex flex-col items-center">
                                <div className="w-full pt-6 pb-3 text-center">
                                    <span className="font-semibold tracking-tight text-slate-850 dark:text-slate-100 text-base">{language === 'es' ? "Seleccionar Hora" : "Select Time"}</span>
                                </div>
                                <div className="px-5 pb-5 w-full">
                                    <TimeSpinner 
                                        onConfirm={(timeStr) => {
                                            setOpenPopoverId(null);
                                            onNewNoteForDate(selectedDate, timeStr);
                                        }} 
                                    />
                                </div>
                                <div className="w-full pb-3 flex justify-center">
                                    <Button 
                                        variant="ghost" 
                                        className="text-slate-400 hover:text-slate-600 text-[10px] font-medium tracking-widest uppercase rounded-full h-8" 
                                        onClick={() => {
                                            setOpenPopoverId(null);
                                            onNewNoteForDate(selectedDate);
                                        }}
                                    >
                                       {language === 'es' ? "Omitir selección de hora" : "Skip Time Selection"}
                                    </Button>
                                </div>
                            </div>
                        </PopoverContent>`;

const p1Replacement = `<PopoverContent className="w-[230px] p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xl bg-white/98 dark:bg-slate-900/98 backdrop-blur-xl" side="top" align="center" sideOffset={8}>
                            <div className="flex flex-col items-center w-full">
                                <TimeSpinner 
                                    onConfirm={(timeStr) => {
                                        setOpenPopoverId(null);
                                        onNewNoteForDate(selectedDate, timeStr);
                                    }} 
                                />
                                <Button 
                                    variant="ghost" 
                                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-[10px] font-medium tracking-wider uppercase rounded-lg h-7 mt-1.5 w-full" 
                                    onClick={() => {
                                        setOpenPopoverId(null);
                                        onNewNoteForDate(selectedDate);
                                    }}
                                >
                                   {language === 'es' ? "Omitir hora" : "Skip time"}
                                </Button>
                            </div>
                        </PopoverContent>`;

// Popover 2 (mobile list)
const p2Target = `<PopoverContent className="w-[280px] p-0 rounded-[2rem] overflow-hidden border-0 shadow-[0_20px_70px_-10px_rgba(0,0,0,0.15)] bg-popover/80 backdrop-blur-xl" side="top" align="center" sideOffset={12}>
                                <div className="flex flex-col items-center">
                                    <div className="w-full pt-6 pb-3 text-center">
                                        <span className="font-semibold tracking-tight text-slate-850 dark:text-slate-100 text-base">{language === 'es' ? "Seleccionar Hora" : "Select Time"}</span>
                                    </div>
                                    <div className="px-5 pb-5 w-full">
                                        <TimeSpinner 
                                            onConfirm={(timeStr) => {
                                                setOpenPopoverId(null);
                                                onNewNoteForDate(selectedDate, timeStr);
                                            }} 
                                        />
                                    </div>
                                    <div className="w-full pb-3 flex justify-center">
                                        <Button 
                                            variant="ghost" 
                                            className="text-slate-400 hover:text-slate-650 text-[10px] font-medium tracking-widest uppercase rounded-full h-8" 
                                            onClick={() => {
                                                setOpenPopoverId(null);
                                                onNewNoteForDate(selectedDate);
                                            }}
                                        >
                                           {language === 'es' ? "Omitir selección de hora" : "Skip Time Selection"}
                                        </Button>
                                    </div>
                                </div>
                            </PopoverContent>`;

const p2Replacement = `<PopoverContent className="w-[230px] p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xl bg-white/98 dark:bg-slate-900/98 backdrop-blur-xl" side="top" align="center" sideOffset={8}>
                                <div className="flex flex-col items-center w-full">
                                    <TimeSpinner 
                                        onConfirm={(timeStr) => {
                                            setOpenPopoverId(null);
                                            onNewNoteForDate(selectedDate, timeStr);
                                        }} 
                                    />
                                    <Button 
                                        variant="ghost" 
                                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-[10px] font-medium tracking-wider uppercase rounded-lg h-7 mt-1.5 w-full" 
                                        onClick={() => {
                                            setOpenPopoverId(null);
                                            onNewNoteForDate(selectedDate);
                                        }}
                                    >
                                       {language === 'es' ? "Omitir hora" : "Skip time"}
                                    </Button>
                                </div>
                            </PopoverContent>`;

// Popover 3 (desktop column)
const p3Target = `<PopoverContent className="w-[300px] p-0 rounded-[2rem] overflow-hidden border-0 shadow-[0_20px_70px_-10px_rgba(0,0,0,0.15)] ring-1 ring-slate-900/5 dark:ring-white/5 bg-popover/70 backdrop-blur-xl" side="top" align="center" sideOffset={12}>
                                            <div className="flex flex-col items-center">
                                                <div className="w-full pt-8 pb-4 text-center">
                                                    <span className="font-medium tracking-tight text-slate-880 dark:text-slate-100 text-[18px]">{language === 'es' ? "Seleccionar Hora" : "Select Time"}</span>
                                                    <div className="text-[11px] font-medium text-slate-400 uppercase tracking-widest mt-1 opacity-80">{format(day, language === 'es' ? "d 'de' MMMM, yyyy" : 'MMMM d, yyyy', { locale: language === 'es' ? es : undefined })}</div>
                                                </div>
                                                
                                                <div className="px-6 pb-6 w-full">
                                                    <TimeSpinner 
                                                        onConfirm={(timeStr) => {
                                                            setOpenPopoverId(null);
                                                            onNewNoteForDate(day, timeStr);
                                                        }} 
                                                    />
                                                </div>
                                                
                                                <div className="w-full pb-4 flex justify-center">
                                                    <Button 
                                                        variant="ghost" 
                                                        className="text-slate-400 hover:text-slate-660 text-[10px] font-medium tracking-widest uppercase rounded-full h-8" 
                                                        onClick={() => {
                                                            setOpenPopoverId(null);
                                                            onNewNoteForDate(day);
                                                        }}
                                                    >
                                                       {language === 'es' ? "Omitir selección de hora" : "Skip Time Selection"}
                                                    </Button>
                                                </div>
                                            </div>
                                        </PopoverContent>`;

const p3Replacement = `<PopoverContent className="w-[230px] p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xl bg-white/98 dark:bg-slate-900/98 backdrop-blur-xl" side="top" align="center" sideOffset={8}>
                                            <div className="flex flex-col items-center w-full">
                                                <TimeSpinner 
                                                    onConfirm={(timeStr) => {
                                                        setOpenPopoverId(null);
                                                        onNewNoteForDate(day, timeStr);
                                                    }} 
                                                />
                                                <Button 
                                                    variant="ghost" 
                                                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-[10px] font-medium tracking-wider uppercase rounded-lg h-7 mt-1.5 w-full" 
                                                    onClick={() => {
                                                        setOpenPopoverId(null);
                                                        onNewNoteForDate(day);
                                                    }}
                                                >
                                                   {language === 'es' ? "Omitir hora" : "Skip time"}
                                                </Button>
                                            </div>
                                        </PopoverContent>`;

code = code.replace(p1Target, p1Replacement);
code = code.replace(p2Target, p2Replacement);
code = code.replace(p3Target, p3Replacement);

fs.writeFileSync('src/notes-module/components/AgendaWeeklyBoard.tsx', code, 'utf8');
console.log('AgendaWeeklyBoard.tsx popovers updated!');
