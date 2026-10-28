import React, { useState, useEffect } from 'react';
import { 
  getCollection, 
  handleFirestoreError, 
  OperationType, 
  addDoc, 
  getDocs, 
  query, 
  where,
  updateDoc, 
  doc, 
  serverTimestamp
} from '../lib/firebase';
import { Check, X, Clock, HelpCircle, Save, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, subDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

interface AttendanceRecord {
  id: string;
  studentId: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
}

interface Student {
  id: string;
  name: string;
  level: string;
}

export default function AttendanceTracker() {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filterLevel, setFilterLevel] = useState('All Levels');

  const levels = ['All Levels', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const studentsSnapshot = await getDocs(getCollection('students'));
      const studentsData = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Student[];
      setStudents(studentsData);

      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const q = query(getCollection('attendance'), where('date', '==', dateStr));
      const attendanceSnapshot = await getDocs(q);
      
      const attendanceMap: Record<string, AttendanceRecord> = {};
      attendanceSnapshot.docs.forEach(doc => {
        const data = doc.data() as AttendanceRecord;
        attendanceMap[data.studentId] = { ...data, id: doc.id };
      });
      setAttendance(attendanceMap);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'attendance');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (studentId: string, status: 'present' | 'absent' | 'late' | 'excused') => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        studentId,
        date: format(selectedDate, 'yyyy-MM-dd'),
        status
      }
    }));
  };

  const saveBatch = async () => {
    setSaving(true);
    try {
      for (const studentId of Object.keys(attendance)) {
        const record = attendance[studentId];
        if (record.id) {
          await updateDoc(doc(getCollection('attendance'), record.id), {
            status: record.status,
            updatedAt: serverTimestamp()
          });
        } else {
          await addDoc(getCollection('attendance'), {
            ...record,
            schoolYear: '2023-2024', // Default for now
            createdAt: serverTimestamp()
          });
        }
      }
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'attendance');
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = students.filter(s => filterLevel === 'All Levels' || s.level === filterLevel);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4 bg-white p-1 rounded-2xl border border-gray-200 shadow-sm">
          <button onClick={() => setSelectedDate(subDays(selectedDate, 1))} className="p-2 hover:bg-gray-50 rounded-xl transition-colors"><ChevronLeft size={20} /></button>
          <div className="px-4 py-2 text-lg font-bold text-gray-900 font-serif italic border-x border-gray-100 flex items-center gap-2">
            <CalendarIcon size={18} className="text-indigo-600" />
            {format(selectedDate, 'MMMM dd, yyyy')}
          </div>
          <button onClick={() => setSelectedDate(addDays(selectedDate, 1))} className="p-2 hover:bg-gray-50 rounded-xl transition-colors"><ChevronRight size={20} /></button>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="flex-1 md:flex-none px-4 py-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-serif italic shadow-sm"
          >
            {levels.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <button
            onClick={saveBatch}
            disabled={saving || Object.keys(attendance).length === 0}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-indigo-600 text-white px-8 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all font-serif italic disabled:opacity-50"
          >
            {saving ? 'Syncing...' : <><Save size={18} /> Save Changes</>}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        {/* Attendance List */}
        <div className="xl:col-span-3 bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#141414] text-white">
              <tr>
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest font-mono opacity-60">Student Name</th>
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest font-mono opacity-60">Level</th>
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest font-mono opacity-60 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={3} className="px-8 py-20 text-center text-gray-400 font-serif italic">Accessing register...</td></tr>
              ) : filteredStudents.length === 0 ? (
                <tr><td colSpan={3} className="px-8 py-20 text-center text-gray-400 font-serif italic">No students expected.</td></tr>
              ) : (
                filteredStudents.map((student) => {
                  const status = attendance[student.id]?.status || 'present';
                  return (
                    <tr key={student.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-8 py-5">
                        <div className="font-bold text-gray-900 font-serif italic text-lg">{student.name}</div>
                      </td>
                      <td className="px-8 py-5 font-mono text-xs text-gray-400">
                        {student.level}
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center justify-center gap-2">
                          {[
                            { id: 'present', icon: Check, color: 'text-emerald-600', bg: 'bg-emerald-50', hover: 'hover:bg-emerald-100' },
                            { id: 'absent', icon: X, color: 'text-rose-600', bg: 'bg-rose-50', hover: 'hover:bg-rose-100' },
                            { id: 'late', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', hover: 'hover:bg-amber-100' },
                            { id: 'excused', icon: HelpCircle, color: 'text-blue-600', bg: 'bg-blue-50', hover: 'hover:bg-blue-100' },
                          ].map((opt) => (
                            <button
                              key={opt.id}
                              onClick={() => handleStatusChange(student.id, opt.id as any)}
                              className={`p-2.5 rounded-xl transition-all border ${
                                status === opt.id 
                                  ? `${opt.bg} ${opt.color} border-current ring-2 ring-offset-1 ring-current/20` 
                                  : `bg-transparent text-gray-300 border-gray-100 ${opt.hover}`
                              }`}
                              title={opt.id.toUpperCase()}
                            >
                              <opt.icon size={20} />
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-indigo-900 text-white p-8 rounded-3xl shadow-xl shadow-indigo-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
            <h4 className="text-sm font-bold uppercase tracking-widest opacity-60 mb-6 font-mono">Daily Summary</h4>
            <div className="space-y-6">
              {[
                { label: 'Present', count: (Object.values(attendance) as AttendanceRecord[]).filter(a => a.status === 'present').length, color: 'bg-emerald-500' },
                { label: 'Absent', count: (Object.values(attendance) as AttendanceRecord[]).filter(a => a.status === 'absent').length, color: 'bg-rose-500' },
                { label: 'Late', count: (Object.values(attendance) as AttendanceRecord[]).filter(a => a.status === 'late').length, color: 'bg-amber-500' },
                { label: 'Excused', count: (Object.values(attendance) as AttendanceRecord[]).filter(a => a.status === 'excused').length, color: 'bg-blue-500' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${item.color}`} />
                    <span className="text-sm font-medium font-serif italic text-indigo-100">{item.label}</span>
                  </div>
                  <span className="text-xl font-mono font-bold">{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-gray-200 text-gray-500 text-sm leading-relaxed font-serif italic text-center">
            "Regular attendance is the first step toward student success. Please ensure all records are finalized before 10:00 AM."
          </div>
        </div>
      </div>
    </div>
  );
}
