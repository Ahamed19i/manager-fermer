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
      <header className="md:hidden bg-[#020617]/80 backdrop-blur-xl border-b border-slate-800/50 p-4 sticky top-0 z-40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
            P
          </div>
          <span className="font-bold tracking-tight text-white">PouleCom</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-white hover:bg-slate-800" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X /> : <Menu />}
          </Button>
        </div>
      </header>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#020617]/90 backdrop-blur-2xl border-t border-slate-800/50 p-3 z-40 flex justify-around items-center pb-8">
        {filteredNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all w-16",
              isActive 
                ? "text-blue-500 scale-110" 
                : "text-slate-500"
            )}
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn("w-6 h-6", isActive ? "stroke-[2.5px]" : "stroke-2")} />
                <span className={cn("text-[8px] uppercase font-black tracking-widest text-center", isActive ? "opacity-100" : "opacity-60")}>
                  {item.label.split(' ')[0]}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Mobile Overlays Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 top-[65px] bg-[#020617] z-50 md:hidden p-8"
          >
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-4 mb-10 p-6 bg-slate-900/40 border border-slate-800/50 rounded-[2rem]">
                <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden">
                  {profile?.photoURL || user?.photoURL ? <img src={profile?.photoURL || user?.photoURL || ''} className="w-full h-full object-cover" /> : <Users className="w-6 h-6 text-slate-500" />}
                </div>
                <div>
                  <p className="font-black text-lg text-white">{profile?.displayName || user?.displayName || 'Utilisateur'}</p>
                  <p className="text-[10px] text-blue-400 font-black uppercase tracking-[0.2em]">{profile?.role || 'Membre'}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <Button variant="outline" className="w-full justify-start gap-4 h-16 rounded-2xl border-slate-800 bg-slate-900/40 text-slate-300 font-bold" onClick={() => { setIsMobileMenuOpen(false); navigate('/settings'); }}>
                   <Settings className="w-6 h-6" /> Paramètres
                </Button>
                <div className="flex-1" />
                <Button variant="ghost" className="w-full justify-center gap-4 h-16 rounded-2xl text-red-400 bg-red-400/5 font-black uppercase tracking-widest text-xs" onClick={logout}>
                   <LogOut className="w-6 h-6" /> Déconnexion
                </Button>
              </div>
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
