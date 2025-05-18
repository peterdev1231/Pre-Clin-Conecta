'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { UserCircle2, Edit3, ShieldCheck, Camera, Mail, User, Loader2, Save, X, Eye, EyeOff } from 'lucide-react';
import Image from 'next/image';

interface UserMetadata {
  full_name?: string;
  avatar_url?: string;
  // Adicione outros campos de metadados aqui, se houver
}

export default function ConfiguracoesPage() {
  const { user, supabase, refreshUser } = useAuth();
  
  // Profile Info State
  const [fullName, setFullName] = useState('');
  const [originalFullName, setOriginalFullName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  
  // Password Change State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Loading States
  const [loadingName, setLoadingName] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [loadingPhoto, setLoadingPhoto] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      const metadata = user.user_metadata as UserMetadata;
      setFullName(metadata?.full_name || 'Nome não definido');
      setOriginalFullName(metadata?.full_name || 'Nome não definido');
      setEmail(user.email || 'Email não disponível');
      setAvatarUrl(metadata?.avatar_url || null);
    }
  }, [user]);

  const handleEditName = () => {
    setOriginalFullName(fullName); // Store current name in case of cancel
    setIsEditingName(true);
  };

  const handleCancelEditName = () => {
    setFullName(originalFullName); // Restore original name
    setIsEditingName(false);
  };

  const handleNameChangeSubmit = async (e?: FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (!user || !supabase) return;
    if (fullName.trim() === '') {
      toast.error('O nome não pode estar vazio.');
      return;
    }
    setLoadingName(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName.trim() },
      });
      if (error) throw error;
      toast.success('Nome atualizado com sucesso!');
      setIsEditingName(false);
      await refreshUser(); 
    } catch (error: any) {
      toast.error('Erro ao atualizar nome: ' + error.message);
      setFullName(originalFullName); // Revert to original on error
    } finally {
      setLoadingName(false);
    }
  };

  const handlePasswordChange = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !supabase) return;
    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem.');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    setLoadingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Senha alterada com sucesso!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast.error('Erro ao alterar senha: ' + error.message);
    } finally {
      setLoadingPassword(false);
    }
  };

  const handlePhotoSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const maxFileSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxFileSize) {
        toast.error('O arquivo é muito grande. Máximo de 5MB.');
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)){
        toast.error('Formato de arquivo inválido. Apenas JPG, PNG, WEBP são permitidos.');
        return;
      }
      setProfilePhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoUpload = async () => {
    if (!profilePhotoFile || !user || !supabase) return;
    setLoadingPhoto(true);
    try {
      const originalName = profilePhotoFile.name;
      const fileExtension = originalName.slice(originalName.lastIndexOf('.'));
      const baseName = originalName.slice(0, originalName.lastIndexOf('.'));
      const sanitizedBaseName = baseName
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_.-]/g, '');
      const maxLength = 50;
      const truncatedBaseName = sanitizedBaseName.substring(0, maxLength);
      const sanitizedFileName = truncatedBaseName + fileExtension;
      const filePath = `${user.id}/${Date.now()}_${sanitizedFileName}`;
      
      if (avatarUrl) {
        try {
            const urlParts = new URL(avatarUrl).pathname.split('/avataresmedico/');
            if (urlParts.length > 1) {
                const oldFilePath = decodeURIComponent(urlParts[1]);
                await supabase.storage.from('avataresmedico').remove([oldFilePath]);
            }
        } catch (e) {
            console.warn('Could not parse or delete old avatar URL:', e)
        }
      }

      const { error: uploadError } = await supabase.storage
        .from('avataresmedico')
        .upload(filePath, profilePhotoFile, {
          cacheControl: '3600',
          upsert: false, // false because we are generating a unique name
        });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('avataresmedico')
        .getPublicUrl(filePath);
      if (!publicUrlData || !publicUrlData.publicUrl) {
        throw new Error('Não foi possível obter a URL pública da imagem.');
      }
      
      const newAvatarUrl = publicUrlData.publicUrl;
      const { error: updateUserError } = await supabase.auth.updateUser({
        data: { avatar_url: newAvatarUrl },
      });
      if (updateUserError) throw updateUserError;

      setAvatarUrl(newAvatarUrl);
      toast.success('Foto de perfil atualizada!');
      setProfilePhotoFile(null);
      setPhotoPreview(null);
      await refreshUser();
    } catch (error: any) {
      toast.error('Erro ao enviar foto: ' + error.message);
    } finally {
      setLoadingPhoto(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Carregando informações do usuário...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-10">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100 sm:text-4xl">
          Configurações da Conta
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Gerencie suas informações de perfil e configurações de segurança.
        </p>
      </header>

      {/* Profile Information Card */}
      <section aria-labelledby="profile-info-heading" className="bg-white dark:bg-slate-800 shadow-xl rounded-xl overflow-hidden">
        <div className="p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <h2 id="profile-info-heading" className="text-xl font-semibold text-slate-700 dark:text-slate-200 flex items-center">
              <UserCircle2 className="w-7 h-7 mr-3 text-teal-500" />
              Informações do Perfil
            </h2>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-8">
            {/* Avatar Section */}
            <div className="md:col-span-1 flex flex-col items-center space-y-4">
              <div className="relative group w-32 h-32">
                {photoPreview || avatarUrl ? (
                  <Image 
                    src={photoPreview || avatarUrl!} 
                    alt="Foto de Perfil" 
                    width={128} 
                    height={128} 
                    className="w-full h-full rounded-full object-cover border-2 border-slate-300 dark:border-slate-600 group-hover:opacity-80 transition-opacity duration-200"
                  />
                ) : (
                  <div className="w-full h-full rounded-full border-2 border-slate-300 dark:border-slate-600 flex items-center justify-center bg-slate-100 dark:bg-slate-700">
                    <UserCircle2 className="w-24 h-24 text-slate-400 dark:text-slate-500" />
                  </div>
                )}
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 w-full h-full bg-black bg-opacity-0 group-hover:bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 ease-in-out cursor-pointer"
                  aria-label="Alterar foto de perfil"
                >
                  <Camera className="w-8 h-8 text-white" />
                </button>
                <input type="file" ref={fileInputRef} onChange={handlePhotoSelect} accept="image/jpeg, image/png, image/webp" className="hidden" />
              </div>
              {photoPreview && profilePhotoFile && (
                <div className="flex flex-col items-center space-y-2 w-full">
                    <Button onClick={handlePhotoUpload} disabled={loadingPhoto} className="w-full bg-teal-600 hover:bg-teal-700">
                    {loadingPhoto ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} 
                    Salvar Nova Foto
                    </Button>
                    <Button variant="ghost" onClick={() => { setPhotoPreview(null); setProfilePhotoFile(null); if(fileInputRef.current) fileInputRef.current.value = ''; }} disabled={loadingPhoto} className="w-full text-slate-600 dark:text-slate-400">
                        Cancelar
                    </Button>
                </div>
              )}
            </div>

            {/* Name and Email Section */}
            <div className="md:col-span-2 space-y-6">
              <div>
                <Label htmlFor="fullName" className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center mb-1">
                  <User className="w-4 h-4 mr-2 text-slate-500 dark:text-slate-400" /> Nome Completo
                </Label>
                {isEditingName ? (
                  <form onSubmit={handleNameChangeSubmit} className="flex items-center gap-2">
                    <Input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="flex-grow bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                      autoFocus
                    />
                    <Button type="submit" size="icon" variant="ghost" className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-500 dark:hover:text-emerald-400" disabled={loadingName} aria-label="Salvar nome">
                      {loadingName ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                    </Button>
                    <Button type="button" size="icon" variant="ghost" onClick={handleCancelEditName} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200" disabled={loadingName} aria-label="Cancelar edição do nome">
                      <X className="h-5 w-5" />
                    </Button>
                  </form>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-700/50 rounded-lg min-h-[40px]">
                    <span className="text-slate-800 dark:text-slate-100">{fullName}</span>
                    <Button onClick={handleEditName} size="icon" variant="ghost" className="text-slate-500 hover:text-teal-600 dark:text-slate-400 dark:hover:text-teal-500" aria-label="Editar nome">
                      <Edit3 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center mb-1">
                  <Mail className="w-4 h-4 mr-2 text-slate-500 dark:text-slate-400" /> Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  readOnly
                  className="bg-slate-100 dark:bg-slate-700/50 border-slate-300 dark:border-slate-600 cursor-not-allowed"
                />
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                  O email não pode ser alterado através desta página.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Change Password Card */}
      <section aria-labelledby="password-change-heading" className="bg-white dark:bg-slate-800 shadow-xl rounded-xl overflow-hidden">
        <div className="p-6 sm:p-8">
          <h2 id="password-change-heading" className="text-xl font-semibold text-slate-700 dark:text-slate-200 flex items-center">
            <ShieldCheck className="w-7 h-7 mr-3 text-teal-500" />
            Alterar Senha
          </h2>
          <form onSubmit={handlePasswordChange} className="mt-6 space-y-6">
            <div>
              <Label htmlFor="newPassword">Nova Senha (mínimo 6 caracteres)</Label>
              <div className="relative mt-1">
                <Input 
                  id="newPassword" 
                  type={showNewPassword ? "text" : "password"} 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 pr-10"
                  placeholder="••••••••"
                />
                <Button 
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-teal-600 dark:text-slate-400 dark:hover:text-teal-500"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  aria-label={showNewPassword ? "Esconder senha" : "Mostrar senha"}
                >
                  {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
              <div className="relative mt-1">
                <Input 
                  id="confirmPassword" 
                  type={showConfirmPassword ? "text" : "password"} 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 pr-10"
                  placeholder="••••••••"
                />
                <Button 
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-teal-600 dark:text-slate-400 dark:hover:text-teal-500"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? "Esconder senha" : "Mostrar senha"}
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </Button>
              </div>
            </div>
            <Button type="submit" className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 flex items-center justify-center" disabled={loadingPassword}>
              {loadingPassword ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Alterando...</>
              ) : 'Alterar Senha'}
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
} 