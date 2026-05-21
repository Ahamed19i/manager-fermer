import React, { useEffect, useState } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  getDocs,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Activity, 
  Egg, 
  ShoppingCart, 
  Package, 
  History,
  AlertCircle,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { cn } from '../lib/utils';

interface LogEntry {
  id: string;
  type: 'production' | 'sale' | 'order' | 'stock';
  title: string;
  description: string;
  timestamp: Timestamp | Date | any;
  status?: string;
  user?: string;
  value?: string;
}

export default function Logs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      try {
        const [prodSnap, salesSnap, ordersSnap, stockSnap] = await Promise.all([
          getDocs(query(collection(db, 'productions'), orderBy('date', 'desc'), limit(10))),
          getDocs(query(collection(db, 'sales'), orderBy('date', 'desc'), limit(10))),
          getDocs(query(collection(db, 'orders'), orderBy('date', 'desc'), limit(10))),
          getDocs(query(collection(db, 'stockLogs'), orderBy('timestamp', 'desc'), limit(10)))
        ]);

        const combinedLogs: LogEntry[] = [
          ...prodSnap.docs.map(doc => ({
            id: doc.id,
            type: 'production' as const,
            title: 'Nouvelle Récolte',
            description: `${doc.data().quantity} plateaux enregistrés`,
            timestamp: doc.data().date,
            user: 'Équipe Ferme',
            value: `+${doc.data().quantity}`
          })),
          ...salesSnap.docs.map(doc => ({
            id: doc.id,
            type: 'sale' as const,
            title: 'Vente Directe',
            description: `Vendu à ${doc.data().clientName || 'un client'}`,
            timestamp: doc.data().date,
            user: 'Vendeur Terrain',
            value: `${doc.data().totalPrice.toLocaleString()} KMF`
          })),
          ...ordersSnap.docs.map(doc => ({
            id: doc.id,
            type: 'order' as const,
            title: 'Nouvelle Commande',
            description: `Commande de ${doc.data().quantity} plateaux`,
            timestamp: doc.data().date,
            status: doc.data().status,
            user: 'Interface Client',
            value: `${doc.data().quantity} pl.`
          })),
          ...stockSnap.docs.map(doc => ({
            id: doc.id,
            type: 'stock' as const,
            title: 'Mouvement Stock',
            description: `Transfert/Ajustement à ${doc.data().location}`,
            timestamp: doc.data().timestamp,
            user: 'Logistique',
            value: doc.data().quantity > 0 ? `+${doc.data().quantity}` : `${doc.data().quantity}`
          }))
        ];

        // Sort by timestamp desc
        combinedLogs.sort((a, b) => {
          const timeA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : new Date(a.timestamp).getTime();
          const timeB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : new Date(b.timestamp).getTime();
          return timeB - timeA;
        });

        setLogs(combinedLogs.slice(0, 30));
      } catch (error) {
        console.error("Error fetching logs:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchLogs();
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'production': return <Egg className="w-5 h-5 text-orange-500" />;
      case 'sale': return <ShoppingCart className="w-5 h-5 text-green-500" />;
      case 'order': return <History className="w-5 h-5 text-blue-500" />;
      case 'stock': return <Package className="w-5 h-5 text-purple-500" />;
      default: return <Activity className="w-5 h-5 text-slate-500" />;
    }
  };

  const getBg = (type: string) => {
    switch (type) {
      case 'production': return 'bg-orange-500/10';
      case 'sale': return 'bg-green-500/10';
      case 'order': return 'bg-blue-500/10';
      case 'stock': return 'bg-purple-500/10';
      default: return 'bg-slate-500/10';
    }
  };

  return (
    <div className="space-y-8 font-sans">
      <header>
        <h1 className="text-3xl font-black text-white">Journal d'Activité</h1>
        <p className="text-slate-500 font-medium tracking-tight">Suivez les opérations de PouleCom en temps réel.</p>
      </header>

      <Card className="rounded-[2.5rem] bg-slate-900/40 border-slate-800/50 backdrop-blur-3xl shadow-2xl p-0 overflow-hidden border">
        <CardHeader className="p-8 border-b border-slate-800/50 bg-slate-900/20">
          <CardTitle className="text-xl font-bold flex items-center gap-4 text-white">
            <div className="p-2 bg-blue-500/10 rounded-xl">
              <Clock className="text-blue-500 w-5 h-5 animate-pulse" />
            </div>
            Flux des opérations (Live)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex gap-4 items-start animate-pulse">
                  <div className="w-10 h-10 bg-slate-800 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/3 bg-slate-800 rounded" />
                    <div className="h-3 w-1/2 bg-slate-800 rounded opacity-50" />
                  </div>
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="py-24 text-center">
              <AlertCircle className="w-16 h-16 text-slate-800 mx-auto mb-4" />
              <p className="text-slate-500 font-black uppercase tracking-widest">Aucune donnée récente.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/50">
              {logs.map((log) => (
                <div key={log.id} className="p-6 hover:bg-white/5 transition-all group flex items-start gap-6">
                  <div className={cn("p-3 rounded-2xl shadow-inner shrink-0", getBg(log.type))}>
                    {getIcon(log.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h4 className="font-black text-white flex items-center gap-2">
                        {log.title}
                        {log.status && (
                          <Badge className="text-[9px] font-black uppercase tracking-tighter bg-slate-800 text-slate-400">
                            {log.status}
                          </Badge>
                        )}
                      </h4>
                      <span className="text-xl font-black text-white opacity-40 group-hover:opacity-100 transition-opacity">
                        {log.value}
                      </span>
                    </div>
                    
                    <p className="text-sm text-slate-400 font-medium truncate mb-2">{log.description}</p>
                    
                    <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-slate-600">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        {log.timestamp?.toDate 
                          ? format(log.timestamp.toDate(), 'd MMM, HH:mm', { locale: fr })
                          : format(new Date(log.timestamp), 'd MMM, HH:mm', { locale: fr })}
                      </span>
                      <span className="flex items-center gap-1.5 text-blue-500/50">
                        <Activity className="w-3 h-3" />
                        {log.user}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
