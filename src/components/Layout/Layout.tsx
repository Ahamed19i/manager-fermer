import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Egg, 
  ShoppingCart, 
  Box, 
  Users, 
  Settings, 
  LogOut,
  ChevronRight,
  Menu,
  X,
  Activity,
  ShieldCheck,
  History
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface LayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { icon: LayoutDashboard, label: 'Tableau de bord', path: '/', roles: ['admin', 'employee', 'client'], group: 'Principal' },
  { icon: Egg, label: 'Production', path: '/production', roles: ['admin', 'employee'], group: 'Gestion Terrain' },
  { icon: ShoppingCart, label: 'Ventes Directes', path: '/sales', roles: ['admin', 'employee'], group: 'Gestion Terrain' },
  { icon: History, label: 'Commandes Clients', path: '/orders', roles: ['admin', 'employee', 'client'], group: 'Distribution' },
  { icon: Box, label: 'Logistique & Stocks', path: '/stock', roles: ['admin', 'employee'], group: 'Logistique' },
  { icon: Users, label: 'Répertoire Clients', path: '/clients', roles: ['admin', 'employee'], group: 'Relation Client' },
  { icon: Activity, label: 'Journal Activité (Logs)', path: '/logs', roles: ['admin', 'employee'], group: 'Administration' },
  { icon: ShieldCheck, label: 'Gestion Équipe', path: '/users', roles: ['admin'], group: 'Administration' },
];

