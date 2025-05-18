import React from 'react';
import { HeartPulse } from 'lucide-react';

interface Step2QueixaProps {
  formData: { queixaPrincipal: string };
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

const Step2Queixa: React.FC<Step2QueixaProps> = ({ formData, onChange }) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center text-center">
        <HeartPulse className="w-16 h-16 text-emerald-600 mb-4" />
        <h2 className="text-2xl font-semibold text-gray-700">Qual sua queixa principal?</h2>
        <p className="text-gray-500 mt-1">Descreva o principal motivo da sua consulta.</p>
      </div>
      <textarea
        name="queixaPrincipal"
        value={formData.queixaPrincipal}
        onChange={onChange}
        placeholder="Descreva seus sintomas..."
        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors min-h-[120px] resize-none"
        rows={4}
        required
      />
    </div>
  );
};

export default Step2Queixa; 