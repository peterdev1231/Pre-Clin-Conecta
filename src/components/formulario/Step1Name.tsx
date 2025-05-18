import React from 'react';
import { User } from 'lucide-react';

interface Step1NameProps {
  formData: { nomePaciente: string };
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const Step1Name: React.FC<Step1NameProps> = ({ formData, onChange }) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center text-center">
        <User className="w-16 h-16 text-emerald-600 mb-4" />
        <h2 className="text-2xl font-semibold text-gray-700">Qual o seu nome completo?</h2>
        <p className="text-gray-500 mt-1">Por favor, insira seu nome como consta em seus documentos.</p>
      </div>
      <input
        type="text"
        name="nomePaciente"
        value={formData.nomePaciente}
        onChange={onChange}
        placeholder="Digite seu nome completo"
        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors"
        required
      />
    </div>
  );
};

export default Step1Name; 