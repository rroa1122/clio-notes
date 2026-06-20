
import * as React from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { AlertCircle } from "lucide-react";

interface ConfirmModalProps {
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    title?: string;
    body?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: "default" | "destructive";
}

export function ConfirmModal({
    isOpen,
    onConfirm,
    onCancel,
    title = "Unsaved changes",
    body = "You have unsaved changes. Leave without saving?",
    confirmLabel = "Leave / Discard",
    cancelLabel = "Cancel",
    variant = "destructive",
}: ConfirmModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
            <DialogContent className="sm:max-w-[442px] p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
                <DialogHeader className="px-8 pt-8 pb-4 bg-white">
                    <div className="flex items-center gap-4">
                        <div className={`size-10 rounded-xl flex items-center justify-center ${variant === 'destructive' ? 'bg-red-50 text-red-500' : 'bg-primary/10 text-primary'}`}>
                            <AlertCircle size={22} />
                        </div>
                        <div className="space-y-1">
                            <DialogTitle className="text-xl font-bold tracking-tight text-slate-900">
                                {title}
                            </DialogTitle>
                        </div>
                    </div>
                </DialogHeader>

                <div className="px-8 pb-8 bg-white">
                    <DialogDescription className="text-slate-500 font-medium leading-relaxed">
                        {body}
                    </DialogDescription>
                </div>

                <DialogFooter className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex flex-row items-center justify-end gap-3">
                    <Button
                        variant="ghost"
                        onClick={onCancel}
                        className="h-11 px-6 rounded-xl font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-200/50 transition-all shadow-none"
                    >
                        {cancelLabel}
                    </Button>
                    <Button
                        variant={variant === "destructive" ? "destructive" : "default"}
                        onClick={onConfirm}
                        className={`h-11 px-8 rounded-xl font-bold transition-all shadow-md ${variant === 'destructive' ? 'shadow-red-200' : 'shadow-primary/20'}`}
                    >
                        {confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
