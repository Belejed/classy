import React, { useState } from 'react';
import { BookOpen, Brain, CheckCircle2, Flame, RotateCcw } from 'lucide-react';

const cards = [
  { q: 'Apa yang harus dipersiapkan sebelum UTS?', a: 'Pelajari ringkasan materi, latihan soal, dan cek jadwal ujian.' },
  { q: 'Bagaimana cara belajar yang efektif?', a: 'Gunakan sesi singkat, flashcard, dan ulangi materi yang belum dikuasai.' }
];
const quiz = { q: 'Metode belajar yang membantu mengingat konsep adalah...', options: ['Membaca sekali', 'Flashcard dan latihan soal', 'Tidak mencatat', 'Menunda belajar'], answer: 1 };

export default function ClassUTS({ currentClass }) {
  const [card, setCard] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [choice, setChoice] = useState(null);
  const [done, setDone] = useState(false);
  const uts = currentClass?.uts || {};
  return <div className="space-y-5">
    <section className="rounded-3xl bg-gradient-to-br from-red-700 via-rose-600 to-orange-500 p-6 text-white shadow-lg shadow-red-200">
      <div className="flex items-center gap-3"><div className="rounded-2xl bg-white/20 p-3"><Flame size={26}/></div><div><p className="text-xs font-bold uppercase tracking-[.2em] text-orange-100">Minggu UTS</p><h1 className="text-2xl font-black">{uts.title || 'Persiapan UTS'}</h1></div></div>
      <p className="mt-4 text-sm text-white/90">{uts.description || 'Gunakan halaman ini untuk merangkum materi dan berlatih sebelum ujian.'}</p>
    </section>
    <section className="rounded-2xl border border-orange-200 bg-white p-5"><h2 className="flex items-center gap-2 font-black text-slate-900"><BookOpen size={18} className="text-red-600"/> Materi yang perlu dipelajari</h2><div className="mt-3 grid gap-2 sm:grid-cols-2">{(uts.materials || ['Review materi pertemuan 1–7','Pahami konsep dan contoh soal','Latihan soal mandiri','Catat bagian yang belum dipahami']).map((m,i)=><div key={i} className="flex gap-2 rounded-xl bg-orange-50 p-3 text-sm text-slate-700"><CheckCircle2 size={17} className="mt-0.5 text-red-500"/>{typeof m === 'string' ? m : m.title}</div>)}</div></section>
    <div className="grid gap-5 lg:grid-cols-2"><section className="rounded-2xl border border-rose-200 bg-white p-5"><h2 className="flex items-center gap-2 font-black"><Brain size={18} className="text-rose-600"/> Flashcard</h2><button onClick={()=>setFlipped(!flipped)} className="mt-4 flex min-h-36 w-full items-center justify-center rounded-2xl bg-rose-50 p-6 text-center text-lg font-bold text-rose-900">{flipped ? cards[card].a : cards[card].q}</button><div className="mt-3 flex justify-between"><button onClick={()=>setFlipped(!flipped)} className="text-xs font-bold text-rose-600">Balik kartu</button><button onClick={()=>{setCard((card+1)%cards.length);setFlipped(false)}} className="flex items-center gap-1 text-xs font-bold text-slate-600">Kartu berikutnya <RotateCcw size={13}/></button></div></section>
    <section className="rounded-2xl border border-orange-200 bg-white p-5"><h2 className="font-black text-slate-900">Quiz cepat</h2><p className="mt-4 text-sm font-semibold">{quiz.q}</p><div className="mt-3 space-y-2">{quiz.options.map((o,i)=><button key={o} onClick={()=>{setChoice(i);setDone(true)}} className={`w-full rounded-xl border p-3 text-left text-sm ${choice===i ? (i===quiz.answer?'border-emerald-400 bg-emerald-50':'border-red-400 bg-red-50'):'border-slate-200 hover:border-orange-400'}`}>{o}</button>)}</div>{done&&<p className={`mt-3 text-xs font-bold ${choice===quiz.answer?'text-emerald-600':'text-red-600'}`}>{choice===quiz.answer?'Benar! Mantap.':'Belum tepat, coba pelajari lagi.'}</p>}</section></div>
  </div>;
}
