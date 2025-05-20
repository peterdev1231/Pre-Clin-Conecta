'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutGrid,
  MessageSquareText,
  Link2,
  BarChart3,
  Settings,
  LogOut,
  UserCircle2,
  X as XIcon, // Ícone para fechar o menu mobile
} from 'lucide-react';
import Image from 'next/image'; // Adicionando o import de Image de volta
import CustomLogoIcon from '../icons/CustomLogoIcon'; // Importar o novo ícone

// Define a type for MainContentView, mirroring DashboardLayout
type MainContentView = 'default' | 'statistics';

interface NavItem {
  href?: string; // href is now optional
  action?: () => void; // action for items that don't navigate directly
  icon: React.ElementType;
  label: string;
  view?: MainContentView; // To identify which view this item sets, or if it's a nav link
}

// Props para a Sidebar
interface SidebarProps {
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (isOpen: boolean) => void;
  onOpenGenerateLinkModal: () => void;
  setCurrentView: (view: MainContentView) => void;
  currentView: MainContentView;
}

export default function Sidebar({ 
  isMobileMenuOpen, 
  setIsMobileMenuOpen, 
  onOpenGenerateLinkModal, 
  setCurrentView, 
  currentView 
}: SidebarProps) {
  const { user, signOut, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname(); // Hook para saber a rota ativa

  const handleSignOut = async () => {
    await signOut();
    router.push('/login'); // Redireciona para login após signOut
  };

  const navItems: NavItem[] = [
    { href: '/dashboard', icon: MessageSquareText, label: 'Respostas', view: 'default' },
    // Novo Link is a modal, special handling below
    { label: 'Novo Link', icon: Link2, action: onOpenGenerateLinkModal }, 
    { label: 'Estatísticas', icon: BarChart3, view: 'statistics' },
    { href: '/dashboard/configuracoes', icon: Settings, label: 'Configurações', view: 'default' },
  ];

  // Paleta escura: bg-slate-800, text-slate-300, hover:bg-slate-700, hover:text-white
  // Item ativo: bg-teal-600 text-white

  return (
    <aside 
      className={`
        bg-[#25392C] text-slate-200 flex flex-col h-screen shadow-lg 
        fixed inset-y-0 left-0 z-40 w-64 
        transition-transform duration-300 ease-in-out 
        md:translate-x-0 
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
      `}
    >
      {/* Cabeçalho da Sidebar com Logo e Botão de Fechar (mobile) */}
      <div className="h-20 flex items-center justify-between px-4 border-b border-[#3A5A40]">
        <Link href="/dashboard" onClick={() => setCurrentView('default')} className="flex items-center space-x-2.5 text-xl font-semibold text-[#C4E8C9] hover:text-white transition-colors">
          <CustomLogoIcon className="w-8 h-8 text-[#C4E8C9]" />
          <span>
            PréClin <span className="font-light">Conecta</span>
          </span>
        </Link>
        <button 
          type="button"
          className="md:hidden p-2 text-slate-300 hover:text-white"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <span className="sr-only">Fechar menu</span>
          <XIcon className="h-6 w-6" />
        </button>
      </div>

      {/* Menu de Navegação Principal */}
      <nav className="flex-grow px-4 py-6 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          let isActive = false;
          if (item.view === 'statistics') {
            isActive = currentView === 'statistics';
          } else if (item.href) {
            // For default view items, active if currentView is default AND path matches
            isActive = currentView === 'default' && 
                       (pathname === item.href || 
                        (item.href === '/dashboard' && pathname.startsWith('/dashboard/') && navItems.filter(n => n.href && n.href !== '/dashboard').every(nav => !pathname.startsWith(nav.href!))));
          } else if (item.label === 'Novo Link') {
             // Novo Link button doesn't have an active state in the same way, or could be based on modal isOpen
             isActive = false; // Or some other logic if needed
          }

          const commonClasses = `w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-150 ease-in-out group text-left`;
          const activeClasses = 'bg-[#3A5A40] text-white shadow-md';
          const inactiveClasses = 'hover:bg-[#2E4A3B] hover:text-white text-slate-200';

          if (item.label === 'Novo Link') {
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  if (item.action) item.action();
                  if (isMobileMenuOpen) setIsMobileMenuOpen(false);
                }}
                className={`${commonClasses} ${isActive ? activeClasses : inactiveClasses}`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'}`} />
                <span>{item.label}</span>
              </button>
            );
          } else if (item.view === 'statistics') {
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  setCurrentView('statistics');
                  if (isMobileMenuOpen) setIsMobileMenuOpen(false);
                }}
                className={`${commonClasses} ${isActive ? activeClasses : inactiveClasses}`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'}`} />
                <span>{item.label}</span>
              </button>
            );
          } else if (item.href) {
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => {
                  setCurrentView('default');
                  if (isMobileMenuOpen) setIsMobileMenuOpen(false);
                }}
                className={`${commonClasses} ${isActive ? activeClasses : inactiveClasses}`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'}`} />
                <span>{item.label}</span>
              </Link>
            );
          }
          return null; // Should not happen with current navItems structure
        })}
      </nav>

      {/* Seção de Perfil do Usuário */}
      <div className="mt-auto p-4 border-t border-[#3A5A40]">
        {authLoading ? (
          <div className="flex items-center space-x-3 p-2">
            <div className="w-10 h-10 bg-[#2E4A3B] rounded-full animate-pulse"></div>
            <div className="flex-1 space-y-1">
                <div className="w-3/4 h-4 bg-[#2E4A3B] rounded animate-pulse"></div>
                <div className="w-1/2 h-3 bg-[#2E4A3B] rounded animate-pulse"></div>
            </div>
          </div>
        ) : user ? (
          <div className="flex flex-col space-y-3">
            <div className="flex items-center space-x-3 group">
              {user.user_metadata?.avatar_url ? (
                <Image 
                  src={user.user_metadata.avatar_url} 
                  alt="Foto de Perfil" 
                  width={48}
                  height={48}
                  className="rounded-full object-cover w-12 h-12"
                />
              ) : (
                <UserCircle2 className="w-12 h-12 text-slate-400" />
              )}
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium text-white truncate" title={user.user_metadata?.full_name || user.email}>
                  {user.user_metadata?.full_name || user.email}
                </p>
                <p className="text-xs text-slate-300 truncate" title={user.user_metadata?.specialty || 'Médico(a)'}>
                  {user.user_metadata?.specialty || 'Médico(a)'} {/* Assumindo que 'specialty' pode estar em user_metadata */}
                </p>
              </div>
              {/* <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-white" /> */}
            </div>
            <button
              onClick={async () => {
                setCurrentView('default'); // Reset view on sign out
                await handleSignOut();
                if (isMobileMenuOpen) setIsMobileMenuOpen(false); // Fecha menu mobile ao sair
              }}
              className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-left text-slate-200 hover:bg-red-600 hover:text-white transition-all duration-150 ease-in-out group focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <LogOut className="w-5 h-5 text-slate-300 group-hover:text-white" />
              <span>Sair</span>
            </button>
          </div>
        ) : (
          <p className="text-xs text-slate-400 text-center">Não autenticado</p>
        )}
      </div>
    </aside>
  );
} 