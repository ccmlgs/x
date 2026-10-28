import React, { useState, useEffect } from 'react';
import { 
  getCollection, 
  handleFirestoreError, 
  OperationType, 
  getDocs, 
  query, 
  orderBy, 
  limit 
} from '../lib/firebase';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line
} from 'recharts';
import { AlertTriangle, TrendingUp, Users, ClipboardList, Sparkles, Download } from 'lucide-react';
import { getPerformanceSummary } from '../lib/gemini';
import { motion } from 'motion/react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalRecords: 0,
    topOffender: '',
    avgDemerits: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [offenseDistribution, setOffenseDistribution] = useState<any[]>([]);
  const [aiSummary, setAiSummary] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const COLORS = ['#4F46E5', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const studentsSnapshot = await getDocs(getCollection('students'));
      const recordsSnapshot = await getDocs(getCollection('records'));
      
      const students = studentsSnapshot.docs.map(d => d.data());
      const records = recordsSnapshot.docs.map(d => d.data());

      // 1. Basic Stats
      const totalDemerits = students.reduce((acc, curr) => acc + (curr.demeritPoints || 0), 0);
      const topOffender = students.sort((a, b) => (b.demeritPoints || 0) - (a.demeritPoints || 0))[0]?.name || 'N/A';

      setStats({
        totalStudents: students.length,
        totalRecords: records.length,
        topOffender,
        avgDemerits: students.length ? Math.round(totalDemerits / students.length) : 0
      });

      // 2. Offense Distribution for Pie Chart
      const typeCounts: Record<string, number> = {};
      records.forEach((r: any) => {
        typeCounts[r.offenseType] = (typeCounts[r.offenseType] || 0) + 1;
      });
      setOffenseDistribution(Object.entries(typeCounts).map(([name, value]) => ({ name, value })));

      // 3. Trends (Records per Day)
      const dateCounts: Record<string, number> = {};
      records.slice(0, 50).forEach((r: any) => {
        const date = r.date.split('T')[0];
        dateCounts[date] = (dateCounts[date] || 0) + 1;
      });
      setChartData(Object.entries(dateCounts).map(([date, count]) => ({ date, count })).sort((a,b) => a.date.localeCompare(b.date)));

      // 4. AI Insight
      if (records.length > 0) {
        const summary = await getPerformanceSummary(records.slice(0, 20));
        setAiSummary(summary);
      } else {
        setAiSummary("No records available to analyze yet.");
      }

    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'dashboard');
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async () => {
    const input = document.getElementById('dashboard-content');
    if (!input) return;
    
    setExporting(true);
    try {
      const canvas = await html2canvas(input);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`school_performance_report_${new Date().getFullYear()}.pdf`);
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setExporting(false);
    }
  };

  const statCards = [
    { label: 'Total Students', value: stats.totalStudents, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Total Incidents', value: stats.totalRecords, icon: ClipboardList, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Avg. Demerits', value: stats.avgDemerits, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Active Trends', value: stats.topOffender, icon: TrendingUp, color: 'text-rose-600', bg: 'bg-rose-50', sub: 'High Priority Student' },
  ];

  if (loading) return <div className="p-8 text-center text-gray-400 font-serif italic">Loading Intelligence Dashboard...</div>;

  return (
    <div className="space-y-8 pb-12" id="dashboard-content">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 font-serif italic">Performance Analytics</h2>
          <p className="text-gray-500 text-sm font-serif italic">School-wide behavioral climate and trends</p>
        </div>
        <button
          onClick={exportReport}
          disabled={exporting}
          className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold font-serif italic shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
        >
          {exporting ? 'Generating...' : <><Download size={20} /> Export Performance Report</>}
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, idx) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
          >
            <div className={`absolute top-0 right-0 w-24 h-24 ${card.bg} opacity-30 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110`} />
            <div className="relative z-10">
              <div className={`${card.bg} ${card.color} w-12 h-12 rounded-2xl flex items-center justify-center mb-4 shadow-sm`}>
                <card.icon size={24} />
              </div>
              <p className="text-gray-500 text-sm font-medium uppercase tracking-wider mb-1 font-serif italic">{card.label}</p>
              <h4 className="text-2xl font-bold text-gray-900 font-mono">{card.value}</h4>
              {card.sub && <p className="text-[10px] text-rose-500 font-bold mt-1 uppercase tracking-tighter">{card.sub}</p>}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-gray-900 font-serif italic tracking-tight">Recent Activity Trends</h3>
            <span className="text-xs font-mono text-gray-400 bg-gray-50 px-3 py-1 rounded-full">Historical Data Points</span>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#9CA3AF' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#9CA3AF' }}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#4F46E5" 
                  strokeWidth={4} 
                  dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Offense Pie */}
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
          <h3 className="text-lg font-bold text-gray-900 mb-8 font-serif italic">Offense Distribution</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={offenseDistribution}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {offenseDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {offenseDistribution.slice(0, 4).map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="text-[10px] text-gray-500 truncate font-serif">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Performance Insight */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-indigo-900 text-white rounded-[2rem] p-10 relative overflow-hidden shadow-2xl"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full -mr-20 -mt-20 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/20 rounded-full -ml-10 -mb-10 blur-2xl" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="bg-white/10 p-5 rounded-3xl border border-white/10 backdrop-blur-sm self-start">
            <Sparkles className="w-8 h-8 text-indigo-300" />
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold font-serif mb-4 italic text-indigo-100">AI School Climate Insight</h3>
            <p className="text-indigo-50/80 leading-relaxed font-serif text-lg italic italic">
              {aiSummary}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
