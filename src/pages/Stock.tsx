import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, runTransaction, serverTimestamp, query, orderBy, limit } from 'firebase/firestore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
  Box, 
  ArrowRightLeft, 
  History,
  TrendingDown,
  Warehouse,
  Truck,
  ArrowDownToLine,
  ChevronRight,
  Sparkles,
  Calculator,
  Wrench,
  Trash2
} from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

interface StockLocation {
  id: string;
  location: string;
  quantity: number;
}

const locations = ['Centrale', 'Moroni', 'Mitsamihouli', 'Mkazi', 'Itsinkoudi'];

interface StockLog {
  id: string;
  type: string;
  from?: string;
  to?: string;
  location?: string;
  quantity: number;
  timestamp: any;
}

export default function Stock() {
  const { profile } = useAuth();
  const [stocks, setStocks] = useState<StockLocation[]>([]);
  const [logs, setLogs] = useState<StockLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Transfer states
  const [fromLoc, setFromLoc] = useState('Centrale');
  const [toLoc, setToLoc] = useState('Moroni');
  const [qty, setQty] = useState(1);

  // New features interactive state
  const [isBesoinsOpen, setIsBesoinsOpen] = useState(false);
  const [isInventaireOpen, setIsInventaireOpen] = useState(false);
  const [isInventaireSubmitting, setIsInventaireSubmitting] = useState(false);
  
  // Forecast state
  const [pendingOrdersQty, setPendingOrdersQty] = useState(0);
  const [avgSalesQty, setAvgSalesQty] = useState(1200);

  // Inventaire state
  const [inventaireLocation, setInventaireLocation] = useState('Centrale');
  const [inventairePhysicalQty, setInventairePhysicalQty] = useState(0);

  useEffect(() => {
    fetchStocks();
    fetchLogs();
    fetchForecastData();
  }, []);

  async function fetchForecastData() {
    try {
      const ordersSnap = await getDocs(collection(db, 'orders'));
      let pendingSum = 0;
      ordersSnap.forEach(doc => {
        const d = doc.data();
        if (d.status === 'pending' || d.status === 'confirmed') {
          pendingSum += Number(d.quantity || 0);
        }
      });
      setPendingOrdersQty(pendingSum);

      const salesSnap = await getDocs(collection(db, 'sales'));
      let salesSum = 0;
      let salesCount = 0;
      salesSnap.forEach(doc => {
        salesSum += Number(doc.data().quantity || 0);
        salesCount++;
      });
      if (salesCount > 0) {
        const avg = Math.round(salesSum / Math.max(1, Math.ceil(salesCount / 7)));
        setAvgSalesQty(avg > 0 ? avg : 1200);
      } else {
        setAvgSalesQty(1200);
      }
    } catch (error) {
      console.error("Error fetching forecast: ", error);
    }
  }

  async function fetchLogs() {
    try {
      const q = query(collection(db, 'stockLogs'), orderBy('timestamp', 'desc'), limit(15));
      const snap = await getDocs(q);
      setLogs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as StockLog)));
    } catch (error) {
      console.error(error);
    }
  }

  async function fetchStocks() {
    try {
      const snap = await getDocs(collection(db, 'stocks'));
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as StockLocation));
      // Ensure all locations are present in state even if not in DB
      const finalData = locations.map(loc => {
        const found = data.find(s => s.location === loc);
        return found || { id: loc, location: loc, quantity: 0 };
      });
      setStocks(finalData);
      
      const centraleStock = finalData.find(s => s.location === 'Centrale')?.quantity || 0;
      setInventairePhysicalQty(centraleStock);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const handleInventaireLocationChange = (val: string) => {
    setInventaireLocation(val);
    const existing = stocks.find(s => s.location === val)?.quantity || 0;
    setInventairePhysicalQty(existing);
  };

  async function handleInventaireSubmit() {
    setIsInventaireSubmitting(true);
    try {
      const currentLocStock = stocks.find(s => s.location === inventaireLocation)?.quantity || 0;
      const diff = inventairePhysicalQty - currentLocStock;

      await runTransaction(db, async (transaction) => {
        const stockRef = doc(db, 'stocks', inventaireLocation);
        
        transaction.set(stockRef, {
          location: inventaireLocation,
          quantity: inventairePhysicalQty,
          lastUpdated: serverTimestamp()
        }, { merge: true });

        // Log an adjustment
        const logRef = doc(collection(db, 'stockLogs'));
        transaction.set(logRef, {
          type: 'adjustment',
          location: inventaireLocation,
          quantity: diff,
          recordedBy: profile?.uid,
          timestamp: serverTimestamp()
        });
      });

      toast.success(`Inventaire enregistré pour ${inventaireLocation}! Différence: ${diff >= 0 ? '+' : ''}${diff} plateaux.`);
      setIsInventaireOpen(false);
      fetchStocks();
      fetchLogs();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erreur lors de la mise à jour de l'inventaire");
    } finally {
      setIsInventaireSubmitting(false);
    }
  }

  async function handleTransfer() {
    if (fromLoc === toLoc) {
      toast.error("Locations source et destination identiques");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await runTransaction(db, async (transaction) => {
        const fromRef = doc(db, 'stocks', fromLoc);
        const toRef = doc(db, 'stocks', toLoc);
        
        const fromSnap = await transaction.get(fromRef);
        const toSnap = await transaction.get(toRef);
        
        const fromQty = fromSnap.exists() ? fromSnap.data().quantity : 0;
        const toQty = toSnap.exists() ? toSnap.data().quantity : 0;
        
        if (fromQty < qty && fromLoc !== 'Ferme Centrale') {
          throw new Error("Stock insuffisant");
        }
        
        transaction.set(fromRef, { location: fromLoc, quantity: fromQty - qty, lastUpdated: serverTimestamp() }, { merge: true });
        transaction.set(toRef, { location: toLoc, quantity: toQty + qty, lastUpdated: serverTimestamp() }, { merge: true });
        
        // Log log
        const logRef = doc(collection(db, 'stockLogs'));
        transaction.set(logRef, {
          from: fromLoc,
          to: toLoc,
          quantity: qty,
          type: 'transfer',
          recordedBy: profile?.uid,
          timestamp: serverTimestamp()
        });
      });
      
      toast.success("Transfert réussi");
      setIsTransferOpen(false);
      fetchStocks();
    } catch (error: any) {
      toast.error(error.message || "Erreur transfert");
    } finally {
      setIsSubmitting(false);
    }
  }

  const isAdmin = profile?.role === 'admin' || profile?.email?.toLowerCase() === 'hassanimhoma2019@gmail.com';

  async function handleDeleteLog(logId: string) {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer définitivement ce flux de stock de l'historique ?")) {
      return;
    }
    try {
      await runTransaction(db, async (transaction) => {
        const logRef = doc(db, 'stockLogs', logId);
        transaction.delete(logRef);
      });
      toast.success("Flux de stock retiré de l'historique");
      fetchLogs();
    } catch (error: any) {
      console.error(error);
      toast.error(`Erreur de suppression : ${error.message}`);
    }
  }

  const totalStock = stocks.reduce((acc, s) => acc + s.quantity, 0);

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Gestion des Stocks</h1>
          <p className="text-slate-500 text-sm">Transferts de palettes (Plateaux de 30 œufs)</p>
        </div>

        <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-2xl gap-2 h-12 px-6 bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-500/20">
              <ArrowRightLeft className="w-5 h-5" /> Transférer Palettes
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-3xl bg-slate-900 border-slate-800 text-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Transfert entre points</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>De</Label>
                  <Select value={fromLoc} onValueChange={setFromLoc}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 rounded-xl h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Vers</Label>
                  <Select value={toLoc} onValueChange={setToLoc}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 rounded-xl h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Quantité de Plateaux</Label>
                <Input 
                  type="number" 
                  value={qty} 
                  onChange={e => setQty(parseInt(e.target.value))} 
                  className="h-14 rounded-xl font-black text-2xl bg-slate-800 border-slate-700" 
                />
              </div>

              <Button 
                onClick={handleTransfer}
                disabled={isSubmitting}
                className="w-full h-14 rounded-2xl bg-purple-600 font-bold text-lg"
              >
                Confirmer l'envoi
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Main Stats */}
        <Card className="md:col-span-1 rounded-3xl bg-blue-600 text-white border-none shadow-xl shadow-blue-500/20 p-4">
          <CardHeader>
            <CardTitle className="text-blue-100 flex items-center justify-between">
              Total Global <Box className="w-5 h-5 opacity-50" />
            </CardTitle>
            <div className="text-5xl font-black mt-2">{totalStock.toLocaleString()}</div>
            <p className="text-blue-200 text-sm mt-1">Œufs en stock aujourd'hui</p>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
             {/* Dynamic interactive needs tomorrow card click trigger */}
             <div 
               onClick={() => setIsBesoinsOpen(true)}
               className="cursor-pointer flex justify-between items-center bg-white/10 p-4 rounded-2xl backdrop-blur-sm hover:bg-white/20 transition-all group"
             >
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Besoins demain</span>
                  <span className="text-[10px] text-blue-200 group-hover:underline">Voir analyse</span>
                </div>
                <span className="font-bold text-lg">~{Math.max(pendingOrdersQty, avgSalesQty).toLocaleString()}</span>
             </div>
             
             {/* Interactive Inventaire button trigger */}
             <button 
               onClick={() => {
                 setInventaireLocation('Centrale');
                 const count = stocks.find(s => s.location === 'Centrale')?.quantity || 0;
                 setInventairePhysicalQty(count);
                 setIsInventaireOpen(true);
               }}
               className="w-full py-4 bg-white text-blue-600 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-50 transition-colors shadow-md"
             >
               Lancer un Inventaire
             </button>
          </CardContent>
        </Card>

        {/* Modal for Besoins de demain forecast */}
        <Dialog open={isBesoinsOpen} onOpenChange={setIsBesoinsOpen}>
          <DialogContent className="rounded-[2rem] bg-slate-900 border-slate-800 text-white max-w-md shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-2">
                <Calculator className="w-6 h-6 text-blue-500" /> Besoins Estimés Demain
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                Prévisions et objectifs de stock calculés automatiquement en temps réel.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 pt-4">
              <div className="space-y-4">
                <div className="p-4 bg-slate-850 bg-opacity-40 border border-slate-800 rounded-2xl flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-slate-300">Commandes confirmées</h4>
                    <p className="text-xs text-slate-500">Total des commandes clients en attente</p>
                  </div>
                  <span className="text-xl font-bold text-blue-400">{pendingOrdersQty.toLocaleString()} <span className="text-xs text-slate-500">plat.</span></span>
                </div>

                <div className="p-4 bg-slate-850 bg-opacity-40 border border-slate-800 rounded-2xl flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-slate-300">Moyenne des ventes quotidiennes</h4>
                    <p className="text-xs text-slate-500">Performance moyenne récente pour comparaison</p>
                  </div>
                  <span className="text-xl font-bold text-green-400">{avgSalesQty.toLocaleString()} <span className="text-xs text-slate-500">plat.</span></span>
                </div>

                <div className="p-4 bg-slate-850 bg-opacity-40 border border-slate-800 rounded-2xl flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-slate-300">Stock de Sécurité conseillé</h4>
                    <p className="text-xs text-slate-500">Marge de précaution standard de 20%</p>
                  </div>
                  <span className="text-lg font-bold text-purple-400">
                    {Math.round(Math.max(pendingOrdersQty, avgSalesQty) * 0.2).toLocaleString()} <span className="text-xs text-slate-500">plat.</span>
                  </span>
                </div>
              </div>

              <div className="p-6 bg-blue-600/15 rounded-2xl border border-blue-500/20 text-center space-y-1">
                <span className="text-[10px] uppercase font-black tracking-widest text-blue-400">Besoins Totaux Calculés</span>
                <div className="text-3xl font-black text-white">
                  {Math.round(Math.max(pendingOrdersQty, avgSalesQty) * 1.2).toLocaleString()} <span className="text-sm font-medium">Plateaux</span>
                </div>
                <p className="text-[10px] text-slate-400">Protégera vos livraisons contre l'épuisement soudain de stock.</p>
              </div>

              <Button 
                onClick={() => setIsBesoinsOpen(false)}
                className="w-full h-12 rounded-2xl bg-blue-600 font-bold hover:bg-blue-700 font-black text-xs uppercase"
              >
                Fermer l'analyse
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal for Lancer un Inventaire Adjustment */}
        <Dialog open={isInventaireOpen} onOpenChange={setIsInventaireOpen}>
          <DialogContent className="rounded-[2rem] bg-slate-900 border-slate-800 text-white max-w-md shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-2">
                <Wrench className="w-5 h-5 text-purple-500" /> Réconciliation d'Inventaire
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                Ajustez le stock réel constaté physiquement. Une correction sera enregistrée et datée.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 pt-4">
              <div className="space-y-2">
                <Label className="text-slate-400 font-bold text-xs uppercase tracking-wider">Point de Stock</Label>
                <Select value={inventaireLocation} onValueChange={handleInventaireLocationChange}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 rounded-xl h-12 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-white">
                    {locations.map(loc => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-800 text-center">
                  <span className="text-[10px] uppercase text-slate-500 font-bold col-span-1">Stock Théorique</span>
                  <div className="text-2xl font-black text-slate-300 mt-1">
                    {stocks.find(s => s.location === inventaireLocation)?.quantity || 0}
                  </div>
                </div>

                <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-800 text-center">
                  <span className="text-[10px] uppercase text-slate-500 font-bold col-span-1">Écart Enregistré</span>
                  <div className={cn(
                    "text-2xl font-black mt-1",
                    inventairePhysicalQty - (stocks.find(s => s.location === inventaireLocation)?.quantity || 0) > 0 ? "text-green-500" :
                    inventairePhysicalQty - (stocks.find(s => s.location === inventaireLocation)?.quantity || 0) < 0 ? "text-red-500" : "text-slate-400"
                  )}>
                    {inventairePhysicalQty - (stocks.find(s => s.location === inventaireLocation)?.quantity || 0) > 0 ? '+' : ''}
                    {inventairePhysicalQty - (stocks.find(s => s.location === inventaireLocation)?.quantity || 0)}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-400 font-bold text-xs uppercase tracking-wider">Quantité Constatée Réelle (Plateaux)</Label>
                <Input 
                  type="number" 
                  value={inventairePhysicalQty} 
                  onChange={e => setInventairePhysicalQty(parseInt(e.target.value) || 0)} 
                  className="h-14 rounded-xl font-black text-3xl bg-slate-800 border-slate-700 text-blue-500" 
                />
              </div>

              <Button 
                onClick={handleInventaireSubmit}
                disabled={isInventaireSubmitting}
                className="w-full h-14 rounded-2xl bg-purple-600 font-bold text-lg hover:bg-purple-700 shadow-lg shadow-purple-500/20"
              >
                {isInventaireSubmitting ? 'Enregistrement...' : 'Confirmer la Réconciliation'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Distribution */}
        <Card className="md:col-span-2 rounded-[2.5rem] bg-slate-900/40 border-slate-800/50 backdrop-blur-3xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-white">Points de Vente & Stock</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-8">
            {loading ? (
               [...Array(4)].map((_, i) => <div key={i} className="h-24 w-full bg-slate-800 animate-pulse rounded-2xl" />)
            ) : stocks.length === 0 ? (
               <div className="col-span-full text-center py-10 text-slate-500">Aucun emplacement configuré.</div>
            ) : (
               stocks.map((stock) => (
                 <div key={stock.id} className="p-6 bg-slate-900/60 rounded-3xl border border-slate-800 transition-all hover:border-slate-700">
                   <div className="flex items-center gap-4 mb-4">
                     <div className="w-12 h-12 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-500 shadow-inner">
                       {stock.location.toLowerCase().includes('ferme') ? <Warehouse className="w-6 h-6" /> : <Truck className="w-6 h-6" />}
                     </div>
                     <div>
                       <h4 className="font-black text-xs uppercase tracking-widest text-slate-500 mb-0.5">{stock.location.toLowerCase().includes('ferme') ? 'Centrale' : 'Point de vente'}</h4>
                       <h3 className="font-black text-lg text-white capitalize">{stock.location}</h3>
                     </div>
                   </div>
                   
                   <div className="flex justify-between items-end">
                     <span className="text-[10px] font-black uppercase text-slate-500">Quantité Palette</span>
                     <span className="text-2xl font-black text-blue-500">{stock.quantity}</span>
                   </div>
                 </div>
               ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* History of Transfers */}
      <Card className="rounded-[2.5rem] bg-slate-900/40 border-slate-800/50 backdrop-blur-3xl shadow-2xl overflow-hidden border">
        <CardHeader className="p-8 pt-10 border-b border-slate-800/50 bg-slate-900/20 flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-bold flex items-center gap-4 text-white">
            <div className="p-2 bg-purple-500/10 rounded-xl">
              <History className="text-purple-500 w-5 h-5" />
            </div>
            Flux de Stock récents
          </CardTitle>
          <Badge className="bg-slate-800 text-slate-400 font-bold px-3 py-1 border-none ring-1 ring-slate-700/50">Temps réel</Badge>
        </CardHeader>
        <CardContent className="p-0">
           {logs.length === 0 ? (
             <div className="p-12 text-center text-slate-500 font-black uppercase tracking-widest">
               Aucun mouvement récent.
             </div>
           ) : (
             <div className="divide-y divide-slate-800/50">
                {logs.map((log) => (
                  <StockLogItem 
                    key={log.id}
                    type={log.type} 
                    from={log.from || (log.type === 'production' ? 'Récolte' : log.type === 'adjustment' ? 'Ajustement' : log.location)} 
                    to={log.to || (log.type === 'production' ? 'Centrale' : log.type === 'adjustment' ? log.location : 'Client')} 
                    qty={log.quantity} 
                    time={log.timestamp?.toDate ? format(log.timestamp.toDate(), 'HH:mm (dd MMM)', { locale: fr }) : '...'} 
                    onDelete={isAdmin ? () => handleDeleteLog(log.id) : undefined}
                  />
                ))}
             </div>
           )}
        </CardContent>
      </Card>
    </div>
  );
}

function StockLogItem({ type, from, to, qty, time, onDelete }: any) {
  const icons: any = {
    transfer: <ArrowRightLeft className="w-4 h-4 text-blue-500" />,
    production: <ArrowDownToLine className="w-4 h-4 text-green-500" />,
    sale: <TrendingDown className="w-4 h-4 text-orange-500" />,
    adjustment: <Box className="w-4 h-4 text-purple-500" />
  };

  return (
    <div className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
       <div className="flex items-center gap-4">
         <div className="p-2 bg-white dark:bg-slate-900 rounded-xl shadow-sm">
            {icons[type]}
         </div>
         <div>
            <div className="flex items-center gap-2">
               <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">{from}</span>
               <ChevronRight className="w-3 h-3 text-slate-300" />
               <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">{to}</span>
            </div>
            <p className="font-bold text-sm dark:text-white">
              {type === 'transfer' ? 'Transfert inter-sites' : 
               type === 'production' ? 'Entrée Production' : 
               type === 'adjustment' ? 'Ajustement Inventaire' : 
               'Vente Client'}
            </p>
         </div>
       </div>
       <div className="text-right flex items-center gap-1.5">
          <div>
             <p className={`font-black ${qty > 1000 ? 'text-blue-600' : 'text-slate-900 dark:text-white'}`}>
                {type === 'adjustment' && qty > 0 ? `+${qty.toLocaleString()}` : qty.toLocaleString()}
             </p>
             <p className="text-[10px] text-slate-400 font-bold uppercase">{time}</p>
          </div>
          {onDelete && (
             <button
               onClick={onDelete}
               className="p-1.5 hover:bg-red-950/30 rounded-lg text-slate-500 hover:text-red-400 transition-all cursor-pointer h-7 w-7 flex items-center justify-center opacity-70 hover:opacity-100 border-none ml-2"
               title="Supprimer ce flux"
             >
                <Trash2 className="w-3 h-3" />
             </button>
          )}
       </div>
    </div>
  );
}
