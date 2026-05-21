import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  TrendingDown, 
  Egg, 
  ShoppingCart, 
  DollarSign, 
  Package,
  ArrowUpRight,
  ChevronRight,
  History,
  Clock,
  Timer,
  ShieldCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { cn } from '../lib/utils';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { format, subDays, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';

interface DashboardStats {
  todayProduction: number;
  todaySales: number;
  todayRevenue: number;
  totalStock: number;
}

const mockChartData = [
  { name: 'Lun', production: 400, sales: 240 },
  { name: 'Mar', production: 300, sales: 139 },
  { name: 'Mer', production: 200, sales: 980 },
  { name: 'Jeu', production: 278, sales: 390 },
  { name: 'Ven', production: 189, sales: 480 },
  { name: 'Sam', production: 239, sales: 380 },
  { name: 'Dim', production: 349, sales: 430 },
];

export default function Dashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    todayProduction: 0,
    todaySales: 0,
    todayRevenue: 0,
    totalStock: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [trends, setTrends] = useState({
    revenue: '0%',
    sales: '0%',
    production: '0%',
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        const today = new Date();
        
        if (profile?.role === 'client') {
          // Client specific stats/data
          const ordersQuery = query(
            collection(db, 'orders'),
            where('clientId', '==', profile.uid),
            orderBy('date', 'desc'),
            limit(5)
          );
          const ordersSnap = await getDocs(ordersQuery);
          setRecentOrders(ordersSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) })));
        } else {
          // Admin/Employee stats
          const prodSnap = await getDocs(collection(db, 'productions'));
          let totalProd = 0;
          prodSnap.forEach(doc => {
            totalProd += Number(doc.data().quantity || 0);
          });

          const salesSnap = await getDocs(collection(db, 'sales'));
          let totalSales = 0;
          let totalRevenue = 0;
          salesSnap.forEach(doc => {
            totalSales += Number(doc.data().quantity || 0);
            totalRevenue += Number(doc.data().totalPrice || 0);
          });

          const officialLocations = ['Centrale', 'Moroni', 'Mitsamihouli', 'Mkazi', 'Itsinkoudi'];
          const stockSnap = await getDocs(collection(db, 'stocks'));
          const stockData = stockSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

          const finalStocks = officialLocations.map(loc => {
            const found = stockData.find(s => (s as any).location === loc);
            return found || { id: loc, location: loc, quantity: 0 };
          });
          const totalStock = finalStocks.reduce((acc, s) => acc + Number((s as any).quantity || 0), 0);

          // Dynamic chart data for the last 7 days
          const chartDays = Array.from({ length: 7 }, (_, i) => {
            const d = subDays(today, 6 - i);
            const dateStr = format(d, 'yyyy-MM-dd');
            let name = format(d, 'EEE', { locale: fr });
            name = name.replace('.', '');
            name = name.charAt(0).toUpperCase() + name.slice(1);
            return {
              dateStr,
              name,
              production: 0,
              sales: 0
            };
          });

          // Compute trend periods (Last 7 days vs Prev 7 days)
          const dateRangeLast7 = chartDays.map(day => day.dateStr);
          const dateRangePrev7 = Array.from({ length: 7 }, (_, i) => {
            const d = subDays(today, 13 - i);
            return format(d, 'yyyy-MM-dd');
          });

          let cur7Prod = 0;
          let prev7Prod = 0;
          let cur7Sales = 0;
          let prev7Sales = 0;
          let cur7Rev = 0;
          let prev7Rev = 0;

          prodSnap.forEach(doc => {
            const data = doc.data();
            const quantity = Number(data.quantity || 0);
            const dateStr = data.date; // formatted as 'yyyy-MM-dd' inside Production.tsx
            
            // Map to chart day
            const matchingDay = chartDays.find(day => day.dateStr === dateStr);
            if (matchingDay) {
              matchingDay.production += quantity;
            }

            // Cumulate for trend
            if (dateRangeLast7.includes(dateStr)) {
              cur7Prod += quantity;
            } else if (dateRangePrev7.includes(dateStr)) {
              prev7Prod += quantity;
            }
          });

          salesSnap.forEach(doc => {
            const data = doc.data();
            const quantity = Number(data.quantity || 0);
            const price = Number(data.totalPrice || 0);
            const saleDateVal = data.date;
            
            let sDate: Date;
            if (saleDateVal?.toDate) {
              sDate = saleDateVal.toDate();
            } else if (saleDateVal) {
              sDate = new Date(saleDateVal);
            } else {
              return;
            }
            
            const saleDateStr = format(sDate, 'yyyy-MM-dd');
            
            // Map to chart day
            const matchingDay = chartDays.find(day => day.dateStr === saleDateStr);
            if (matchingDay) {
              matchingDay.sales += quantity;
            }

            // Cumulate for trend
            if (dateRangeLast7.includes(saleDateStr)) {
              cur7Sales += quantity;
              cur7Rev += price;
            } else if (dateRangePrev7.includes(saleDateStr)) {
              prev7Sales += quantity;
              prev7Rev += price;
            }
          });

          const getTrendStr = (cur: number, prev: number) => {
            if (prev === 0) return cur > 0 ? `+${cur} plat.` : '0%';
            const pct = Math.round(((cur - prev) / prev) * 100);
            return `${pct >= 0 ? '+' : ''}${pct}%`;
          };

          const getRevenueTrendStr = (cur: number, prev: number) => {
            if (prev === 0) return cur > 0 ? `+${cur.toLocaleString()} KMF` : '0%';
            const pct = Math.round(((cur - prev) / prev) * 100);
            return `${pct >= 0 ? '+' : ''}${pct}%`;
          };

          setStats({
            todayProduction: totalProd,
            todaySales: totalSales,
            todayRevenue: totalRevenue,
            totalStock: totalStock
          });

          setTrends({
            revenue: getRevenueTrendStr(cur7Rev, prev7Rev),
            sales: getTrendStr(cur7Sales, prev7Sales),
            production: getTrendStr(cur7Prod, prev7Prod),
          });

          setChartData(chartDays);
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [profile]);

  if (profile?.role === 'client') {
    return (
      <div className="space-y-8">
        <header>
          <h1 className="text-3xl font-black text-white">Bienvenue, {profile?.displayName?.split(' ')[0]}</h1>
          <p className="text-slate-500 font-medium tracking-tight">Suivez vos commandes en temps réel.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard title="Commandes en cours" value={recentOrders.filter(o => o.status === 'pending').length} icon={Timer} color="orange" trend="Actuel" />
          <StatCard title="Total Achats" value={recentOrders.length} icon={Package} color="blue" trend="Historique" />
          <StatCard title="Plateaux achetés" value={recentOrders.reduce((acc, o) => acc + o.quantity, 0)} icon={Egg} color="green" trend="Total" />
        </div>

        <Card className="rounded-[2.5rem] bg-slate-900/40 border-slate-800/50 backdrop-blur-3xl p-8">
          <CardHeader className="px-0 pt-0">
             <CardTitle className="text-xl font-bold text-white flex items-center gap-3">
               <History className="text-blue-500" /> Vos dernières activités
             </CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            {recentOrders.length === 0 ? (
               <p className="py-10 text-center text-slate-500 font-bold">Aucune activité récente.</p>
            ) : (
              <div className="space-y-4">
                {recentOrders.map(order => (
                  <div key={order.id} className="flex items-center justify-between p-4 bg-slate-900/50 rounded-2xl border border-slate-800">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500">
                        <Package className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-white">{order.quantity} Plateaux</p>
                        <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{order.date?.toDate ? format(order.date.toDate(), 'd MMM, HH:mm') : 'Date...'}</p>
                      </div>
                    </div>
                    <Badge className={cn(
                      "rounded-full px-3 py-1 font-black text-[10px] uppercase",
                      order.status === 'pending' ? "bg-orange-500/10 text-orange-500" : "bg-green-500/10 text-green-500"
                    )}>
                      {order.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white">Salut, {profile?.displayName?.split(' ')[0]} 👋</h1>
          <p className="text-slate-500 font-medium tracking-tight">Vue d'ensemble de l'exploitation PouleCom.</p>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-green-500 bg-green-500/10 border border-green-500/20 px-4 py-2 rounded-full w-fit">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Live Management
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Revenue (KMF)" 
          value={stats.todayRevenue.toLocaleString()} 
          icon={DollarSign} 
          color="blue"
          trend={trends.revenue} 
        />
        <StatCard 
          title="Ventes" 
          value={stats.todaySales.toLocaleString()} 
          icon={ShoppingCart} 
          color="green"
          trend={trends.sales} 
        />
        <StatCard 
          title="Production" 
          value={stats.todayProduction.toLocaleString()} 
          icon={Egg} 
          color="orange"
          trend={trends.production} 
        />
        <StatCard 
          title="Stock Total" 
          value={stats.totalStock.toLocaleString()} 
          icon={Package} 
          color="purple"
          trend="Stable" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart */}
        <Card className="lg:col-span-2 rounded-[2.5rem] bg-slate-900/40 border-slate-800/50 backdrop-blur-3xl overflow-hidden shadow-2xl">
          <CardHeader className="flex flex-row items-center justify-between p-8 pt-10">
            <CardTitle className="text-xl font-bold text-white">Activité Hebdomadaire</CardTitle>
            <Button variant="ghost" size="sm" className="text-blue-500 text-xs font-black uppercase tracking-widest px-4 h-10 rounded-xl hover:bg-white/5">Détails <ChevronRight className="w-4 h-4" /></Button>
          </CardHeader>
          <CardContent className="h-[300px] p-8 pt-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorProd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B', fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B', fontWeight: 'bold' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '24px', border: '1px solid #1e293b', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontWeight: 'black', textTransform: 'uppercase', fontSize: '10px' }}
                />
                <Area type="monotone" dataKey="production" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorProd)" />
                <Area type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={4} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Actions */}
        <Card className="rounded-[2.5rem] bg-slate-900/40 border-slate-800/50 backdrop-blur-3xl shadow-2xl p-8">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-xl font-bold text-white">Actions Rapides</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-0">
            <ActionButton label="Enregistrer Récolte" icon={Egg} color="bg-orange-500/10 text-orange-500" path="/production" />
            <ActionButton label="Saisir une Vente" icon={ShoppingCart} color="bg-green-500/10 text-green-500" path="/sales" />
            <ActionButton label="Transfert Stock" icon={Package} color="bg-blue-500/10 text-blue-500" path="/stock" />
            {profile?.email === 'hassanimhoma2019@gmail.com' && (
              <ActionButton label="Gérer l'Équipe" icon={ShieldCheck} color="bg-red-500/10 text-red-500" path="/users" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, trend }: any) {
  const colors: any = {
    blue: 'bg-blue-600/10 text-blue-500',
    green: 'bg-green-600/10 text-green-500',
    orange: 'bg-orange-600/10 text-orange-500',
    purple: 'bg-purple-600/10 text-purple-500',
  };

  return (
    <Card className="rounded-3xl border-slate-800/50 bg-slate-900/40 backdrop-blur-xl shadow-lg ring-1 ring-white/5 overflow-hidden">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-6">
          <div className={`${colors[color]} p-3 rounded-2xl shadow-inner`}>
            <Icon className="w-6 h-6" />
          </div>
          <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${trend.startsWith('+') ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
            {trend}
          </span>
        </div>
        <div>
          <p className="text-slate-500 text-[10px] uppercase font-black tracking-[0.2em] mb-2">{title}</p>
          <h3 className="text-3xl font-black text-white leading-none tracking-tight">{value}</h3>
        </div>
      </CardContent>
    </Card>
  );
}

function ActionButton({ label, icon: Icon, color, path }: any) {
  const navigate = useNavigate();
  return (
    <button 
      onClick={() => path && navigate(path)}
      className="w-full flex items-center justify-between p-5 bg-slate-900/60 hover:bg-slate-800 rounded-3xl border border-slate-800 transition-all group active:scale-95"
    >
      <div className="flex items-center gap-4">
        <div className={`p-2.5 rounded-2xl ${color} shadow-inner`}>
          <Icon className="w-6 h-6" />
        </div>
        <span className="font-bold text-sm text-slate-200 group-hover:text-white">{label}</span>
      </div>
      <ArrowUpRight className="w-5 h-5 text-slate-600 group-hover:text-blue-500 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
    </button>
  );
}

