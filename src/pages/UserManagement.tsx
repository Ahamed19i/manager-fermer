
import React, { useEffect, useState } from 'react';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  doc, 
  setDoc, 
  deleteDoc,
  updateDoc,
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { db, firebaseConfig } from '../lib/firebase';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
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
  Save,
  Trash2,
  Edit3,
  KeyRound
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
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Form State - Add
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'admin' | 'employee' | 'client'>('employee');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State - Edit
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'employee' | 'client'>('employee');
  const [editPhone, setEditPhone] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const isAdmin = profile?.email?.toLowerCase() === 'hassanimhoma2019@gmail.com' || profile?.role === 'admin';
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
    if (!email || !name) return toast.error("L'adresse e-mail et le nom sont requis.");
    if (!password || password.length < 6) return toast.error("Le mot de passe doit contenir au moins 6 caractères.");
    
    const normalizedEmail = email.trim().toLowerCase();
    setIsSubmitting(true);
    let tempAppInstance: any = null;
    
    try {
      // Create actual user authentication account using a temporary Firebase App instance.
      // This prevents signing out the currently logged-in Super Admin.
      const tempAppName = `temp-auth-app-${Date.now()}`;
      tempAppInstance = initializeApp(firebaseConfig, tempAppName);
      const tempAuth = getAuth(tempAppInstance);
      
      const userCred = await createUserWithEmailAndPassword(tempAuth, normalizedEmail, password);
      const userUid = userCred.user.uid;

      // Save user profile state
      const profileRef = doc(db, 'profiles', userUid);
      await setDoc(profileRef, {
        uid: userUid,
        email: normalizedEmail,
        displayName: name,
        role,
        phone,
        location,
        createdAt: serverTimestamp()
      });

      // If it's a client, also record in client directory so they display in order/sale screens
      if (role === 'client') {
        const clientRef = doc(db, 'clients', userUid);
        await setDoc(clientRef, {
          id: userUid,
          name,
          phone,
          location,
          createdAt: serverTimestamp()
        });
      }

      toast.success(`${name} a été enregistré avec succès et son compte Firebase a été configuré !`);
      setIsOpen(false);
      resetForm();
      fetchUsers();
    } catch (error: any) {
      console.error(error);
      toast.error(`Erreur d'enregistrement : ${error.message || error}`);
    } finally {
      if (tempAppInstance) {
        try {
          await deleteApp(tempAppInstance);
        } catch (e) {
          console.error("Error deleting temp auth reference:", e);
        }
      }
      setIsSubmitting(false);
    }
  }

  async function handleUpdateUser() {
    if (!selectedUser) return;
    if (!editName.trim()) return toast.error("L'identité complète est requise.");

    setIsEditing(true);
    try {
      const profileRef = doc(db, 'profiles', selectedUser.uid);
      await updateDoc(profileRef, {
        displayName: editName,
        role: editRole,
        phone: editPhone,
        location: editLocation
      });

      // Keep client registry synchronized if relevant
      if (editRole === 'client' || selectedUser.role === 'client') {
        const clientRef = doc(db, 'clients', selectedUser.uid);
        if (editRole === 'client') {
          await setDoc(clientRef, {
            id: selectedUser.uid,
            name: editName,
            phone: editPhone,
            location: editLocation
          }, { merge: true });
        } else {
          // If they were downgraded or changed, remove from clients matching database
          await deleteDoc(clientRef);
        }
      }

      toast.success("Profil mis à jour avec succès.");
      setIsEditOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error: any) {
      console.error(error);
      toast.error(`Erreur de modification : ${error.message || error}`);
    } finally {
      setIsEditing(false);
    }
  }

  async function handleDeleteProfile(userToDelete: UserProfile) {
    if (userToDelete.email.toLowerCase() === 'hassanimhoma2019@gmail.com') {
      return toast.error("Le Super Admin principal ne peut pas être supprimé !");
    }

    if (!window.confirm(`Êtes-vous sûr de vouloir révoquer l'accès et supprimer le profil de ${userToDelete.displayName} ?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'profiles', userToDelete.uid));
      if (userToDelete.role === 'client') {
        await deleteDoc(doc(db, 'clients', userToDelete.uid));
      }
      toast.success("Le profil a été supprimé de la base de données avec succès.");
      fetchUsers();
    } catch (error: any) {
      console.error(error);
      toast.error(`Erreur de suppression : ${error.message || error}`);
    }
  }

  function resetForm() {
    setEmail('');
    setPassword('');
    setName('');
    setRole('employee');
    setPhone('');
    setLocation('');
  }

  function openEditDialog(userToEdit: UserProfile) {
    setSelectedUser(userToEdit);
    setEditName(userToEdit.displayName || '');
    setEditRole(userToEdit.role || 'employee');
    setEditPhone(userToEdit.phone || '');
    setEditLocation(userToEdit.location || '');
    setIsEditOpen(true);
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

  const isSuperAdmin = (profile?.email || user?.email)?.toLowerCase() === 'hassanimhoma2019@gmail.com' || profile?.role === 'admin';

  if (!isSuperAdmin) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center text-center p-8">
        <ShieldAlert className="w-20 h-20 text-red-500 mb-6 animate-bounce" />
        <h2 className="text-3xl font-black text-white mb-2">Accès Restreint</h2>
        <p className="text-slate-500 font-bold">Seulement l'Administrateur peut accéder à cette section.</p>
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
            Portail de contrôle des accès, rôles et mots de passe PouleCom
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
              <DialogTitle className="text-3xl font-black tracking-tighter">Créer un Compte Équipe / Client</DialogTitle>
              <p className="text-slate-500 font-medium">L'utilisateur pourra se connecter directement avec ses coordonnées.</p>
            </DialogHeader>
            
            <div className="p-10 pt-4 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3 col-span-2 sm:col-span-1">
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
                <div className="space-y-3 col-span-2 sm:col-span-1">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Email de l'utilisateur</Label>
                  <div className="relative group">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-blue-500 transition-colors" />
                    <Input 
                      placeholder="exemple@email.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="h-14 rounded-2xl bg-slate-800/50 border-slate-700/50 font-bold pl-12 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3 col-span-2 sm:col-span-1">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Nom complet ou Raison Sociale</Label>
                  <div className="relative group">
                    <UserCircle className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-blue-500 transition-colors" />
                    <Input 
                      value={name} 
                      onChange={e => setName(e.target.value)} 
                      placeholder="Nom complet ou Entreprise" 
                      className="h-14 rounded-2xl bg-slate-800/50 border-slate-700/50 font-bold pl-12 focus:ring-4 focus:ring-blue-500/10 transition-all" 
                    />
                  </div>
                </div>
                
                <div className="space-y-3 col-span-2 sm:col-span-1">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Définir le Mot de passe</Label>
                  <div className="relative group">
                    <KeyRound className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-blue-500 transition-colors" />
                    <Input 
                      type="password"
                      placeholder="Minimum 6 caractères"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="h-14 rounded-2xl bg-slate-800/50 border-slate-700/50 font-bold pl-12 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3 col-span-2 sm:col-span-1">
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
                <div className="space-y-3 col-span-2 sm:col-span-1">
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
                {isSubmitting ? 'Provisionnement & Enregistrement...' : "Créer le Profil & l'Accès"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </header>

      {/* Edit User Profile Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="rounded-[3rem] bg-[#020617] border border-slate-800/50 text-white shadow-[0_0_100px_rgba(0,0,0,1)] p-0 overflow-hidden sm:max-w-lg">
          <div className="absolute top-0 left-0 w-full h-32 bg-blue-600/10 blur-[80px] -z-10" />
          <DialogHeader className="p-10 pb-4">
            <div className="w-14 h-14 bg-blue-600/10 rounded-2xl flex items-center justify-center mb-6 ring-1 ring-blue-500/20">
              <Edit3 className="text-blue-400 w-7 h-7" />
            </div>
            <DialogTitle className="text-3xl font-black tracking-tighter">Modifier le Collaborateur</DialogTitle>
            <p className="text-slate-500 font-medium">Modifiez les rôles ou les attributs de cet utilisateur.</p>
          </DialogHeader>
          
          <div className="p-10 pt-4 space-y-6">
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Identité Complète</Label>
              <Input 
                value={editName} 
                onChange={e => setEditName(e.target.value)} 
                className="h-14 rounded-2xl bg-slate-800/50 border-slate-700/50 font-bold focus:ring-4" 
              />
            </div>

            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Rôle Système</Label>
              <Select value={editRole} onValueChange={(v: any) => setEditRole(v)}>
                <SelectTrigger className="h-14 rounded-2xl bg-slate-800/50 border-slate-700/50 font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white rounded-2xl">
                  <SelectItem value="admin">Administrateur</SelectItem>
                  <SelectItem value="employee">Équipe Terrain</SelectItem>
                  <SelectItem value="client">Client Prioritaire</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Contact (+269)</Label>
                <Input 
                  value={editPhone} 
                  onChange={e => setEditPhone(e.target.value)} 
                  className="h-14 rounded-2xl bg-slate-800/50 border-slate-700/50 font-bold" 
                />
              </div>
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Zone Géographique</Label>
                <Input 
                  value={editLocation} 
                  onChange={e => setEditLocation(e.target.value)} 
                  className="h-14 rounded-2xl bg-slate-800/50 border-slate-700/50 font-bold" 
                />
              </div>
            </div>

            <Button 
              onClick={handleUpdateUser} 
              className="w-full h-18 rounded-[1.5rem] text-sm font-black uppercase tracking-[0.25em] bg-blue-600 hover:bg-blue-700 mt-4 border-b-4 border-blue-950 active:border-b-0 active:translate-y-1 transition-all"
              disabled={isEditing}
            >
              {isEditing ? 'Sauvegarde...' : 'Appliquer les Modifications'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
        ) : filteredUsers.map((userItem) => (
          <Card key={userItem.uid} className="rounded-[2rem] bg-slate-900/40 border-slate-800/50 backdrop-blur-xl group hover:border-blue-500/30 transition-all overflow-hidden border relative">
            <CardContent className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner ring-1",
                  userItem.role === 'admin' ? "bg-red-500/10 text-red-500 ring-red-500/20" :
                  userItem.role === 'employee' ? "bg-blue-500/10 text-blue-500 ring-blue-500/20" :
                  "bg-green-500/10 text-green-500 ring-green-500/20"
                )}>
                  {(userItem.displayName || userItem.email || 'U').charAt(0).toUpperCase()}
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge className={cn(
                    "rounded-full border-none font-black text-[9px] uppercase tracking-widest px-3 py-1 ring-1",
                    userItem.role === 'admin' ? "bg-red-500/10 text-red-500 ring-red-500/20" :
                    userItem.role === 'employee' ? "bg-blue-500/10 text-blue-500 ring-blue-500/20" :
                    "bg-green-500/10 text-green-500 ring-green-500/20"
                  )}>
                    {userItem.role}
                  </Badge>

                  {/* Actions for Admins / Super Admin */}
                  {userItem.email?.toLowerCase() !== 'hassanimhoma2019@gmail.com' && (
                    <div className="flex gap-1.5 ml-2">
                      <button 
                        onClick={() => openEditDialog(userItem)}
                        className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
                        title="Modifier le collaborateur"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => handleDeleteProfile(userItem)}
                        className="p-1.5 hover:bg-red-950/30 rounded-lg text-slate-500 hover:text-red-400 transition-all cursor-pointer"
                        title="Supprimer le profil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <h3 className="font-black text-xl text-white mb-1 tracking-tight truncate">
                {userItem.displayName || userItem.email?.split('@')[0] || 'Utilisateur'}
              </h3>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-4 flex items-center gap-2">
                <Mail className="w-3 h-3 text-slate-600" /> {userItem.email}
              </p>

              <div className="space-y-2 pt-4 border-t border-slate-800/40">
                <div className="flex items-center gap-3 text-slate-400 font-medium text-xs">
                  <Phone className="w-3 h-3 text-slate-600" /> {userItem.phone || '—'}
                </div>
                <div className="flex items-center gap-3 text-slate-400 font-medium text-xs">
                  <MapPin className="w-3 h-3 text-slate-600" /> {userItem.location || '—'}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
