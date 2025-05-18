'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  responseName: string;
  isLoading: boolean;
}

export default function DeleteConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  responseName,
  isLoading 
}: DeleteConfirmationModalProps) {

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent className="bg-gradient-to-br from-[#F5F7FA] to-[#E0EAF2] dark:bg-slate-900 rounded-xl shadow-xl p-0 sm:max-w-md max-h-[90vh] sm:max-h-[85vh] flex flex-col">
        <DialogHeader className="text-center p-6 sm:p-8 pb-4 sm:pb-6 border-b border-slate-300 dark:border-slate-700 flex-shrink-0">
          <div className="flex items-center justify-center mb-2">
            <AlertTriangle className="h-6 w-6 mr-2 text-red-600 dark:text-red-400" />
            <DialogTitle className="font-montserrat text-xl font-semibold text-slate-700 dark:text-slate-100 tracking-tight">
              Confirmar Exclusão
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-slate-600 dark:text-slate-400 tracking-wide mx-auto max-w-xs sm:max-w-sm">
            Tem certeza que deseja excluir permanentemente a resposta de <span className="font-semibold text-slate-700 dark:text-slate-200">{responseName}</span>? Esta ação não poderá ser desfeita.
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter className="flex flex-col sm:flex-row sm:justify-end items-center p-6 sm:p-8 pt-6 sm:pt-6 border-t border-slate-300 dark:border-slate-700 flex-shrink-0">
          <div className="flex flex-col sm:flex-row w-full sm:w-auto space-y-3 sm:space-y-0 sm:space-x-3">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto text-sm tracking-wide font-medium text-slate-600 dark:text-slate-300 border-slate-400 dark:border-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 focus-visible:ring-slate-400 dark:focus-visible:ring-slate-500"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancelar
              </Button>
            </DialogClose>
            <Button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white text-sm tracking-wide font-semibold shadow-md hover:shadow-lg transition-all duration-150 ease-in-out"
            >
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin flex-shrink-0" /> Excluindo...</>
              ) : (
                <><Trash2 className="mr-2 h-4 w-4 flex-shrink-0" /> Excluir</>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 