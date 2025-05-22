'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { UserCircle2, Edit3, ShieldCheck, Camera, Mail, User, Loader2, Save, X, Eye, EyeOff, Package, CreditCard } from 'lucide-react';
import Image from 'next/image';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';

interface UserMetadata {
  full_name?: string;
  avatar_url?: string;
  // Adicione outros campos de metadados aqui, se houver
}

export default function ConfiguracoesPage() {
  const { user, supabase, refreshUser } = useAuth();
  const { subscription, loading: loadingSubscription, error: subscriptionError } = useSubscriptionStatus();
  
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
        <h1 className="text-3xl font-bold tracking-tight text-[#25392C] dark:text-slate-100 sm:text-4xl">
          Configurações da Conta
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Gerencie suas informações de perfil e configurações de segurança.
        </p>
      </header>

      {/* Profile Information Card */}
      <section aria-labelledby="profile-info-heading" className="bg-white dark:bg-slate-800 shadow-xl rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
        <div className="p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <h2 id="profile-info-heading" className="text-xl font-semibold text-[#25392C] dark:text-slate-200 flex items-center">
              <UserCircle2 className="w-7 h-7 mr-3 text-[#00A651]" />
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
                <div className="flex space-x-3 w-full">
                  <Button onClick={handlePhotoUpload} disabled={loadingPhoto} className="flex-1 bg-[#00A651] hover:bg-[#008f48] text-white">
                    {loadingPhoto ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Salvar Foto
                  </Button>
                  <Button variant="outline" onClick={() => { setProfilePhotoFile(null); setPhotoPreview(null); }} disabled={loadingPhoto} className="text-[#25392C] border-[#25392C]/70 hover:bg-[#C4E8C9]/30 dark:text-slate-300 dark:border-slate-500 dark:hover:bg-slate-700">
                    <X className="mr-2 h-4 w-4" /> Cancelar
                  </Button>
                </div>
              )}
            </div>

            {/* Name and Email Section */}
            <div className="md:col-span-2 space-y-6">
              {/* Full Name */}
              <div>
                <Label htmlFor="fullName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome Completo</Label>
                {isEditingName ? (
                  <form onSubmit={handleNameChangeSubmit} className="flex items-center space-x-2">
                    <Input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="block w-full rounded-md border-slate-300 bg-white dark:border-slate-600 shadow-sm focus:border-[#00A651] focus:ring-[#00A651]/50 dark:focus:border-[#00A651] dark:focus:ring-[#00A651]/50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 sm:text-sm placeholder-slate-400 dark:placeholder-slate-500"
                      placeholder="Seu nome completo"
                    />
                    <Button type="submit" disabled={loadingName} className="bg-[#00A651] hover:bg-[#008f48] text-white p-2">
                      {loadingName ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                    </Button>
                    <Button type="button" variant="outline" onClick={handleCancelEditName} disabled={loadingName} className="text-[#25392C] border-[#25392C]/70 hover:bg-[#C4E8C9]/30 dark:text-slate-300 dark:border-slate-500 dark:hover:bg-slate-700 p-2">
                      <X className="h-5 w-5" />
                    </Button>
                  </form>
                ) : (
                  <div className="flex items-center justify-between p-3 rounded-md bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600/70">
                    <p className="text-sm text-slate-900 dark:text-slate-100">{fullName}</p>
                    <button onClick={handleEditName} className="p-1.5 text-slate-500 hover:text-[#00A651] dark:text-slate-400 dark:hover:text-[#00A651] rounded-md focus:outline-none focus:ring-2 focus:ring-[#00A651]/50">
                      <Edit3 className="w-4 h-4" />
                      <span className="sr-only">Editar nome</span>
                    </button>
                  </div>
                )}
              </div>
              {/* Email */}
              <div>
                <Label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    readOnly
                    disabled
                    className="block w-full rounded-md border-slate-300 dark:border-slate-600 shadow-sm bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 sm:text-sm placeholder-slate-400 dark:placeholder-slate-500 cursor-not-allowed pl-10"
                  />
                   <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-500" />
                </div>
                
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Change Password Card */}
      <section aria-labelledby="password-heading" className="bg-white dark:bg-slate-800 shadow-xl rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
        <div className="p-6 sm:p-8">
          <h2 id="password-heading" className="text-xl font-semibold text-[#25392C] dark:text-slate-200 flex items-center">
            <ShieldCheck className="w-7 h-7 mr-3 text-[#00A651]" />
            Alterar Senha
          </h2>
          <form onSubmit={handlePasswordChange} className="mt-6 space-y-6">
            <div className="space-y-1">
              <Label htmlFor="newPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nova Senha</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="block w-full rounded-md border-slate-300 bg-white dark:border-slate-600 shadow-sm focus:border-[#00A651] focus:ring-[#00A651]/50 dark:focus:border-[#00A651] dark:focus:ring-[#00A651]/50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 sm:text-sm placeholder-slate-400 dark:placeholder-slate-500 pr-10"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm text-slate-500 hover:text-[#00A651] dark:text-slate-400 dark:hover:text-[#00A651]">
                  {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Confirmar Nova Senha</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full rounded-md border-slate-300 bg-white dark:border-slate-600 shadow-sm focus:border-[#00A651] focus:ring-[#00A651]/50 dark:focus:border-[#00A651] dark:focus:ring-[#00A651]/50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 sm:text-sm placeholder-slate-400 dark:placeholder-slate-500 pr-10"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm text-slate-500 hover:text-[#00A651] dark:text-slate-400 dark:hover:text-[#00A651]">
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            <Button type="submit" disabled={loadingPassword} className="w-full sm:w-auto bg-[#00A651] hover:bg-[#008f48] text-white">
              {loadingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4"/>}
              Salvar Nova Senha
            </Button>
          </form>
        </div>
      </section>

      {/* Subscription Status Card */}
      <section aria-labelledby="subscription-info-heading" className="bg-white dark:bg-slate-800 shadow-xl rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
        <div className="p-7 sm:p-9">
          <div className="flex items-center justify-between">
            <h2 id="subscription-info-heading" className="text-xl font-semibold text-[#25392C] dark:text-slate-200 flex items-center">
              <CreditCard className="w-7 h-7 mr-3 text-[#00A651]" />
              Status da Assinatura
            </h2>
          </div>

          <div className="mt-6 text-slate-700 dark:text-slate-300 space-y-4">
            {loadingSubscription && <p>Carregando status da assinatura...</p>}
            {subscriptionError && <p className="text-red-500">Erro ao carregar status da assinatura: {subscriptionError}</p>}
            {subscription && (
              <>
                <p className="text-base">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Plano Atual:</span>{' '}
                  <span className="font-semibold text-[#25392C] dark:text-slate-100 capitalize">{subscription.tipo_plano.replace('_', ' ')}</span>
                </p>
                
                <p className="text-base flex items-center">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Status:</span>{' '}
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-semibold ${subscription.status_assinatura === 'ativo' ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' : subscription.status_assinatura === 'trial' ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100' : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'}`}>
                     <svg className={`-ml-0.5 mr-1.5 h-2 w-2 ${subscription.status_assinatura === 'ativo' ? 'text-green-500 dark:text-green-300' : subscription.status_assinatura === 'trial' ? 'text-blue-500 dark:text-blue-300' : 'text-red-500 dark:text-red-300'}`} fill="currentColor" viewBox="0 0 8 8">
                      <circle cx={4} cy={4} r={3} />
                    </svg>
                    {subscription.status_assinatura}
                  </span>
                </p>
                
                {subscription.status_assinatura === 'trial' && subscription.data_expiracao_acesso && (
                  <p className="text-base">
                     <span className="font-medium text-slate-700 dark:text-slate-300">Dias restantes no Trial:</span>{' '}
                    <span className="font-semibold text-[#25392C] dark:text-slate-100">{Math.max(0, Math.ceil((new Date(subscription.data_expiracao_acesso).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} dias</span>
                  </p>
                )}

                {subscription.status_assinatura === 'ativo' && subscription.data_expiracao_acesso && (
                   <p className="text-base">
                     <span className="font-medium text-slate-700 dark:text-slate-300">Próxima cobrança em:</span>{' '}
                     <span className="font-semibold text-[#25392C] dark:text-slate-100">{new Date(subscription.data_expiracao_acesso).toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                   </p>
                )}

                {subscription.status_assinatura === 'trial' && (
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Seu período de teste gratuito está ativo. Aproveite para explorar todas as funcionalidades!</p>
                 )}
                 {subscription.status_assinatura === 'ativo' && (
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Sua assinatura está ativa e pronta para uso.</p>
                 )}
                 {subscription.status_assinatura !== 'trial' && subscription.status_assinatura !== 'ativo' && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400">Sua assinatura não está ativa. Algumas funcionalidades podem estar limitadas.</p>
                 )}
              </>
            )}
             {!loadingSubscription && !subscription && !subscriptionError && (
               <p className="text-orange-500">Dados de assinatura não encontrados. Entre em contato com o suporte.</p>
             )}
          </div>
        </div>
      </section>

      {/* Support Contact Card */}
      <section aria-labelledby="support-heading" className="bg-white dark:bg-slate-800 shadow-xl rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
        <div className="p-7 sm:p-9">
          <div className="flex items-center justify-between">
            <h2 id="support-heading" className="text-xl font-semibold text-[#25392C] dark:text-slate-200 flex items-center">
              {/* Using Mail icon for support */}
              <Mail className="w-7 h-7 mr-3 text-[#00A651]" />
              Suporte
            </h2>
          </div>

          <div className="mt-6 text-slate-700 dark:text-slate-300 space-y-3">
            <p className="text-base">
              <span className="font-medium">Precisa de ajuda? Entre em contato conosco:</span>
            </p>
            <p className="text-base flex items-center">
               <a href="mailto:contato@preclinconecta.com" className="text-[#00A651] hover:underline dark:text-[#00A651]">contato@preclinconecta.com</a>
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Nossa equipe de suporte está pronta para ajudar com quaisquer dúvidas ou problemas que você possa ter.
            </p>
          </div>
        </div>
      </section>

      {/* Delete Account Card - Assuming this exists or will exist */}
      {/* <section aria-labelledby="delete-account-heading" className="bg-white dark:bg-slate-800 shadow-xl rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
// ... existing code ...
      </section> */}

    </div>
  );
} 