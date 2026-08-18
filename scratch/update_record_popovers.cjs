const fs = require('fs');
let code = fs.readFileSync('src/notes-module/pages/Record.tsx', 'utf8');

const regexDesktop = /<PopoverContent className="w-\[300px\] p-0 rounded-3xl overflow-hidden border border-border\/70 shadow-2xl bg-card\/95 backdrop-blur-xl" side="bottom" align="center" sideOffset=\{10\}>[\s\S]*?<TimeSpinner\s+initialTimeStr=\{(\w+)\}[\s\S]*?<\/PopoverContent>/g;

code = code.replace(regexDesktop, (match, varName) => {
    const fnName = varName === 'timeIn' ? 'handleTimeInChange' : 'handleTimeOutChange';
    const popVar = varName === 'timeIn' ? 'setIsTimePopoverOpen' : 'setIsTimeOutPopoverOpen';
    return `<PopoverContent className="w-[230px] p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xl bg-white/98 dark:bg-slate-900/98 backdrop-blur-xl" side="bottom" align="center" sideOffset={8}>
                                                    <TimeSpinner 
                                                        initialTimeStr={${varName}}
                                                        onConfirm={(timeStr) => {
                                                            ${fnName}(timeStr);
                                                            ${popVar}(false);
                                                        }} 
                                                    />
                                                </PopoverContent>`;
});

const regexMobile = /<PopoverContent className="w-\[280px\] p-0 rounded-\[2\.5rem\] overflow-hidden border-0 shadow-2xl bg-white dark:bg-slate-900" side="bottom" align="center" sideOffset=\{12\}>[\s\S]*?<TimeSpinner\s+initialTimeStr=\{(\w+)\}[\s\S]*?<\/PopoverContent>/g;

code = code.replace(regexMobile, (match, varName) => {
    const fnName = varName === 'timeIn' ? 'handleTimeInChange' : 'handleTimeOutChange';
    const popVar = varName === 'timeIn' ? 'setIsMobileTimeOpen' : 'setIsMobileTimeOutOpen';
    return `<PopoverContent className="w-[230px] p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xl bg-white/98 dark:bg-slate-900/98 backdrop-blur-xl" side="bottom" align="center" sideOffset={8}>
                                                    <TimeSpinner 
                                                        initialTimeStr={${varName}}
                                                        onConfirm={(timeStr) => {
                                                            ${fnName}(timeStr);
                                                            ${popVar}(false);
                                                        }} 
                                                    />
                                                </PopoverContent>`;
});

fs.writeFileSync('src/notes-module/pages/Record.tsx', code, 'utf8');
console.log('Record.tsx regex replacement SUCCESS');
