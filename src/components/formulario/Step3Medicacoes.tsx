import React from 'react';
import { Pill } from 'lucide-react';

interface Step3MedicacoesProps {
  formData: { medicacoesEmUso: string };
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

const Step3Medicacoes: React.FC<Step3MedicacoesProps> = ({ formData, onChange }) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center text-center">
        <Pill className="w-16 h-16 text-emerald-600 mb-4" />
        <h2 className="text-2xl font-semibold text-gray-700">Quais medicações você usa?</h2>
        <p className="text-gray-500 mt-1">Liste todas as medicações que você está tomando atualmente. Se nenhuma, deixe em branco.</p>
      </div>
      <textarea
        name="medicacoesEmUso"
        value={formData.medicacoesEmUso}
        onChange={onChange}
        placeholder="Ex: Losartana 50mg, AAS 100mg..."
        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors min-h-[120px] resize-none"
        rows={4}
      />
    </div>
  );
};

export default Step3Medicacoes; 