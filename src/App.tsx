/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Table, 
  Users, 
  CalendarCheck, 
  MessageSquare, 
  LogOut, 
  Menu, 
  X,
  Plus,
  FileText,
  UserCircle
} from 'lucide-react';
import { doc, getDocFromCache } from 'firebase/firestore';
import { db } from './lib/firebase';
import { auth, loginWithGoogle, logout } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import Dashboard from './components/Dashboard';
import DisciplineSpreadsheet from './components/DisciplineSpreadsheet';
import StudentManagement from './components/StudentManagement';
import AttendanceTracker from './components/AttendanceTracker';
import CommunicationMeetings from './components/CommunicationMeetings';

type View = 'dashboard' | 'spreadsheet' | 'students' | 'attendance' | 'parent-teacher';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    // Connection test
    const testConnection = async () => {
      try {
        await getDocFromCache(doc(db, 'system', 'ping'));
      } catch (e) {
        // Expected if cache is empty, but helps initialize
        console.log("Firebase connection initialized");
      }
    };
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'spreadsheet', label: 'Discipline Records', icon: Table },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
    { id: 'parent-teacher', label: 'Communication', icon: MessageSquare },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#E4E3E0] p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl text-center border border-gray-200"
        >
          <div className="mb-6 flex justify-center">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg transform rotate-3">
              <FileText className="text-white w-10 h-10" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 font-serif italic text-indigo-800">DisciplinePro</h1>
          <p className="text-gray-600 mb-8 font-serif leading-relaxed">
            School Committee Management System. Log in to track student records, point systems, and recommendations.
          </p>
          <button
            onClick={loginWithGoogle}
            className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 py-3 px-4 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm active:scale-95"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/0/google.svg" alt="Google" className="w-5 h-5" />
            Continue with Google
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F0] flex overflow-hidden">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 80 }}
        className="bg-[#141414] text-white flex flex-col transition-all duration-300 relative z-20"
      >
        <div className="p-6 flex items-center justify-between">
          <AnimatePresence mode="wait">
            {isSidebarOpen && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3"
              >
                <div className="bg-indigo-500 p-1.5 rounded-lg">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                  DisciplinePro
                </span>
              </motion.div>
            )}
          </AnimatePresence>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1 hover:bg-gray-800 rounded-md transition-colors"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 mt-6 px-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id as View)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
                currentView === item.id 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' 
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <item.icon size={20} />
              {isSidebarOpen && <span className="font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-gray-800">
          <button
            onClick={logout}
            className="flex items-center gap-3 text-gray-400 hover:text-red-400 w-full p-2 transition-colors"
          >
            <LogOut size={20} />
            {isSidebarOpen && <span className="font-medium">Sign Out</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-white border-b border-gray-200 px-8 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900 capitalize font-serif italic text-indigo-900">
              {currentView.replace('-', ' ')}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-gray-900">{user.displayName}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
            {user.photoURL ? (
              <img src={user.photoURL} alt="User" className="w-10 h-10 rounded-full border-2 border-gray-100" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                {user.displayName?.[0] || 'U'}
              </div>
            )}
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="flex-1 overflow-y-auto p-8 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {currentView === 'dashboard' && <Dashboard />}
              {currentView === 'spreadsheet' && <DisciplineSpreadsheet />}
              {currentView === 'students' && <StudentManagement />}
              {currentView === 'attendance' && <AttendanceTracker />}
              {currentView === 'parent-teacher' && <CommunicationMeetings />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
