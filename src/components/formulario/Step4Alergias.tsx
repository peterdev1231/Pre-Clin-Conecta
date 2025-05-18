import React from 'react';
import { ShieldAlert } from 'lucide-react';

interface Step4AlergiasProps {
  formData: { 
    alergiasConhecidas: string;
    naoPossuiAlergias?: boolean;
  };
  onChange: (name: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

const Step4Alergias: React.FC<Step4AlergiasProps> = ({ formData, onChange }) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center text-center">
        <ShieldAlert className="w-16 h-16 text-emerald-600 mb-4" />
        <h2 className="text-2xl font-semibold text-gray-700">Você possui alergias conhecidas?</h2>
        <p className="text-gray-500 mt-1">Liste suas alergias (medicamentos, alimentos, etc.).</p>
      </div>

      <div className="space-y-4">
        <textarea
          name="alergiasConhecidas"
          value={formData.alergiasConhecidas}
          onChange={onChange('alergiasConhecidas')}
          placeholder="Ex: Dipirona, Camarão..."
          className={`w-full p-3 border border-gray-300 rounded-lg focus:ring-2 outline-none transition-colors min-h-[100px] resize-none ${formData.naoPossuiAlergias ? 'bg-gray-100 cursor-not-allowed focus:border-gray-300' : 'focus:ring-emerald-500 focus:border-emerald-500'}`}
          rows={3}
          disabled={formData.naoPossuiAlergias}
        />
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="naoPossuiAlergias"
            name="naoPossuiAlergias"
            checked={!!formData.naoPossuiAlergias} // Garante que seja boolean
            onChange={onChange('naoPossuiAlergias')}
            className="h-4 w-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
          />
          <label htmlFor="naoPossuiAlergias" className="text-sm text-gray-700">
            Não possuo alergias conhecidas
          </label>
        </div>
      </div>
    </div>
  );
};

export default Step4Alergias; 