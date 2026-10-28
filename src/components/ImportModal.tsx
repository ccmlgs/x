import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, X, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: any[]) => void;
  title: string;
  templateColumns: string[];
}

export default function ImportModal({ isOpen, onClose, onImport, title, templateColumns }: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseFile(selectedFile);
    }
  };

  const parseFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);
        
        if (json.length === 0) {
          setError('The sheet appears to be empty.');
          return;
        }

        // Validate columns
        const firstRow = json[0] as any;
        const missing = templateColumns.filter(col => !(col in firstRow));
        if (missing.length > 0) {
          setError(`Missing required columns: ${missing.join(', ')}`);
        } else {
          setPreview(json.slice(0, 5));
          setError(null);
        }
      } catch (err) {
        setError('Failed to parse file. Please ensure it is a valid Excel or CSV file.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleConfirm = () => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result;
      const workbook = XLSX.read(data, { type: 'binary' });
      const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
      onImport(json);
      onClose();
    };
    if (file) reader.readAsBinaryString(file);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={onClose} 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
          />
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            exit={{ scale: 0.95, opacity: 0 }} 
            className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100"
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-indigo-50">
              <h3 className="text-xl font-bold text-indigo-900 font-serif italic">{title}</h3>
              <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors"><X size={20} /></button>
            </div>

            <div className="p-8 space-y-6">
              {!file ? (
                <div className="border-2 border-dashed border-gray-200 rounded-3xl p-12 text-center hover:border-indigo-400 transition-colors cursor-pointer relative">
                  <input 
                    type="file" 
                    accept=".xlsx, .xls, .csv" 
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <div className="bg-indigo-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Upload className="text-indigo-600" size={32} />
                  </div>
                  <p className="text-gray-900 font-bold font-serif italic mb-1">Click or drag to upload</p>
                  <p className="text-gray-400 text-sm font-mono">Accepts .xlsx, .xls, or .csv</p>
                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    {templateColumns.map(col => (
                      <span key={col} className="text-[10px] bg-gray-100 text-gray-500 px-2 py-1 rounded-md border border-gray-200">{col}</span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                    <FileSpreadsheet className="text-indigo-600" size={24} />
                    <div className="flex-1">
                      <p className="font-bold text-indigo-900 font-serif italic">{file.name}</p>
                      <p className="text-xs text-indigo-400 font-mono">{(file.size / 1024).toFixed(2)} KB</p>
                    </div>
                    <button onClick={() => { setFile(null); setPreview([]); setError(null); }} className="text-gray-400 hover:text-red-500">
                      <X size={20} />
                    </button>
                  </div>

                  {error ? (
                    <div className="flex items-center gap-3 text-red-600 bg-red-50 p-4 rounded-2xl border border-red-100 text-sm font-serif italic">
                      <AlertCircle size={20} />
                      {error}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-emerald-600 text-sm font-bold font-serif italic mb-2">
                        <CheckCircle2 size={16} />
                        Data preview (first 5 rows)
                      </div>
                      <div className="overflow-x-auto rounded-xl border border-gray-100">
                        <table className="w-full text-left text-xs bg-gray-50">
                          <thead>
                            <tr className="border-b border-gray-200">
                              {templateColumns.map(col => <th key={col} className="p-2 font-bold text-gray-400 bg-gray-100">{col}</th>)}
                            </tr>
                          </thead>
                          <tbody>
                            {preview.map((row, i) => (
                              <tr key={i} className="border-b border-gray-100 last:border-0">
                                {templateColumns.map(col => <td key={col} className="p-2 text-gray-600 truncate max-w-[120px]">{row[col]}</td>)}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button 
                  onClick={onClose}
                  className="flex-1 px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold font-serif italic hover:bg-gray-50 transition-all font-serif italic"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirm}
                  disabled={!file || !!error}
                  className="flex-1 px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-lg shadow-indigo-100 font-serif italic"
                >
                  Import Records
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
