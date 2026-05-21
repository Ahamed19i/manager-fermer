import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, orderBy, query, serverTimestamp, where, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { 
  Users, 
  UserPlus, 
  Phone, 
  MapPin, 
  Search,
  ChevronRight,
  MoreVertical,
  History,
  Calendar,
  Package,
  ArrowUpRight
} from 'lucide-react';
import { Skeleton } from '../components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '../components/ui/dialog';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

interface Client {
  id: string;
  name: string;
  phone: string;
  location: string;
}

interface SaleRecord {
  id: string;
  clientName: string;
  quantity: number;
  totalPrice: number;
  paymentMethod: string;
  date: any;
  location: string;
}

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  // History states
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientSales, setClientSales] = useState<SaleRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');

  useEffect(() => {
    fetchClients();
  }, []);

  async function fetchClientHistory(clientId: string) {
    setLoadingHistory(true);
    try {
      const q = query(
        collection(db, 'sales'), 
        where('clientId', '==', clientId), 
        orderBy('date', 'desc'), 
        limit(20)
      );
      const snap = await getDocs(q);
      setClientSales(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SaleRecord)));
    } catch (error) {
      console.error(error);
      toast.error('Impossible de charger l\'historique');
    } finally {
      setLoadingHistory(false);
    }
  }

  async function fetchClients() {
    try {
      const q = query(collection(db, 'clients'), orderBy('name', 'asc'));
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));
      setClients(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!name) return;
    try {
      await addDoc(collection(db, 'clients'), {
        name,
        phone,
        location,
        createdAt: serverTimestamp()
      });
      toast.success('Client ajouté au répertoire');
      setIsOpen(false);
      setName(''); setPhone(''); setLocation('');
      fetchClients();
    } catch (error) {
      toast.error('Erreur lors de l\'ajout');
    }
  }

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.phone.includes(search)
  );

  return (
    <div className="space-y-8 font-sans">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white">Répertoire Clients</h1>
          <p className="text-slate-500 font-medium tracking-tight">Gérez votre base de clients et leur fidélité.</p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-[2rem] gap-3 h-14 px-8 bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/20 font-black uppercase tracking-widest text-xs">
              <UserPlus className="w-5 h-5" /> Ajouter un Client
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-[2.5rem] bg-slate-900 border-slate-800 text-white shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black tracking-tight">Nouveau Client</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 pt-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Nom complet</Label>
                <Input 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  placeholder="Ex: Ahmed Kassim" 
                  className="h-14 rounded-2xl bg-slate-800 border-slate-700 font-bold px-5" 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Téléphone</Label>
                <Input 
                  value={phone} 
                  onChange={e => setPhone(e.target.value)} 
                  placeholder="Ex: +269 333 ..." 
                  className="h-14 rounded-2xl bg-slate-800 border-slate-700 font-bold px-5" 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Localisation</Label>
                <Input 
                  value={location} 
                  onChange={e => setLocation(e.target.value)} 
                  placeholder="Ex: Mitsamiouli" 
                  className="h-14 rounded-2xl bg-slate-800 border-slate-700 font-bold px-5" 
                />
              </div>
              <Button onClick={handleCreate} className="w-full h-16 rounded-2xl text-lg font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-700 mt-2 shadow-xl shadow-blue-500/20">
                Enregistrer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </header>

      <div className="relative group">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5 group-focus-within:text-blue-500 transition-colors" />
        <Input 
          placeholder="Rechercher par nom ou téléphone..." 
          className="h-16 rounded-[2rem] pl-16 bg-slate-900/40 border-slate-800/50 backdrop-blur-xl shadow-inner font-bold text-white transition-all focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [...Array(6)].map((_, i) => <div key={i} className="h-56 rounded-[2rem] bg-slate-900 animate-pulse border border-slate-800/50" />)
        ) : filteredClients.length === 0 ? (
          <div className="col-span-full py-24 text-center bg-slate-900/20 rounded-[3rem] border border-dashed border-slate-800">
            <Users className="w-20 h-20 text-slate-800 mx-auto mb-6" />
            <p className="text-slate-500 font-black uppercase tracking-widest">Aucun client trouvé.</p>
          </div>
        ) : (
          filteredClients.map((client) => (
            <Card key={client.id} className="rounded-[2rem] bg-slate-900/40 border-slate-800/50 backdrop-blur-xl hover:border-blue-500/30 transition-all group overflow-hidden border">
               <CardContent className="p-0">
                 <div className="p-8">
                    <div className="flex justify-between items-start mb-6">
                       <div className="w-14 h-14 bg-blue-600/10 text-blue-500 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner ring-1 ring-blue-500/20">
                         {(client.name || 'C').charAt(0).toUpperCase()}
                       </div>
                       <Button variant="ghost" size="icon" className="rounded-xl hover:bg-white/5 active:scale-95 transition-all">
                         <MoreVertical className="w-5 h-5 text-slate-600" />
                       </Button>
                    </div>
                    <h3 className="font-black text-xl text-white mb-4 tracking-tight">{client.name || 'Client sans nom'}</h3>
                    <div className="space-y-3">
                       <div className="flex items-center gap-3 text-slate-400 font-bold text-sm">
                         <div className="p-1.5 bg-slate-800 rounded-lg"><Phone className="w-4 h-4 text-slate-500" /></div>
                         {client.phone || 'Non renseigné'}
                       </div>
                       <div className="flex items-center gap-3 text-slate-400 font-bold text-sm">
                         <div className="p-1.5 bg-slate-800 rounded-lg"><MapPin className="w-4 h-4 text-slate-500" /></div>
                         {client.location || 'Localisation inconnue'}
                       </div>
                    </div>
                 </div>
                 <button 
                   onClick={() => {
                     setSelectedClient(client);
                     fetchClientHistory(client.id);
                   }}
                   className="w-full py-4 bg-slate-900/80 hover:bg-slate-800 text-slate-500 hover:text-white text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all border-t border-slate-800/50 active:py-3.5"
                 >
                   Historique d'achat <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                 </button>
               </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* History Dialog */}
      <Dialog open={!!selectedClient} onOpenChange={(open) => !open && setSelectedClient(null)}>
        <DialogContent className="max-w-2xl rounded-[3rem] bg-[#020617] border border-slate-800/50 text-white shadow-2xl p-0 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-32 bg-blue-600/10 blur-[80px] -z-10" />
          <DialogHeader className="p-8 pb-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-600/20 rounded-2xl flex items-center justify-center font-black text-xl text-blue-500 ring-1 ring-blue-500/30">
                {(selectedClient?.name || 'C').charAt(0).toUpperCase()}
              </div>
              <div>
                <DialogTitle className="text-2xl font-black tracking-tighter">{selectedClient?.name || 'Client sans nom'}</DialogTitle>
                <DialogDescription className="text-slate-500 font-bold">Historique des transactions récentes</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="px-8 pb-8">
            <div className="bg-slate-900/40 rounded-[2rem] border border-slate-800/50 overflow-hidden">
              <div className="max-h-[60vh] overflow-y-auto no-scrollbar">
                {loadingHistory ? (
                  <div className="p-12 flex flex-col items-center justify-center gap-4">
                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Synchronisation...</p>
                  </div>
                ) : clientSales.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="w-16 h-16 bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Package className="w-8 h-8 text-slate-600" />
                    </div>
                    <p className="text-slate-500 font-black uppercase tracking-widest text-xs">Aucun achat enregistré</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800/50">
                    {clientSales.map((sale) => (
                      <div key={sale.id} className="p-6 hover:bg-white/[0.02] transition-colors flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-slate-800/50 rounded-xl">
                            <Calendar className="w-5 h-5 text-slate-500" />
                          </div>
                          <div>
                            <p className="text-sm font-black text-white px-2 py-0.5 bg-blue-600/10 rounded-md inline-block mb-1">
                              {sale.date?.toDate ? format(sale.date.toDate(), 'dd MMMM yyyy', { locale: fr }) : 
                               format(new Date(sale.date), 'dd MMMM yyyy', { locale: fr })}
                            </p>
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {sale.location}
                              </span>
                              <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                <Package className="w-3 h-3" /> {sale.quantity} Plateaux
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-black text-white mb-1">
                            {sale.totalPrice.toLocaleString()} <span className="text-[10px] text-slate-500">KMF</span>
                          </p>
                          <div className="flex items-center justify-end gap-2">
                             <span className={cn(
                               "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
                               sale.paymentMethod === 'cash' ? "bg-green-500/10 text-green-500" : "bg-purple-500/10 text-purple-500"
                             )}>
                               {sale.paymentMethod === 'cash' ? 'Espèces' : 'Mobile'}
                             </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-6 flex justify-between items-center px-4">
               <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Volume Total</span>
                  <p className="text-2xl font-black text-blue-500">
                    {clientSales.reduce((acc, s) => acc + s.totalPrice, 0).toLocaleString()} <span className="text-sm">KMF</span>
                  </p>
               </div>
               <Button onClick={() => setSelectedClient(null)} className="rounded-2xl h-12 px-6 bg-slate-800 hover:bg-slate-700 text-white font-black text-[10px] uppercase tracking-widest">
                 Fermer
               </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
