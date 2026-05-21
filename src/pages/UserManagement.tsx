import React, { useEffect, useState } from 'react';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  doc, 
  setDoc, 
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  UserPlus, 
  Users, 
  ShieldCheck, 
  UserCircle, 
  Mail, 
  Phone, 
  MapPin, 
  Search,
  MoreVertical,
  ChevronRight,
  ShieldAlert,
  Save
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '../components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../components/ui/select';
import { toast } from 'sonner';
import { Badge } from '../components/ui/badge';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'employee' | 'client';
  phone?: string;
  location?: string;
  createdAt?: any;
}

export default function UserManagement() {
  const { user, profile, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Form State
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'admin' | 'employee' | 'client'>('employee');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const isAdmin = profile?.email?.toLowerCase() === 'hassanimhoma2019@gmail.com';
    if (!authLoading && isAdmin) {
      fetchUsers();
    }
  }, [authLoading, profile]);

  async function fetchUsers() {
    try {
      const q = query(collection(db, 'profiles'), orderBy('displayName', 'asc'));
      const snap = await getDocs(q);
      setUsers(snap.docs.map(doc => doc.data() as UserProfile));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateUser() {
    if (!email || !name) return toast.error("Email and Name are required");
    
    const normalizedEmail = email.trim().toLowerCase();
    setIsSubmitting(true);
    try {
      // NOTE: In a real app with Firebase Admin Auth, we'd create the user accounts here.
      // Since we work in client-side for this demo, we'll provision the profile.
      // The user will "claim" this email when they sign in with Google for the first time.
      const userId = normalizedEmail.replace(/[@.]/g, '_'); // Generate a placeholder ID
      const profileRef = doc(db, 'profiles', userId);
      
      await setDoc(profileRef, {
        uid: userId, // In production, this would be the Auth UID
        email: normalizedEmail,
        displayName: name,
        role,
        phone,
        location,
        createdAt: serverTimestamp()
      });

      // If it's a client, also add to 'clients' collection for sales dropdown visibility
      if (role === 'client') {
        const clientRef = doc(db, 'clients', userId);
        await setDoc(clientRef, {
          name,
          phone,
          location,
          createdAt: serverTimestamp()
        });
      }

      toast.success(`${name} ajouté avec succès`);
      setIsOpen(false);
      resetForm();
      fetchUsers();
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de l'ajout");
    } finally {
      setIsSubmitting(false);
    }
  }

  function resetForm() {
    setEmail('');
    setName('');
    setRole('employee');
    setPhone('');
    setLocation('');
  }

  const filteredUsers = users.filter(u => 
    (u.displayName || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(search.toLowerCase())
  );

  if (authLoading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isSuperAdmin = (profile?.email || user?.email)?.toLowerCase() === 'hassanimhoma2019@gmail.com';

  if (!isSuperAdmin) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center text-center p-8">
        <ShieldAlert className="w-20 h-20 text-red-500 mb-6 animate-bounce" />
        <h2 className="text-3xl font-black text-white mb-2">Accès Restreint</h2>
        <p className="text-slate-500 font-bold">Seulement le Super Admin peut accéder à cette section.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 group">
        <div className="relative">
          <div className="absolute -left-8 top-1/2 -translate-y-1/2 w-1.5 h-12 bg-blue-600 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500" />
          <h1 className="text-4xl font-black text-white tracking-tighter">Gestion de l'Équipe</h1>
          <p className="text-slate-500 font-medium tracking-tight mt-1 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-500/50" />
            Portail de contrôle des accès et rôles PouleCom
          </p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-[2rem] gap-3 h-16 px-10 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 shadow-[0_20px_40px_-10px_rgba(37,99,235,0.3)] font-black uppercase tracking-widest text-[11px] transition-all active:scale-95 border-t border-white/10">
              <UserPlus className="w-5 h-5 shadow-sm" /> Nouveau Membre
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-[3rem] bg-[#020617] border border-slate-800/50 text-white shadow-[0_0_100px_rgba(0,0,0,1)] p-0 overflow-hidden sm:max-w-xl">
            <div className="absolute top-0 left-0 w-full h-32 bg-blue-600/10 blur-[80px] -z-10" />
            <DialogHeader className="p-10 pb-4">
              <div className="w-14 h-14 bg-blue-600/10 rounded-2xl flex items-center justify-center mb-6 ring-1 ring-blue-500/20">
                <UserPlus className="text-blue-500 w-7 h-7" />
              </div>
              <DialogTitle className="text-3xl font-black tracking-tighter">Ajouter au Réseau</DialogTitle>
              <p className="text-slate-500 font-medium">Configurez les droits d'accès pour un nouveau collaborateur.</p>
            </DialogHeader>
            
            <div className="p-10 pt-4 space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Rôle Système</Label>
                  <Select value={role} onValueChange={(v: any) => setRole(v)}>
                    <SelectTrigger className="h-14 rounded-2xl bg-slate-800/50 border-slate-700/50 font-bold focus:ring-4 focus:ring-blue-500/10 transition-all">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white rounded-2xl">
                      <SelectItem value="admin">Administrateur</SelectItem>
                      <SelectItem value="employee">Équipe Terrain</SelectItem>
                      <SelectItem value="client">Client Prioritaire</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Email Google</Label>
                  <div className="relative group">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-blue-500 transition-colors" />
                    <Input 
                      placeholder="google@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="h-14 rounded-2xl bg-slate-800/50 border-slate-700/50 font-bold pl-12 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Identité Complète</Label>
                <div className="relative group">
                  <UserCircle className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-blue-500 transition-colors" />
                  <Input 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    placeholder="Nom et Prénom" 
                    className="h-14 rounded-2xl bg-slate-800/50 border-slate-700/50 font-bold pl-12 focus:ring-4 focus:ring-blue-500/10 transition-all" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Contact (+269)</Label>
                  <div className="relative group">
                    <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-blue-500 transition-colors" />
                    <Input 
                      value={phone} 
                      onChange={e => setPhone(e.target.value)} 
                      placeholder="332 00 00" 
                      className="h-14 rounded-2xl bg-slate-800/50 border-slate-700/50 font-bold pl-12 focus:ring-4 focus:ring-blue-500/10 transition-all" 
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Zone Géographique</Label>
                  <div className="relative group">
                    <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-blue-500 transition-colors" />
                    <Input 
                      value={location} 
                      onChange={e => setLocation(e.target.value)} 
                      placeholder="Ex: Moroni" 
                      className="h-14 rounded-2xl bg-slate-800/50 border-slate-700/50 font-bold pl-12 focus:ring-4 focus:ring-blue-500/10 transition-all" 
                    />
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleCreateUser} 
                className="w-full h-18 rounded-[1.5rem] text-sm font-black uppercase tracking-[0.25em] bg-blue-600 hover:bg-blue-700 mt-4 shadow-[0_20px_40px_-5px_rgba(37,99,235,0.4)] border-b-4 border-blue-950 active:border-b-0 active:translate-y-1 transition-all"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Synchronisation Cloud...' : 'Confirmer l\'Addition'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </header>

      <div className="relative group max-w-2xl">
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-[2.5rem] blur opacity-0 group-focus-within:opacity-100 transition-opacity" />
        <Search className="absolute left-7 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5 group-focus-within:text-blue-500 transition-colors pointer-events-none" />
        <Input 
          placeholder="Filtrer l'annuaire de l'entreprise..." 
          className="relative h-18 rounded-[2.5rem] pl-16 bg-slate-900/60 border-slate-800/50 backdrop-blur-3xl shadow-inner font-bold text-lg text-white transition-all focus:ring-0 focus:border-blue-500/50 placeholder:text-slate-700"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [...Array(6)].map((_, i) => <div key={i} className="h-56 rounded-[2rem] bg-slate-900 animate-pulse border border-slate-800/50" />)
        ) : filteredUsers.map((user) => (
          <Card key={user.uid} className="rounded-[2rem] bg-slate-900/40 border-slate-800/50 backdrop-blur-xl group hover:border-blue-500/30 transition-all overflow-hidden border">
            <CardContent className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner ring-1",
                  user.role === 'admin' ? "bg-red-500/10 text-red-500 ring-red-500/20" :
                  user.role === 'employee' ? "bg-blue-500/10 text-blue-500 ring-blue-500/20" :
                  "bg-green-500/10 text-green-500 ring-green-500/20"
                )}>
                  {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                </div>
                <Badge className={cn(
                  "rounded-full border-none font-black text-[9px] uppercase tracking-widest px-3 py-1 ring-1",
                  user.role === 'admin' ? "bg-red-500/10 text-red-500 ring-red-500/20" :
                  user.role === 'employee' ? "bg-blue-500/10 text-blue-500 ring-blue-500/20" :
                  "bg-green-500/10 text-green-500 ring-green-500/20"
                )}>
                  {user.role}
                </Badge>
              </div>

              <h3 className="font-black text-xl text-white mb-1 tracking-tight truncate">
                {user.displayName || user.email?.split('@')[0] || 'Utilisateur'}
              </h3>
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-4 flex items-center gap-2">
                <Mail className="w-3 h-3" /> {user.email}
              </p>

              <div className="space-y-2 pt-4 border-t border-slate-800/50">
                <div className="flex items-center gap-3 text-slate-400 font-bold text-xs">
                  <Phone className="w-3 h-3 text-slate-600" /> {user.phone || '—'}
                </div>
                <div className="flex items-center gap-3 text-slate-400 font-bold text-xs">
                  <MapPin className="w-3 h-3 text-slate-600" /> {user.location || '—'}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
