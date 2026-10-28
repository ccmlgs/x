import React, { useState, useEffect } from 'react';
import { 
  getCollection, 
  handleFirestoreError, 
  OperationType, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  where,
  updateDoc, 
  doc, 
  deleteDoc,
  serverTimestamp
} from '../lib/firebase';
import { Search, Filter, Download, Plus, X, Sparkles, Wand2, Archive, FileUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { getRecommendations } from '../lib/gemini';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import ImportModal from './ImportModal';

interface DisciplineRecord {
  id: string;
  studentId: string;
  studentName: string;
  date: string;
  offenseType: string;
  description: string;
  demeritPoints: number;
  schoolYear: string;
  recommendation: string;
}

interface Student {
  id: string;
  name: string;
  level: string;
  demeritPoints: number;
}

export default function DisciplineSpreadsheet() {
  const [records, setRecords] = useState<DisciplineRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState('All Levels');
  const [selectedYear, setSelectedYear] = useState('2023-2024');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    studentId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    offenseType: '',
    description: '',
    demeritPoints: 0,
    recommendation: ''
  });

  const levels = ['All Levels', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
  const schoolYears = ['2021-2022', '2022-2023', '2023-2024', '2024-2025'];
  const offenseTypes = ['Late Arrival', 'Dress Code', 'Disruption', 'Cyberbullying', 'Plagiarism', 'Vandalism', 'Physical Conflict', 'Others'];

  useEffect(() => {
    fetchData();
  }, [selectedYear]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const recordsQ = query(
        getCollection('records'), 
        where('schoolYear', '==', selectedYear),
        orderBy('date', 'desc')
      );
      const recordsSnapshot = await getDocs(recordsQ);
      const recordsData = recordsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as DisciplineRecord[];
      setRecords(recordsData);

      const studentsSnapshot = await getDocs(getCollection('students'));
      const studentsData = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Student[];
      setStudents(studentsData);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'records');
    } finally {
      setLoading(false);
    }
  };

  const handleAiRecommendation = async () => {
    if (!formData.offenseType || !formData.description) return;
    setAiLoading(true);
    try {
      const rec = await getRecommendations(formData.offenseType, formData.description, '');
      setFormData(prev => ({ ...prev, recommendation: rec }));
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const student = students.find(s => s.id === formData.studentId);
      if (!student) return;

      const newRecord = {
        ...formData,
        studentName: student.name,
        schoolYear: selectedYear,
        createdAt: serverTimestamp()
      };

      await addDoc(getCollection('records'), newRecord);
      
      const studentRef = doc(getCollection('students'), student.id);
      await updateDoc(studentRef, {
        demeritPoints: (student.demeritPoints || 0) + Number(formData.demeritPoints),
        updatedAt: serverTimestamp()
      });

      setIsModalOpen(false);
      setFormData({ studentId: '', date: format(new Date(), 'yyyy-MM-dd'), offenseType: '', description: '', demeritPoints: 0, recommendation: '' });
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'records');
    }
  };

  const handleImport = async (data: any[]) => {
    setLoading(true);
    let successCount = 0;
    try {
      for (const item of data) {
        // Find student by name
        const student = students.find(s => s.name.toLowerCase() === item.studentName?.toLowerCase());
        if (student) {
          await addDoc(getCollection('records'), {
            studentId: student.id,
            studentName: student.name,
            date: item.date || format(new Date(), 'yyyy-MM-dd'),
            offenseType: item.offenseType || 'Others',
            description: item.description || '',
            demeritPoints: Number(item.demeritPoints) || 0,
            schoolYear: selectedYear,
            recommendation: item.recommendation || '',
            createdAt: serverTimestamp()
          });

          // Update student points
          const studentRef = doc(getCollection('students'), student.id);
          await updateDoc(studentRef, {
            demeritPoints: (student.demeritPoints || 0) + (Number(item.demeritPoints) || 0),
            updatedAt: serverTimestamp()
          });
          successCount++;
        }
      }
      alert(`Imported ${successCount} records. Students with matching names were updated.`);
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'records_import');
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = async () => {
    const input = document.getElementById('spreadsheet-table');
    if (!input) return;
    
    setLoading(true);
    try {
      const canvas = await html2canvas(input);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`discipline_report_${selectedYear}.pdf`);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = records.filter(r => {
    const matchesSearch = r.studentName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         r.offenseType.toLowerCase().includes(searchTerm.toLowerCase());
    const student = students.find(s => s.id === r.studentId);
    const matchesLevel = filterLevel === 'All Levels' || student?.level === filterLevel;
    return matchesSearch && matchesLevel;
  });

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-gray-200 overflow-x-auto no-scrollbar max-w-full">
          {schoolYears.map(year => (
            <button
              key={year}
              onClick={() => setSelectedYear(year)}
              className={`px-6 py-2.5 rounded-xl font-medium transition-all font-serif italic text-sm whitespace-nowrap ${
                selectedYear === year 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {year}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-white border border-gray-200 px-5 py-2.5 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 shadow-sm transition-all font-serif italic"
          >
            <FileUp size={18} />
            Import Log
          </button>
          <button
            onClick={exportPDF}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-white border border-gray-200 px-5 py-2.5 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 shadow-sm transition-all font-serif italic"
          >
            <Download size={18} />
            Export PDF
          </button>
        </div>
      </div>

      <ImportModal 
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImport}
        title="Import Discipline Log"
        templateColumns={['studentName', 'date', 'offenseType', 'description', 'demeritPoints', 'recommendation']}
      />

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search documents, students, offenses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
          />
        </div>
        <div className="relative">
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="pl-4 pr-10 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm appearance-none min-w-[160px] font-serif italic"
          >
            {levels.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
        </div>
      </div>

      {/* Spreadsheet Table */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden" id="spreadsheet-table">
        <div className="p-6 bg-indigo-900 border-b border-indigo-800 flex justify-between items-center text-white">
          <h3 className="text-xl font-bold font-serif italic tracking-wide">Discipline Registry — {selectedYear}</h3>
          <div className="text-xs uppercase tracking-[0.2em] opacity-60 font-mono">Status: Official Record</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 backdrop-blur-sm border-b border-gray-200">
                <th className="px-6 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest font-mono">Date</th>
                <th className="px-6 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest font-mono">Student</th>
                <th className="px-6 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest font-mono">Level</th>
                <th className="px-6 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest font-mono">Offense Category</th>
                <th className="px-6 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest font-mono">Points</th>
                <th className="px-6 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest font-mono">Recommendation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-20 text-center text-gray-400">Consulting archives...</td></tr>
              ) : filteredRecords.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-20 text-center text-gray-400">No records found for this period.</td></tr>
              ) : (
                filteredRecords.map((record, idx) => (
                  <tr key={record.id} className="hover:bg-indigo-50/30 transition-all group">
                    <td className="px-6 py-5">
                      <div className="text-sm font-mono text-gray-500">{format(new Date(record.date), 'MMM dd, yyyy')}</div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="font-bold text-gray-900 font-serif italic">{record.studentName}</div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-xs font-semibold text-indigo-600 bg-indigo-50/50 px-3 py-1 rounded-full w-fit border border-indigo-100 uppercase tracking-wider">
                        {students.find(s => s.id === record.studentId)?.level || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-sm font-medium text-gray-800">{record.offenseType}</div>
                      <div className="text-xs text-gray-400 line-clamp-1 max-w-[200px]">{record.description}</div>
                    </td>
                    <td className="px-6 py-5">
                      <div className={`text-lg font-mono font-bold ${record.demeritPoints >= 20 ? 'text-red-500' : 'text-gray-700'}`}>
                        -{record.demeritPoints}
                      </div>
                    </td>
                    <td className="px-6 py-5 max-w-[300px]">
                      <div className="text-sm text-gray-600 italic bg-gray-50 p-3 rounded-2xl border border-gray-100 leading-relaxed font-serif">
                        {record.recommendation || 'Pending Committee Review...'}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-white/20">
              <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-indigo-50">
                <div>
                  <h3 className="text-2xl font-bold text-indigo-900 font-serif italic">New Discipline Entry</h3>
                  <p className="text-sm text-indigo-600/70 font-mono">Academic Year: {selectedYear}</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-full transition-colors"><X size={24} className="text-indigo-900" /></button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto max-h-[70vh]">
                <div className="md:col-span-1">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 font-mono">Identify Student</label>
                  <select 
                    required 
                    value={formData.studentId}
                    onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-serif italic"
                  >
                    <option value="">Search Profile...</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.level})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 font-mono">Incident Date</label>
                  <input 
                    required 
                    type="date" 
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 font-mono">Offense Category</label>
                  <select 
                    required 
                    value={formData.offenseType}
                    onChange={(e) => setFormData({ ...formData, offenseType: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-serif italic"
                  >
                    <option value="">Categorize...</option>
                    {offenseTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 font-mono">Demerit Points (-)</label>
                  <input 
                    required 
                    type="number" 
                    value={formData.demeritPoints}
                    onChange={(e) => setFormData({ ...formData, demeritPoints: Number(e.target.value) })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none font-mono font-bold text-red-500"
                    placeholder="0"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 font-mono">Incident Description</label>
                  <textarea 
                    required 
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none font-serif leading-relaxed"
                    placeholder="Provide objective details of the incident..."
                  />
                </div>
                <div className="md:col-span-2">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest font-mono">Committee Recommendation</label>
                    <button 
                      type="button"
                      onClick={handleAiRecommendation}
                      disabled={aiLoading || !formData.offenseType || !formData.description}
                      className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 disabled:opacity-40 transition-all font-serif italic text-sm"
                    >
                      {aiLoading ? <Sparkles className="animate-spin" size={14} /> : <Wand2 size={14} />}
                      AI Suggestion
                    </button>
                  </div>
                  <textarea 
                    value={formData.recommendation}
                    onChange={(e) => setFormData({ ...formData, recommendation: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none font-serif italic bg-slate-50 text-indigo-900 border-dashed"
                    placeholder="Committee action steps..."
                  />
                </div>
                <div className="md:col-span-2 flex gap-4 mt-4">
                  <button type="submit" className="flex-1 bg-indigo-600 text-white font-bold py-4 rounded-xl shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all font-serif italic tracking-wide">
                    Finalize Entry
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