export default function Layout({ children }: LayoutProps) {
  const { user, profile, loading, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const navigate = useNavigate();

  // Show all for admin or during initial loading to prevent empty sidebar
  const filteredNavItems = navItems.filter(item => {
    if (loading) return true;
    
    // Fail-safe for super admin even if profile document isn't fully loaded
    const isSuperAdmin = 
      profile?.email?.toLowerCase() === 'hassanimhoma2019@gmail.com' ||
      user?.email?.toLowerCase() === 'hassanimhoma2019@gmail.com';
      
    if (isSuperAdmin) return true;
    return profile?.role && item.roles.includes(profile.role);
  });

  const bottomNavItems = React.useMemo(() => {
    const isSuperAdmin = 
      profile?.email?.toLowerCase() === 'hassanimhoma2019@gmail.com' ||
      user?.email?.toLowerCase() === 'hassanimhoma2019@gmail.com';
      
    const isAdminOrEmployee = isSuperAdmin || profile?.role === 'admin' || profile?.role === 'employee';
    
    if (isAdminOrEmployee) {
      return [
        { icon: LayoutDashboard, label: 'Tableau', path: '/' },
        { icon: Egg, label: 'Prod.', path: '/production' },
        { icon: ShoppingCart, label: 'Ventes', path: '/sales' },
        { icon: History, label: 'Cmds', path: '/orders' },
      ];
    } else {
      return [
        { icon: LayoutDashboard, label: 'Tableau', path: '/' },
        { icon: History, label: 'Cmds', path: '/orders' },
      ];
    }
  }, [profile?.role, profile?.email, user?.email]);

  const groupedItems = filteredNavItems.reduce((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {} as Record<string, typeof navItems>);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-72 bg-[#020617] border-r border-slate-800/40 sticky top-0 h-screen z-50 overflow-hidden">
        {/* Decorative Background Blob */}
        <div className="absolute top-0 left-0 w-full h-64 bg-blue-600/5 blur-[120px] -z-10 pointer-events-none" />
        
        <div className="p-8 flex-1 overflow-y-auto no-scrollbar">
          <div className="flex items-center gap-4 mb-14 px-2">
            <div className="relative group cursor-pointer">
              <div className="absolute -inset-2 bg-blue-600/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative w-11 h-11 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-blue-500/20 ring-1 ring-white/20">
                P
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-black text-2xl tracking-tighter text-white leading-none">PouleCom</span>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500/60 mt-1">Sytème Fermier</span>
            </div>
          </div>
          
          <div className="space-y-10">
            {Object.entries(groupedItems).map(([group, items]) => (
              <div key={group} className="space-y-4">
                <div className="flex items-center gap-3 px-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-600 whitespace-nowrap">{group}</h3>
                  <div className="h-[1px] w-full bg-slate-800/50" />
                </div>
                <nav className="space-y-1.5">
                  {items.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive }) => cn(
                        "flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all duration-300 relative group",
                        isActive 
                          ? "text-white bg-blue-600/10 shadow-[inset_0_0_20px_rgba(37,99,235,0.05)] border border-blue-500/20" 
                          : "text-slate-500 hover:text-slate-200 hover:bg-white/5 border border-transparent"
                      )}
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <motion.div 
                              layoutId="active-nav"
                              className="absolute left-0 w-1 h-6 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(37,99,235,1)]" 
                              transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            />
                          )}
                          <item.icon className={cn(
                            "w-5 h-5 transition-all duration-300", 
                            isActive ? "text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" : "text-slate-600 group-hover:text-slate-400 group-hover:scale-110"
                          )} />
                          <span className="tracking-tight">{item.label}</span>
                        </>
                      )}
                    </NavLink>
                  ))}
                </nav>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-slate-800/40 bg-slate-900/10 backdrop-blur-md">
          <div className="bg-slate-900/40 rounded-[2rem] p-4 border border-slate-800/50 ring-1 ring-white/5 shadow-2xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-2xl blur opacity-20" />
                <div className="relative w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shadow-inner">
                  {profile?.photoURL ? (
                    <img src={profile.photoURL} alt={profile.displayName || ''} className="w-full h-full object-cover" />
                  ) : (
                    <Users className="w-6 h-6 text-slate-500" />
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-slate-900 rounded-full" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black truncate text-white tracking-tight">{profile?.displayName || user?.displayName || 'Chargement...'}</p>
                <div className="flex items-center gap-1.5">
                  <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse" />
                  <p className="text-[9px] text-blue-400 font-black uppercase tracking-[0.2em]">{profile?.role || 'Initialisation...'}</p>
                </div>
              </div>
            </div>
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-3 text-slate-500 hover:text-red-400 hover:bg-red-400/10 h-11 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest"
              onClick={logout}
            >
              <LogOut className="w-4 h-4" />
              Déconnexion
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <header className="md:hidden bg-[#020617]/90 backdrop-blur-xl border-b border-slate-800/50 p-4 sticky top-0 z-40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg ring-1 ring-white/10">
            P
          </div>
          <div className="flex flex-col">
            <span className="font-black tracking-tight text-white text-base">PouleCom</span>
            <span className="text-[8px] font-black uppercase tracking-widest text-blue-500/70">Ferme Intelligente</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            type="button"
            className="w-10 h-10 bg-slate-950 hover:bg-slate-900 border border-slate-800/60 rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition-all active:scale-95" 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#020617]/95 backdrop-blur-3xl border-t border-slate-800/60 p-2.5 z-40 flex justify-around items-center pb-7 shadow-[0_-15px_30px_rgba(0,0,0,0.8)]">
        {bottomNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "flex flex-col items-center gap-1.5 p-1.5 rounded-2xl transition-all w-16",
              isActive 
                ? "text-blue-500 scale-105" 
                : "text-slate-500 hover:text-slate-300"
            )}
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn("w-5.5 h-5.5", isActive ? "stroke-[2.5px] text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" : "stroke-2")} />
                <span className={cn("text-[9px] font-bold tracking-tight text-center whitespace-nowrap", isActive ? "text-white" : "text-slate-500")}>
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
        {/* Menu Toggle */}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className={cn(
            "flex flex-col items-center gap-1.5 p-1.5 rounded-2xl transition-all w-16",
            isMobileMenuOpen ? "text-blue-500 scale-105" : "text-slate-500"
          )}
        >
          <Menu className={cn("w-5.5 h-5.5", isMobileMenuOpen ? "stroke-[2.5px] text-blue-500" : "stroke-2")} />
          <span className={cn("text-[9px] font-bold tracking-tight text-center whitespace-nowrap", isMobileMenuOpen ? "text-white" : "text-slate-500")}>
            Menu
          </span>
        </button>
      </nav>

      {/* Mobile Overlays Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="fixed inset-0 bg-[#020617] z-50 md:hidden flex flex-col p-6 pb-28 pt-8 overflow-hidden"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <span className="font-black text-xl tracking-tighter text-white">Menu Principal</span>
                <span className="text-[8px] bg-blue-500/10 text-blue-400 font-black px-2.5 py-1 rounded-full uppercase tracking-wider">Navigation</span>
              </div>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-10 h-10 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center text-slate-400 active:scale-90 transition-all font-bold"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User Profile Card */}
            <div className="flex items-center gap-4 p-5 bg-gradient-to-r from-slate-900/60 to-slate-900/10 border border-slate-800/40 rounded-3xl mb-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 blur-3xl rounded-full" />
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shadow-inner">
                  {profile?.photoURL || user?.photoURL ? (
                    <img src={profile?.photoURL || user?.photoURL || ''} className="w-full h-full object-cover" />
                  ) : (
                    <Users className="w-5 h-5 text-slate-500" />
                  )}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-slate-950 rounded-full" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-base text-white truncate tracking-tight">{profile?.displayName || user?.displayName || 'Utilisateur'}</p>
                <p className="text-[9px] text-blue-400 font-black uppercase tracking-[0.25em]">{profile?.role || 'Membre'}</p>
              </div>
            </div>
            
            {/* Scrollable Nav Items list */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 scrollbar-thin scrollbar-thumb-slate-800">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 px-2 pb-1">Toutes les rubriques</p>
              {filteredNavItems.map((item) => {
                const isCurrent = window.location.hash.toLowerCase().includes(item.path === '/' ? '#/login' : item.path.toLowerCase()) || 
                  (item.path === '/' && (window.location.hash === '#/' || window.location.hash === ''));
                
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      navigate(item.path);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between p-4 rounded-2xl border transition-all text-left group active:scale-[0.98]",
                      isCurrent 
                        ? "bg-blue-600/15 border-blue-500/30 text-white shadow-lg"
                        : "bg-slate-900/40 border-slate-850/30 hover:bg-slate-800/40 text-slate-300"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "p-2.5 rounded-xl transition-colors",
                        isCurrent ? "bg-blue-500/20 text-blue-400 border border-blue-500/20" : "bg-slate-900 border border-slate-850/50 text-slate-500 group-hover:text-slate-300"
                      )}>
                        <item.icon className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm tracking-tight">{item.label}</span>
                        <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest leading-none mt-1">{item.group}</span>
                      </div>
                    </div>
                    <ChevronRight className={cn("w-4 h-4 transition-transform", isCurrent ? "text-blue-400 translate-x-1" : "text-slate-600")} />
                  </button>
                );
              })}
            </div>

            {/* Sidebar actions footer */}
            <div className="mt-6 pt-4 border-t border-slate-900 space-y-3">
              <Button 
                variant="ghost" 
                className="w-full justify-center gap-3 h-14 rounded-2xl text-red-400 bg-red-500/5 hover:bg-red-500/10 hover:text-red-300 font-black uppercase tracking-wider text-xs transition-all active:scale-[0.98]" 
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  logout();
                }}
              >
                <LogOut className="w-4 h-4" /> 
                Se déconnecter
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 pb-20 md:pb-0 min-w-0">
        <div className="max-w-7xl mx-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
