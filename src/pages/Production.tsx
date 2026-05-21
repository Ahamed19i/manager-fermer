import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, orderBy, limit, getDocs, serverTimestamp, runTransaction, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../components/ui/table';
import { Egg, Plus, Calendar, History } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ProductionRecord {
  id: string;
  date: string;
  quantity: number;
  broken: number;
  recordedBy: string;
}

export default function Production() {
  const { profile } = useAuth();
  const [history, setHistory] = useState<ProductionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  async function fetchHistory() {
    try {
      const q = query(
        collection(db, 'productions'),
        orderBy('date', 'desc'),
        limit(10)
      );
      const querySnapshot = await getDocs(q);
      const records: ProductionRecord[] = [];
      querySnapshot.forEach((doc) => {
        records.push({ id: doc.id, ...doc.data() } as ProductionRecord);
      });
      setHistory(records);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!profile) return;
    
    const form = e.currentTarget;
    setIsSubmitting(true);
    const formData = new FormData(form);
    const quantity = parseInt(formData.get('quantity') as string);
    const broken = parseInt(formData.get('broken') as string) || 0;
    const date = formData.get('date') as string;

    try {
      await runTransaction(db, async (transaction) => {
        // 1. All GETs first
        const stockRef = doc(db, 'stocks', 'Centrale');
        const stockSnap = await transaction.get(stockRef);
        const currentQty = stockSnap.exists() ? stockSnap.data().quantity : 0;
        
        // 2. All SETs/UPDATEs after
        const prodRef = doc(collection(db, 'productions'));
        transaction.set(prodRef, {
          date,
          quantity,
          broken,
          recordedBy: profile.uid,
          createdAt: serverTimestamp(),
        });

        transaction.set(stockRef, {
          location: 'Centrale',
          quantity: currentQty + quantity,
          lastUpdated: serverTimestamp()
        }, { merge: true });

        // Log du mouvement de stock
        const logRef = doc(collection(db, 'stockLogs'));
        transaction.set(logRef, {
          type: 'production',
          location: 'Centrale',
          quantity: quantity,
          recordedBy: profile.uid,
          timestamp: serverTimestamp()
        });
      });

      toast.success('Récolte enregistrée et stock mis à jour');
      form.reset();
      fetchHistory();
    } catch (error: any) {
      console.error("Firestore Transaction Error:", error);
      
      // Standardized error info for diagnostics
      const errInfo = {
        error: error.message,
        code: error.code,
        path: 'productions/stocks/stockLogs',
        operation: 'transaction'
      };
      
      toast.error(`Erreur: ${error.code === 'permission-denied' ? 'Accès refusé' : error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-8 font-sans">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white">Production Œufs</h1>
          <p className="text-slate-500 font-medium tracking-tight">Suivi de la récolte à la ferme centrale.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-4">
        {/* Entry Form */}
        <div className="lg:col-span-5">
          <Card className="rounded-[2.5rem] bg-slate-900/40 border-slate-800/50 backdrop-blur-3xl shadow-2xl sticky top-24 border">
            <CardHeader className="pt-10 px-10">
              <CardTitle className="text-2xl font-black tracking-tight flex items-center gap-4 text-white">
                <div className="p-3 bg-orange-500/10 rounded-2xl shadow-inner ring-1 ring-orange-500/20">
                  <Egg className="text-orange-500 w-7 h-7" />
                </div>
                Nouvelle Récolte
              </CardTitle>
            </CardHeader>
            <CardContent className="p-10 pt-6">
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-3">
                  <Label htmlFor="date" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Date de récolte</Label>
                  <div className="relative group">
                    <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-orange-500 transition-colors" />
                    <Input 
                      id="date" 
                      name="date" 
                      type="date" 
                      defaultValue={format(new Date(), 'yyyy-MM-dd')} 
                      required 
                      className="h-14 rounded-2xl pl-14 bg-slate-800/50 border-slate-700/50 text-white font-bold focus:ring-4 focus:ring-orange-500/10 transition-all"
                    />
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="quantity" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Quantité (Plateaux de 30)</Label>
                  <Input 
                    id="quantity" 
                    name="quantity" 
                    type="number" 
                    placeholder="0" 
                    required 
                    className="h-20 rounded-[1.5rem] text-4xl font-black bg-slate-800/50 border-slate-700/50 text-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all px-8 shadow-inner"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="broken" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Caries / Pertes (Œufs)</Label>
                  <Input 
                    id="broken" 
                    name="broken" 
                    type="number" 
                    placeholder="0" 
                    className="h-14 rounded-2xl bg-slate-800/50 border-slate-700/50 text-white font-bold px-6 focus:ring-4 focus:ring-red-500/10"
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="w-full h-16 rounded-[1.5rem] text-lg font-black uppercase tracking-widest bg-orange-500 hover:bg-orange-600 shadow-[0_15px_30px_-5px_rgba(249,115,22,0.3)] border-b-4 border-orange-700 active:border-b-0 active:translate-y-1 transition-all mt-4"
                >
                  {isSubmitting ? 'Synchronisation...' : 'Enregistrer la récolte'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* History Table */}
        <div className="lg:col-span-7">
          <Card className="rounded-[2.5rem] bg-slate-900/40 border-slate-800/50 backdrop-blur-3xl shadow-2xl overflow-hidden border">
            <CardHeader className="p-8 pt-10 border-b border-slate-800/50 bg-slate-900/20">
              <CardTitle className="text-xl font-bold flex items-center gap-4 text-white">
                <div className="p-2 bg-blue-500/10 rounded-xl">
                  <History className="text-blue-500 w-5 h-5" />
                </div>
                Historique de Production
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-900 border-slate-800">
                      <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-500 py-6 pl-8">Date</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-500">Récolte</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-500 pr-8 text-right">Pertes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      [...Array(5)].map((_, i) => (
                        <TableRow key={i} className="border-slate-800/50">
                          <TableCell className="pl-8"><div className="h-4 w-32 bg-slate-800 animate-pulse rounded-lg" /></TableCell>
                          <TableCell><div className="h-4 w-12 bg-slate-800 animate-pulse rounded-lg" /></TableCell>
                          <TableCell className="pr-8 text-right"><div className="h-4 w-8 bg-slate-800 animate-pulse rounded-lg ml-auto" /></TableCell>
                        </TableRow>
                      ))
                    ) : history.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-20 text-slate-500 font-black uppercase tracking-widest text-xs">Aucune production enregistrée.</TableCell>
                      </TableRow>
                    ) : (
                      history.map((record) => (
                        <TableRow key={record.id} className="text-white border-slate-800/50 hover:bg-white/5 transition-colors">
                          <TableCell className="font-bold py-6 pl-8 text-slate-300">
                            {format(new Date(record.date), 'dd MMM yyyy', { locale: fr })}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <span className="font-black text-lg">{record.quantity}</span>
                              <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Plateaux</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-red-500/80 font-black pr-8 text-right text-sm">
                            {(record.broken > 0) ? `-${record.broken} œufs` : '—'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
