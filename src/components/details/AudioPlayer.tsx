import React from 'react';
import { Play, SkipBack, SkipForward, Volume2 } from 'lucide-react';

export const AudioPlayer: React.FC = () => {
    return (
        <div className="card mb-6">
            <div className="flex items-center gap-4 mb-2">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white cursor-pointer hover:bg-primary-dark transition-colors">
                    <Play size={20} fill="currentColor" />
                </div>
                <div className="flex-1">
                    <div className="h-1 bg-gray-200 rounded-full w-full relative">
                        <div className="absolute left-0 top-0 h-full w-1/3 bg-primary rounded-full"></div>
                        <div className="absolute left-1/3 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-primary rounded-full shadow-sm cursor-pointer"></div>
                    </div>
                    <div className="flex justify-between text-xs text-secondary mt-1">
                        <span>0:45</span>
                        <span>2:15</span>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-secondary">
                    <Volume2 size={18} />
                    <div className="w-20 h-1 bg-gray-200 rounded-full">
                        <div className="h-full w-3/4 bg-gray-400 rounded-full"></div>
                    </div>
                </div>
            </div>
            <div className="flex justify-center gap-4 text-secondary">
                <button className="hover:text-primary"><SkipBack size={20} /></button>
                <button className="hover:text-primary"><SkipForward size={20} /></button>
            </div>
        </div>
    );
};
