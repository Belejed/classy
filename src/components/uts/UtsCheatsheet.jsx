import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Copy, 
  Check, 
  Sparkles, 
  Zap, 
  Printer, 
  Download,
  Code2,
  Bookmark
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function UtsCheatsheet({ selectedCourseFilter = 'all', onSelectCourseFilter, materials = [] }) {
  const [copiedKey, setCopiedKey] = useState(null);

  const cheatsheets = [
    {
      course: 'Pemrograman Web / Mobile',
      title: 'Cheatsheet Cepat React & State Management',
      items: [
        { label: 'useState', desc: 'const [state, setState] = useState(initialVal) -> Memperbarui state lokal memicu re-render.' },
        { label: 'useEffect', desc: 'useEffect(() => { ... return () => cleanup }, [deps]) -> [] untuk mount/unmount; [dep] jika dep berubah.' },
        { label: 'useRef', desc: 'const ref = useRef(initialVal) -> Nilai mutable .current yang perubahannya TIDAK memicu re-render.' },
        { label: 'Props vs State', desc: 'Props = Read-only dari parent; State = Mutable internal milik komponen sendiri.' }
      ]
    },
    {
      course: 'Basis Data & SQL',
      title: 'Cheatsheet Sintaks SQL & Tahapan Normalisasi',
      items: [
        { label: '1NF (First Normal Form)', desc: 'Tidak ada repeating groups, setiap kolom bernilai atomik (tunggal).' },
        { label: '2NF (Second Normal Form)', desc: 'Sudah 1NF dan tidak ada ketergantungan fungsional parsial (semua non-key bergantung penuh pada Primary Key).' },
        { label: '3NF (Third Normal Form)', desc: 'Sudah 2NF dan tidak ada ketergantungan transitif (non-key tidak boleh bergantung pada non-key lainnya).' },
        { label: 'Klausa Urutan SQL', desc: 'SELECT -> FROM -> JOIN -> WHERE -> GROUP BY -> HAVING -> ORDER BY -> LIMIT' }
      ]
    },
    {
      course: 'Rekayasa Perangkat Lunak',
      title: 'Cheatsheet Metodologi Agile & Notasi UML',
      items: [
        { label: 'Scrum Roles', desc: 'Product Owner (Visi & Backlog), Scrum Master (Fasilitator proses), Dev Team (Eksekusi).' },
        { label: 'Scrum Events', desc: 'Sprint Planning -> Daily Standup (15 mnt) -> Sprint Review -> Sprint Retrospective.' },
        { label: 'Use Case Diagram', desc: 'Actor (User), Use Case (Oval), <<include>> (wajib terjadi), <<extend>> (kondisional/opsional).' },
        { label: 'Class Diagram', desc: '+ Public, - Private, # Protected. Relasi: Asosiasi, Agregasi (berongga), Komposisi (isi hitam).' }
      ]
    }
  ];

  const courseList = ['all', ...Array.from(new Set(cheatsheets.map(c => c.course)))];

  const filtered = selectedCourseFilter === 'all'
    ? cheatsheets
    : cheatsheets.filter(c => c.course === selectedCourseFilter);

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success('Disalin ke clipboard!');
    setTimeout(() => setCopiedKey(null), 1800);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
          {courseList.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => onSelectCourseFilter(c)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedCourseFilter === c
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              {c === 'all' ? 'Semua Mata Kuliah' : c}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200 shrink-0 self-start sm:self-auto">
          <Zap size={14} className="text-yellow-500 fill-yellow-500" />
          <span>Cheatsheet 1 Lembar Praktis</span>
        </div>
      </div>

      {/* Grid of Cheatsheets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((cs, idx) => (
          <div key={idx} className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 font-mono">
                {cs.course}
              </span>
              <h3 className="text-sm sm:text-base font-black text-slate-900 mt-1">
                {cs.title}
              </h3>
            </div>

            <div className="space-y-2.5">
              {cs.items.map((it, iIdx) => {
                const key = `${idx}_${iIdx}`;
                const isCopied = copiedKey === key;
                return (
                  <div key={iIdx} className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1 relative group hover:border-red-300 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-black text-red-600">
                        {it.label}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(`${it.label}: ${it.desc}`, key)}
                        className="text-slate-400 hover:text-slate-700 p-1 rounded-md cursor-pointer transition-colors"
                        title="Salin Cheatsheet"
                      >
                        {isCopied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                      </button>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed font-medium">
                      {it.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
