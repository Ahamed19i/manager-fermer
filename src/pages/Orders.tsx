import React, { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  where,
  getDocs, 
  deleteDoc,
  updateDoc,
  doc,
  serverTimestamp,
  limit
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { 
  ShoppingCart, 
  PlusCircle, 
  History,
  Clock,
  Package,
  CheckCircle2,
  Timer,
  Trash2,
  Edit2
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../components/ui/select';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface OrderRecord {
  id: string;
  clientId: string;
  quantity: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  date: any;
  notes?: string;
  clientName?: string;
}

export default function Orders() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (profile) fetchData();
  }, [profile]);

  async function fetchData() {
    try {
      let q;
      if (profile?.role === 'client') {
        const clientsQuery = query(
          collection(db, 'orders'), 
          where('clientId', '==', profile.uid)
        );
        const snap = await getDocs(clientsQuery);
        const data = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as OrderRecord));
        
        // Tri en mémoire robuste pour éviter les index composites requis de Firestore
        data.sort((a: any, b: any) => {
          const timeA = a.date?.seconds ? a.date.seconds * 1000 : (a.date ? new Date(a.date).getTime() : 0);
          const timeB = b.date?.seconds ? b.date.seconds * 1000 : (b.date ? new Date(b.date).getTime() : 0);
          return timeB - timeA;
        });

        setOrders(data.slice(0, 20));
      } else {
        const adminQuery = query(
          collection(db, 'orders'), 
          orderBy('date', 'desc'),
          limit(50)
        );
        const snap = await getDocs(adminQuery);
        const data = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as OrderRecord));
        setOrders(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateOrder() {
    if (!profile) return;
    setIsSubmitting(true);

    try {
      await addDoc(collection(db, 'orders'), {
        clientId: profile.uid,
        clientName: profile.displayName,
        quantity,
        notes,
        status: 'pending',
        date: serverTimestamp()
      });

      toast.success('Votre commande a été envoyée !');
      setIsOpen(false);
      setQuantity(1);
      setNotes('');
      fetchData();
    } catch (error) {
      toast.error("Erreur lors de la commande");
    } finally {
      setIsSubmitting(false);
    }
  }

  const isAdmin = profile?.role === 'admin' || profile?.email?.toLowerCase() === 'hassanimhoma2019@gmail.com';

  async function handleUpdateStatus(orderId: string, newStatus: 'pending' | 'confirmed' | 'completed' | 'cancelled') {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: newStatus
      });
      toast.success(`Statut de la commande mis à jour : ${newStatus}`);
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la mise à jour du statut");
    }
  }

  async function handleDeleteOrder(orderId: string) {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer définitivement cette commande ?")) return;
    try {
      await deleteDoc(doc(db, 'orders', orderId));
      toast.success("Commande supprimée avec succès.");
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la suppression de la commande");
    }
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Gestion des Commandes</h1>
          <p className="text-slate-500 text-sm">
            {profile?.role === 'client' 
              ? 'Passez vos commandes et suivez vos achats.' 
              : 'Gérer les commandes clients entrantes.'}
          </p>
        </div>
        
        {profile?.role === 'client' && (
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-2xl gap-2 h-12 px-6 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20">
                <PlusCircle className="w-5 h-5" /> Nouvelle Commande
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-3xl bg-slate-900 border-slate-800 text-white">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Passer une commande</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 pt-4">
                <div className="space-y-2">
                  <Label>Quantité de Plateaux (30 œufs par plateau)</Label>
                  <Input 
                    type="number" 
                    value={quantity} 
                    onChange={e => setQuantity(parseInt(e.target.value))} 
                    className="h-14 rounded-xl font-black text-2xl bg-slate-800 border-slate-700"
                  />
                  <p className="text-xs text-slate-500">Soit {quantity * 30} œufs au total.</p>
                </div>

                <div className="space-y-2">
                  <Label>Notes (Localisation, heure de retrait...)</Label>
                  <Input 
                    value={notes} 
                    onChange={e => setNotes(e.target.value)} 
                    placeholder="Ex: Je passerai à Moroni vers 10h"
                    className="h-12 rounded-xl bg-slate-800 border-slate-700"
                  />
                </div>

                <Button 
                  onClick={handleCreateOrder}
                  disabled={isSubmitting} 
                  className="w-full h-14 rounded-2xl text-lg font-bold bg-blue-600 hover:bg-blue-700 mt-2"
                >
                  {isSubmitting ? 'Envoi en cours...' : 'Envoyer la Commande'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [...Array(6)].map((_, i) => <Card key={i} className="rounded-3xl border-slate-800 bg-slate-900/50 h-40 animate-pulse" />)
        ) : orders.length === 0 ? (
          <div className="col-span-full py-20 text-center">
            <ShoppingCart className="w-16 h-16 text-slate-800 mx-auto mb-4" />
            <p className="text-slate-500 font-bold">Aucune commande pour le moment.</p>
          </div>
        ) : (
          orders.map((order) => (
            <Card key={order.id} className="rounded-3xl border-slate-800 bg-slate-900/40 hover:bg-slate-900/60 transition-all overflow-hidden group relative">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div className="p-3 bg-blue-600/10 text-blue-500 rounded-2xl group-hover:scale-110 transition-transform">
                    <Package className="w-6 h-6" />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge className={cn(
                      "rounded-full px-3 py-1 font-black text-[10px] uppercase tracking-widest border-none",
                      order.status === 'pending' ? "bg-orange-500/10 text-orange-500" :
                      order.status === 'confirmed' ? "bg-blue-500/10 text-blue-500" :
                      order.status === 'completed' ? "bg-green-500/10 text-green-500" :
                      "bg-red-500/10 text-red-500"
                    )}>
                      {order.status === 'pending' && <Timer className="w-3 h-3 mr-1 inline" />}
                      {order.status === 'completed' && <CheckCircle2 className="w-3 h-3 mr-1 inline" />}
                      {order.status}
                    </Badge>

                    {isAdmin && (
                      <button 
                        onClick={() => handleDeleteOrder(order.id)}
                        className="p-1.5 hover:bg-red-950/30 rounded-lg text-slate-500 hover:text-red-400 transition-all cursor-pointer"
                        title="Supprimer la commande"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                
                <h3 className="font-bold text-lg text-white mb-1">{order.quantity} Plateaux</h3>
                <p className="text-xs text-slate-500 mb-2">{order.date?.toDate ? format(order.date.toDate(), 'eeee d MMMM, p', { locale: fr }) : 'Date inconnue'}</p>
                {order.notes && (
                  <div className="mt-2 text-xs bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-slate-400 max-h-16 overflow-y-auto italic">
                    "{order.notes}"
                  </div>
                )}
                
                {profile?.role !== 'client' && (
                  <div className="pt-4 border-t border-slate-800/50 mt-4">
                    <p className="text-[10px] font-black uppercase text-slate-500 mb-1">Client</p>
                    <p className="text-sm font-bold text-white">{(order as any).clientName || 'Client'}</p>
                    
                    {isAdmin && (
                      <div className="mt-3">
                        <Label className="text-[8px] uppercase tracking-widest text-slate-500 mb-1 inline-block">Changer l'état</Label>
                        <Select 
                          value={order.status} 
                          onValueChange={(val: any) => handleUpdateStatus(order.id, val)}
                        >
                          <SelectTrigger className="h-9 rounded-xl bg-slate-950 border-slate-800/60 font-medium text-[10px] uppercase">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-900 border-slate-800 text-white rounded-xl">
                            <SelectItem value="pending">En attente (Pending)</SelectItem>
                            <SelectItem value="confirmed">Confirmée</SelectItem>
                            <SelectItem value="completed">Terminée (Livrée)</SelectItem>
                            <SelectItem value="cancelled">Annulée</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
