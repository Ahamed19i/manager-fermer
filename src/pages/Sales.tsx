import React, { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  getDocs, 
  serverTimestamp, 
  runTransaction,
  limit,
  doc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { 
  ShoppingCart, 
  Plus, 
  Search, 
  Clock, 
  PlusCircle,
  CreditCard,
  Banknote
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Client {
  id: string;
  name: string;
  phone: string;
}

interface SaleRecord {
  id: string;
  clientName: string;
  quantity: number;
  totalPrice: number;
  paymentMethod: string;
  date: any;
}

export default function Sales() {
  const { profile } = useAuth();
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [stocks, setStocks] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Form states
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('Moroni');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(2500); // Ex: 2500 KMF per plateau
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [saleDate, setSaleDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const locations = ['Centrale', 'Moroni', 'Mitsamihouli', 'Mkazi', 'Itsinkoudi'];

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      // Fetch clients
      const clientsSnap = await getDocs(collection(db, 'clients'));
      const clientsData = clientsSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as Client));
      setClients(clientsData);

      // Fetch stocks
      const stocksSnap = await getDocs(collection(db, 'stocks'));
      const stocksMap: Record<string, number> = {};
      stocksSnap.forEach(doc => {
        const d = doc.data();
        stocksMap[d.location || doc.id] = Number(d.quantity || 0);
      });
      locations.forEach(l => {
        if (stocksMap[l] === undefined) {
          stocksMap[l] = 0;
        }
      });
      setStocks(stocksMap);

      // Fetch recent sales
      const salesQuery = query(collection(db, 'sales'), orderBy('date', 'desc'), limit(50));
      const salesSnap = await getDocs(salesQuery);
      
      const salesData = salesSnap.docs.map(doc => ({ 
        id: doc.id, 
        ...(doc.data() as object),
      } as SaleRecord));
      setSales(salesData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateSale() {
    if (!profile || !selectedClientId) {
      toast.error('Veuillez sélectionner un client');
      return;
    }

    const currentStock = stocks[selectedLocation] || 0;
    if (currentStock < quantity) {
      toast.error(`Stock insuffisant dans ${selectedLocation}. Stock restant: ${currentStock} plateaux. Veuillez charger ou ajuster le stock.`);
      return;
    }
    
    setIsSubmitting(true);
    const totalPrice = quantity * unitPrice;

    try {
      await runTransaction(db, async (transaction) => {
        // 1. All GETs first
        const stockRef = doc(db, 'stocks', selectedLocation);
        const stockSnap = await transaction.get(stockRef);
        const currentQty = stockSnap.exists() ? stockSnap.data().quantity : 0;

        if (currentQty < quantity) {
          throw new Error("Stock insuffisant, veuillez charger le stock");
        }

        // 2. All SETs after
        const saleRef = doc(collection(db, 'sales'));
        const client = clients.find(c => c.id === selectedClientId);
        
        transaction.set(saleRef, {
          clientId: selectedClientId,
          clientName: client?.name || 'Client',
          sellerId: profile.uid,
          location: selectedLocation,
          quantity,
          unitPrice,
          totalPrice,
          paymentMethod,
          date: new Date(saleDate),
          recordedAt: serverTimestamp(),
          status: 'completed'
        });

        transaction.set(stockRef, {
          location: selectedLocation,
          quantity: currentQty - quantity,
          lastUpdated: serverTimestamp()
        }, { merge: true });

        // Log
        const stockLogRef = doc(collection(db, 'stockLogs'));
        transaction.set(stockLogRef, {
          type: 'sale',
          location: selectedLocation,
          quantity: -quantity,
          recordedBy: profile.uid,
          timestamp: serverTimestamp()
        });
      });

      toast.success('Vente enregistrée et stock mis à jour');
      setIsOpen(false);
      fetchData();
    } catch (error: any) {
      console.error("Sale error:", error);
      toast.error(error.message || "Erreur lors de la vente");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-8 font-sans">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white">Ventes & Terrain</h1>
          <p className="text-slate-500 font-medium tracking-tight">Enregistrez les sorties de stock vers les clients.</p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-[2rem] gap-3 h-14 px-8 bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/20 font-black uppercase tracking-widest text-xs">
              <PlusCircle className="w-5 h-5" /> Nouvelle Vente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md rounded-[2.5rem] bg-slate-900 border-slate-800 text-white shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black tracking-tight">Saisie de Vente</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Point de Vente</Label>
                  <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                    <SelectTrigger className="h-12 rounded-2xl bg-slate-800 border-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-slate-400 font-medium ml-1">
                    Stock: <span className={cn("font-black", (stocks[selectedLocation] || 0) < 1 ? "text-red-400" : "text-green-400")}>
                      {stocks[selectedLocation] || 0} plateaux
                    </span>
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Date de Vente</Label>
                  <Input 
                    type="date" 
                    value={saleDate} 
                    onChange={e => setSaleDate(e.target.value)} 
                    className="h-12 rounded-2xl bg-slate-800 border-slate-700" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Client</Label>
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger className="h-14 rounded-2xl bg-slate-800 border-slate-700 font-bold">
                    <SelectValue placeholder="Sélectionner un client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Plateaux</Label>
                  <Input 
                    type="number" 
                    value={quantity} 
                    onChange={e => setQuantity(parseInt(e.target.value) || 0)} 
                    className="h-16 rounded-2xl font-black text-2xl bg-slate-800 border-slate-700 text-blue-500"
                  />
                  {(stocks[selectedLocation] || 0) < quantity && (
                    <p className="text-[10px] text-red-400 font-extrabold ml-1 animate-pulse">
                      Dépasse le stock restant !
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Prix / Plateau</Label>
                  <Input 
                    type="number" 
                    value={unitPrice} 
                    onChange={e => setUnitPrice(parseInt(e.target.value) || 0)} 
                    className="h-16 rounded-2xl font-black text-2xl bg-slate-800 border-slate-700"
                  />
                </div>
              </div>

              <div className="p-6 bg-blue-600/10 rounded-3xl border border-blue-500/20 flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Total Encaissé</span>
                <span className="text-3xl font-black text-white">{(quantity * unitPrice).toLocaleString()} <span className="text-xs">KMF</span></span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant={paymentMethod === 'cash' ? 'default' : 'outline'} 
                  onClick={() => setPaymentMethod('cash')}
                  className={cn("h-14 rounded-2xl font-bold gap-3", paymentMethod === 'cash' ? "bg-white text-[#020617]" : "border-slate-800")}
                >
                  <Banknote className="w-5 h-5" /> Cash
                </Button>
                <Button 
                  variant={paymentMethod === 'mobile' ? 'default' : 'outline'} 
                  onClick={() => setPaymentMethod('mobile')}
                  className={cn("h-14 rounded-2xl font-bold gap-3", paymentMethod === 'mobile' ? "bg-white text-[#020617]" : "border-slate-800")}
                >
                  <CreditCard className="w-5 h-5" /> Mvola
                </Button>
              </div>

              <Button 
                onClick={handleCreateSale}
                disabled={isSubmitting} 
                className="w-full h-16 rounded-2xl text-lg font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-700 mt-2 shadow-xl shadow-blue-500/20"
              >
                {isSubmitting ? 'Validation...' : 'Valider la Vente'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [...Array(6)].map((_, i) => <Card key={i} className="h-44 rounded-3xl bg-slate-900 animate-pulse border-none" />)
        ) : sales.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-slate-900/20 rounded-[3rem] border border-dashed border-slate-800">
            <ShoppingCart className="w-16 h-16 text-slate-800 mx-auto mb-4" />
            <p className="text-slate-500 font-black uppercase tracking-widest">Aucune vente enregistrée.</p>
          </div>
        ) : (
          sales.map((sale) => (
            <Card key={sale.id} className="rounded-[2rem] bg-slate-900/40 border-slate-800/50 backdrop-blur-xl group hover:border-blue-500/30 transition-all overflow-hidden border">
              <CardContent className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h4 className="font-black text-lg text-white mb-1">{(sale as any).clientName}</h4>
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">
                      {sale.date?.toDate ? format(sale.date.toDate(), 'dd MMM, HH:mm') : 
                       sale.date ? format(new Date(sale.date), 'dd MMM, HH:mm') : '...'}
                    </p>
                  </div>
                  <Badge className="bg-blue-500/10 text-blue-500 rounded-full border-none font-black text-[10px] px-3 py-1 shadow-inner ring-1 ring-blue-500/20">
                    {(sale as any).location}
                  </Badge>
                </div>
                
                <div className="flex justify-between items-end pt-6 border-t border-slate-800/50">
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-500 mb-1 tracking-widest">{sale.quantity} Plateaux</p>
                    <p className="text-2xl font-black text-white">{sale.totalPrice.toLocaleString()} <span className="text-[10px] opacity-40 font-bold tracking-tight">KMF</span></p>
                  </div>
                  <div className={cn(
                    "p-3 rounded-2xl shadow-inner",
                    sale.paymentMethod === 'cash' ? "bg-green-500/10 text-green-500" : "bg-purple-500/10 text-purple-500"
                  )}>
                    {sale.paymentMethod === 'cash' ? <Banknote className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

