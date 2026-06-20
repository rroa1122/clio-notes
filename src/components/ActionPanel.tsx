import { Check, Flag, MessageSquare, UserPlus } from 'lucide-react';

export function ActionPanel() {
    return (
        <div className="card">
            <h3 className="font-semibold text-lg mb-4">Actions</h3>
            <div className="grid grid-cols-2 gap-3">
                <button className="btn btn-primary w-full gap-2 justify-center">
                    <Check size={16} />
                    Resolve
                </button>
                <button className="btn btn-outline w-full gap-2 justify-center">
                    <Flag size={16} />
                    Flag
                </button>
                <button className="btn btn-outline w-full gap-2 justify-center">
                    <MessageSquare size={16} />
                    Callback
                </button>
                <button className="btn btn-outline w-full gap-2 justify-center">
                    <UserPlus size={16} />
                    Assign
                </button>
            </div>

            <div className="mt-6">
                <label className="text-xs font-medium text-[var(--color-text-muted)] mb-2 block">Internal Notes</label>
                <textarea
                    className="w-full p-3 text-sm border border-[var(--color-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] min-h-[100px]"
                    placeholder="Add a note for your team..."
                ></textarea>
                <button className="btn btn-ghost text-xs mt-2 w-full">Save Note</button>
            </div>
        </div>
    );
}
