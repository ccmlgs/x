import React, { useState, useEffect } from 'react';
import { 
  getCollection, 
  handleFirestoreError, 
  OperationType, 
  addDoc, 
  getDocs, 
  query, 
  where,
  orderBy,
  serverTimestamp
} from '../lib/firebase';
import { MessageCircle, Phone, Mail, FileText, Plus, Search, Calendar, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

interface Communication {
  id: string;
  studentId: string;
  type: 'Email' | 'Phone' | 'Meeting' | 'Note';
  date: string;
  notes: string;
  studentName: string;
}

interface Meeting {
  id: string;
  studentId: string;
  studentName: string;
  date: string;
  time: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes: string;
}

interface Student {
  id: string;
  name: string;
}

export default function CommunicationMeetings() {
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'comms' | 'meetings'>('comms');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    studentId: '',
    type: 'Email' as any,
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '10:00',
    notes: '',
    status: 'scheduled' as any
  });

  useEffect(() => {
    fetchData();
  }, [tab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const studentsSnapshot = await getDocs(getCollection('students'));
      const studentsData = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Student[];
      setStudents(studentsData);

      if (tab === 'comms') {
        const commsQ = query(getCollection('communications'), orderBy('date', 'desc'));
        const commsSnapshot = await getDocs(commsQ);
        setCommunications(commsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Communication[]);
      } else {
        const meetingsQ = query(getCollection('meetings'), orderBy('date', 'asc'));
        const meetingsSnapshot = await getDocs(meetingsQ);
        setMeetings(meetingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Meeting[]);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, tab);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const student = students.find(s => s.id === formData.studentId);
      if (!student) return;

      if (tab === 'comms') {
        const newComm = {
          studentId: formData.studentId,
          studentName: student.name,
          type: formData.type,
          date: new Date().toISOString(),
          notes: formData.notes,
          createdAt: serverTimestamp()
        };
        await addDoc(getCollection('communications'), newComm);
      } else {
        const newMeeting = {
          studentId: formData.studentId,
          studentName: student.name,
          date: formData.date,
          time: formData.time,
          status: formData.status,
          notes: formData.notes,
          createdAt: serverTimestamp()
        };
        await addDoc(getCollection('meetings'), newMeeting);
      }
      setIsModalOpen(false);
      setFormData({ studentId: '', type: 'Email', date: format(new Date(), 'yyyy-MM-dd'), time: '10:00', notes: '', status: 'scheduled' });
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, tab);
    }
  };

  const typeIcons = {
    Email: <Mail size={16} />,
    Phone: <Phone size={16} />,
    Meeting: <Calendar size={16} />,
    Note: <FileText size={16} />
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex bg-white p-1 rounded-2xl border border-gray-200 shadow-sm w-full lg:w-auto">
          <button
            onClick={() => setTab('comms')}
            className={`flex-1 lg:flex-none px-6 py-2.5 rounded-xl font-bold font-serif italic transition-all ${
              tab === 'comms' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Communication Log
          </button>
          <button
            onClick={() => setTab('meetings')}
            className={`flex-1 lg:flex-none px-6 py-2.5 rounded-xl font-bold font-serif italic transition-all ${
              tab === 'meetings' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Parent Meetings
          </button>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full lg:w-auto flex items-center justify-center gap-2 bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all font-serif italic"
        >
          <Plus size={20} />
          {tab === 'comms' ? 'Log Communication' : 'Schedule Meeting'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {tab === 'comms' ? (
          <div className="lg:col-span-2 space-y-4">
            {loading ? (
              <div className="p-12 text-center text-gray-400 font-serif italic">Loading communication logs...</div>
            ) : communications.length === 0 ? (
              <div className="p-12 text-center text-gray-400 font-serif italic">No communication logs found.</div>
            ) : (
              communications.map((comm) => (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={comm.id}
                  className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex gap-6"
                >
                  <div className="bg-indigo-50 text-indigo-600 w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0">
                    {typeIcons[comm.type]}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                       <h4 className="font-bold text-gray-900 font-serif italic text-lg">{comm.studentName}</h4>
                       <span className="text-xs font-mono text-gray-400">{format(new Date(comm.date), 'MMM dd, yyyy HH:mm')}</span>
                    </div>
                    <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-md mb-3">
                      {comm.type}
                    </div>
                    <p className="text-gray-600 leading-relaxed font-serif italic">{comm.notes}</p>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        ) : (
          <div className="lg:col-span-2 space-y-4">
             {loading ? (
              <div className="p-12 text-center text-gray-400 font-serif italic">Loading scheduled meetings...</div>
            ) : meetings.length === 0 ? (
              <div className="p-12 text-center text-gray-400 font-serif italic">No meetings scheduled.</div>
            ) : (
              meetings.map((meeting) => (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  key={meeting.id}
                  className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl flex flex-col md:flex-row items-center gap-8 relative group"
                >
                  <div className="flex flex-col items-center justify-center bg-gray-50 p-4 rounded-3xl w-24 h-24 text-center border border-gray-100">
                    <span className="text-[10px] uppercase font-bold text-gray-400 font-mono tracking-tighter">{format(new Date(meeting.date), 'MMM')}</span>
                    <span className="text-3xl font-bold font-mono text-indigo-600 leading-none">{format(new Date(meeting.date), 'dd')}</span>
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <h4 className="text-xl font-bold text-gray-900 font-serif italic">{meeting.studentName}</h4>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                        meeting.status === 'scheduled' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                        meeting.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        'bg-gray-50 text-gray-400 border-gray-100'
                      }`}>
                        {meeting.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-gray-400 font-serif italic">
                      <div className="flex items-center gap-2"><Calendar size={14} className="text-indigo-400" /> {meeting.time}</div>
                    </div>
                    <p className="text-gray-500 text-sm leading-relaxed border-t border-gray-50 pt-2 mt-4">{meeting.notes || 'No agenda specified.'}</p>
                  </div>
                  
                  <button className="absolute right-8 top-1/2 -translate-y-1/2 p-4 bg-gray-50 rounded-full text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0">
                    <ChevronRight size={24} />
                  </button>
                </motion.div>
              ))
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden">
               <div className="p-8 border-b border-gray-100 bg-[#141414] text-white">
                <h3 className="text-2xl font-bold font-serif italic tracking-tight">
                  {tab === 'comms' ? 'Log Communication' : 'Plan Parent Meeting'}
                </h3>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 font-mono">Student Interest</label>
                  <select required value={formData.studentId} onChange={(e) => setFormData({ ...formData, studentId: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-500 font-serif italic">
                    <option value="">Select Student...</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.id.substr(0,4)})</option>)}
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  {tab === 'comms' ? (
                    <div className="col-span-2">
                       <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 font-mono">Channel</label>
                       <div className="grid grid-cols-4 gap-2">
                         {['Email', 'Phone', 'Meeting', 'Note'].map(t => (
                           <button 
                            key={t}
                            type="button"
                            onClick={() => setFormData({ ...formData, type: t as any })}
                            className={`p-3 rounded-xl border text-sm font-bold font-serif italic transition-all ${formData.type === t ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-400 border-gray-100'}`}
                           >
                             {t}
                           </button>
                         ))}
                       </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 font-mono">Date</label>
                        <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none font-mono" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 font-mono">Time</label>
                        <input type="time" value={formData.time} onChange={(e) => setFormData({ ...formData, time: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none font-mono" />
                      </div>
                    </>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 font-mono">Discussion Notes / Agenda</label>
                  <textarea required value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none h-32 resize-none font-serif leading-relaxed" placeholder="Summarize key points..." />
                </div>

                <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all font-serif italic tracking-wide">
                  {tab === 'comms' ? 'Archive Log' : 'Set Meeting'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
