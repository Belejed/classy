/**
 * DATA PUSAT PERSIAPAN UTS KELAS (Classy UTS Hub)
 * 
 * Anda bisa mengedit, menambah, atau menghapus mata kuliah, materi,
 * flashcard, quiz latihan, dan jadwal ujian langsung di file ini.
 */

// 1. DAFTAR MATA KULIAH & RANGKUMAN MATERI
export const initialUtsMaterials = [
  {
    id: 'mat-1',
    course: 'Pemrograman Web / Mobile',
    code: 'TI-201',
    description: 'Rangkuman lengkap teori pertemuan 1–7, formula rumus, dan kisi-kisi soal dosen.',
    topics: [
      'Fundamental React: State, Props & Component Lifecycle',
      'React Hooks: useState, useEffect, useMemo, useRef',
      'Routing & SPA Navigation (React Router DOM)',
      'Komunikasi API, REST API & asynchronous state'
    ],
    modules: [
      {
        id: 'mod-1-1',
        title: 'Konsep Dasar & Komponen React (Pertemuan 1 - 3)',
        keyPoints: [
          'JSX merupakan ekstensi sintaksis JavaScript yang mempermudah pembuatan UI.',
          'Komponen bersifat modular, reusable, dan menerima parameter props.',
          'State menyimpan data dinamis yang dikelola di dalam komponen.'
        ],
        cheatsheet: '// Contoh dasar deklarasi State:\nconst [count, setCount] = useState(0);',
        examTip: 'Pahami perbedaan mutasi langsung vs pemanggilan setter function.',
        sampleQuestion: 'Mengapa kita tidak boleh mengubah nilai state secara langsung tanpa setState?'
      },
      {
        id: 'mod-1-2',
        title: 'React Hooks & Asynchronous API (Pertemuan 4 - 7)',
        keyPoints: [
          'useEffect menangani efek samping seperti fetch data, subscription, dan timer.',
          'Dependency array mengontrol frekuensi eksekusi efek samping.',
          'Custom hooks memisahkan logika bisnis yang dapat digunakan berulang.'
        ],
        cheatsheet: '// Lifecycle mount:\nuseEffect(() => {\n  fetchData();\n}, []); // Empty deps = run once',
        examTip: 'Hafalkan perilaku useEffect saat dependency array bernilai kosong ([]) vs tanpa array.',
        sampleQuestion: 'Tuliskan kode fetching API menggunakan async/await di dalam useEffect!'
      }
    ]
  },
  {
    id: 'mat-2',
    course: 'Basis Data & SQL',
    code: 'TI-202',
    description: 'Konsep RDBMS, relasi tabel, tahapan normalisasi 1NF–3NF, dan query JOIN.',
    topics: [
      'Konsep RDBMS, Primary Key, Foreign Key & Relasi',
      'Normalisasi Database (1NF, 2NF, 3NF)',
      'Query Lanjutan: JOIN (Inner, Left, Right) & Aggregations',
      'Indexing & Integritas Data'
    ],
    modules: [
      {
        id: 'mod-2-1',
        title: 'Relasi & Desain ERD (Pertemuan 1 - 3)',
        keyPoints: [
          'Entitas, Atribut (Key, Simple, Composite, Multivalued, Derived).',
          'Kardinalitas relasi: 1:1, 1:N, M:N.',
          'Transformasi relasi M:N membutuhkan tabel junction/penghubung.'
        ],
        cheatsheet: 'Kardinalitas M:N -> Buat tabel baru berisikan FK dari kedua tabel sumber.',
        examTip: 'Perhatikan penempatan Foreign Key pada relasi 1:N (FK selalu di sisi N).',
        sampleQuestion: 'Gambarkan contoh tabel penghubung untuk entitas Mahasiswa dan Mata Kuliah!'
      },
      {
        id: 'mod-2-2',
        title: 'Normalisasi Database & SQL Lanjutan (Pertemuan 4 - 7)',
        keyPoints: [
          '1NF: Nilai kolom bersifat atomik (tidak ada multivalue).',
          '2NF: Sudah 1NF dan tidak ada ketergantungan fungsional parsial terhadap PK komposit.',
          '3NF: Sudah 2NF dan tidak ada ketergantungan transitif antar atribut non-primary key.'
        ],
        cheatsheet: 'SELECT m.nama, k.nilai \nFROM mahasiswa m \nJOIN nilai k ON m.id = k.mhs_id \nWHERE k.nilai > 75;',
        examTip: 'Dosen sering memberikan tabel unnormalized dan meminta bentuk 1NF s/d 3NF.',
        sampleQuestion: 'Diberikan tabel faktur penjualan, lakukan normalisasi hingga 3NF!'
      }
    ]
  },
  {
    id: 'mat-3',
    course: 'Rekayasa Perangkat Lunak',
    code: 'TI-203',
    description: 'SDLC, Agile Scrum, analisis kebutuhan fungsional, dan pemodelan UML.',
    topics: [
      'Metodologi Pengembangan: Agile, Scrum, Waterfall',
      'Analisis Kebutuhan: Functional & Non-Functional Requirements',
      'UML Diagrams: Use Case, Activity & Class Diagram',
      'Testing & Quality Assurance'
    ],
    modules: [
      {
        id: 'mod-3-1',
        title: 'Metodologi SDLC & Scrum (Pertemuan 1 - 3)',
        keyPoints: [
          'Waterfall cocok untuk proyek yang persyaratannya sudah pasti dan stabil.',
          'Agile/Scrum fleksibel terhadap perubahan dengan sprint berdurasi 1–4 minggu.',
          'Tiga peran Scrum: Product Owner, Scrum Master, Development Team.'
        ],
        cheatsheet: 'Scrum Artifacts: Product Backlog, Sprint Backlog, Increment.',
        examTip: 'Hafalkan empat upacara/ceremony Scrum: Planning, Daily Standup, Review, Retrospective.',
        sampleQuestion: 'Kapan kita harus memilih Waterfall daripada Agile Scrum?'
      },
      {
        id: 'mod-3-2',
        title: 'Pemodelan Sistem dengan UML (Pertemuan 4 - 7)',
        keyPoints: [
          'Use Case Diagram: Menggambarkan fungsi sistem dari sudut pandang pengguna eksternal.',
          'Relasi <<include>> (wajib dieksekusi) vs <<extend>> (kondisional/opsional).',
          'Activity Diagram: Memodelkan aliran kerja/workflow bisnis secara berurutan.'
        ],
        cheatsheet: '<<include>> = Otentikasi saat Login\n<<extend>> = Cetak struk setelah bayar',
        examTip: 'Jangan terbalik antara arah panah <<include>> dan <<extend>>.',
        sampleQuestion: 'Buatkan Use Case Diagram untuk fitur Pembelian Barang di toko online!'
      }
    ]
  }
];

// 2. DAFTAR FLASHCARD PER MATA KULIAH
export const initialUtsFlashcards = [
  // Mata Kuliah: Pemrograman Web / Mobile
  {
    id: 'fc-1',
    course: 'Pemrograman Web / Mobile',
    question: 'Kapan useEffect dijalankan jika dependency array-nya kosong ([])?',
    answer: 'Hanya sekali setelah render pertama komponen selesai (identik dengan componentDidMount), cocok untuk fetch data inisial.'
  },
  {
    id: 'fc-2',
    course: 'Pemrograman Web / Mobile',
    question: 'Apa perbedaan mendasar antara state dan props di React?',
    answer: 'Props bersifat immutable (read-only) dan dikirim dari parent ke child. State bersifat mutable dan dikelola internal di dalam komponen itu sendiri.'
  },
  {
    id: 'fc-3',
    course: 'Pemrograman Web / Mobile',
    question: 'Apa fungsi hook useRef selain untuk menyimpan referensi elemen DOM?',
    answer: 'Untuk menyimpan nilai mutable apa pun yang persistensinya bertahan antar render TANPA memicu re-render saat nilainya diubah.'
  },

  // Mata Kuliah: Basis Data & SQL
  {
    id: 'fc-4',
    course: 'Basis Data & SQL',
    question: 'Apa syarat utama sebuah tabel dinyatakan dalam bentuk 1NF (First Normal Form)?',
    answer: 'Setiap baris dan kolom harus bernilai atomik (tunggal), tidak memiliki atribut bernilai ganda (multivalued) atau repeating groups.'
  },
  {
    id: 'fc-5',
    course: 'Basis Data & SQL',
    question: 'Apa perbedaan mendasar antara INNER JOIN dan LEFT JOIN?',
    answer: 'INNER JOIN hanya mengembalikan baris yang cocok di kedua tabel. LEFT JOIN mengembalikan seluruh baris tabel kiri ditambah baris yang cocok dari tabel kanan.'
  },
  {
    id: 'fc-6',
    course: 'Basis Data & SQL',
    question: 'Kapan kita harus menggunakan klausa HAVING dan bukan WHERE?',
    answer: 'HAVING digunakan untuk memfilter baris setelah agregasi GROUP BY, sedangkan WHERE memfilter baris sebelum operasi agregasi dilakukan.'
  },

  // Mata Kuliah: Rekayasa Perangkat Lunak
  {
    id: 'fc-7',
    course: 'Rekayasa Perangkat Lunak',
    question: 'Apa perbedaan relasi <<include>> dan <<extend>> pada Use Case Diagram?',
    answer: '<<include>> berarti use case dasar selalu dan wajib menjalankan use case yang di-include. <<extend>> berarti use case tambahan hanya berjalan pada kondisi tertentu (opsional).'
  },
  {
    id: 'fc-8',
    course: 'Rekayasa Perangkat Lunak',
    question: 'Apa yang dilakukan tim pengembang dalam sesi Sprint Retrospective?',
    answer: 'Mengevaluasi proses kerja, komunikasi, dan alat bantu yang digunakan selama sprint untuk menemukan perbaikan efisiensi pada sprint berikutnya.'
  }
];

// 3. DAFTAR SOAL LATIHAN QUIZ PER MATA KULIAH
export const initialUtsQuizzes = [
  // Mata Kuliah: Pemrograman Web / Mobile
  {
    id: 'qz-1',
    course: 'Pemrograman Web / Mobile',
    question: 'Hook apa di React yang digunakan untuk mengakses nilai mutable yang tidak memicu render ulang ketika nilainya diubah?',
    options: ['useState', 'useRef', 'useEffect', 'useReducer'],
    answer: 1, // B (useRef)
    explanation: 'useRef menyimpan referensi mutable (.current) yang perubahannya tidak memicu siklus render ulang komponen.'
  },
  {
    id: 'qz-2',
    course: 'Pemrograman Web / Mobile',
    question: 'Bagaimana cara mencegah memory leak atau pembersihan timer saat komponen unmount di React?',
    options: [
      'Menghapus state yang bersangkutan',
      'Mengembalikan cleanup function di dalam useEffect',
      'Menggunakan useMemo dengan dependency kosong',
      'Menambahkan catch block pada fetch'
    ],
    answer: 1, // B
    explanation: 'Cleanup function yang dikembalikan dari useEffect (return () => { clearInterval(...) }) akan dipanggil saat komponen unmount.'
  },

  // Mata Kuliah: Basis Data & SQL
  {
    id: 'qz-3',
    course: 'Basis Data & SQL',
    question: 'Klausa SQL mana yang digunakan khusus untuk memfilter hasil agregasi setelah fungsi GROUP BY dijalankan?',
    options: ['WHERE', 'ORDER BY', 'HAVING', 'LIMIT'],
    answer: 2, // C (HAVING)
    explanation: 'HAVING mengevaluasi kondisi terhadap kelompok data yang sudah dihitung oleh fungsi agregat (seperti COUNT, SUM, AVG).'
  },
  {
    id: 'qz-4',
    course: 'Basis Data & SQL',
    question: 'Sebuah tabel berada dalam kondisi 2NF apabila...',
    options: [
      'Telah memenuhi 1NF dan tidak memiliki ketergantungan transitif',
      'Telah memenuhi 1NF dan setiap atribut non-primary key bergantung penuh pada Primary Key',
      'Telah memiliki Foreign Key ke seluruh tabel lain',
      'Setiap baris memiliki nilai unik otomatis'
    ],
    answer: 1, // B
    explanation: '2NF menghilangkan ketergantungan parsial (partial functional dependency) pada Primary Key komposit.'
  },

  // Mata Kuliah: Rekayasa Perangkat Lunak
  {
    id: 'qz-5',
    course: 'Rekayasa Perangkat Lunak',
    question: 'Diagram UML yang paling tepat untuk menggambarkan urutan waktu pertukaran pesan (message exchange) antar objek adalah...',
    options: ['Class Diagram', 'Sequence Diagram', 'Deployment Diagram', 'Component Diagram'],
    answer: 1, // B (Sequence Diagram)
    explanation: 'Sequence Diagram berfokus pada alur interaksi dinamis dan dimensi urutan waktu pengiriman pesan antar partisipan.'
  },
  {
    id: 'qz-6',
    course: 'Rekayasa Perangkat Lunak',
    question: 'Pertemuan harian 15 menit dalam Scrum di mana anggota tim menyampaikan progres kemarin, rencana hari ini, dan kendala disebut...',
    options: ['Sprint Planning', 'Daily Standup', 'Sprint Review', 'Backlog Refinement'],
    answer: 1, // B (Daily Standup)
    explanation: 'Daily Standup (Daily Scrum) adalah sesi koordinasi harian singkat tim pengembang berdurasi maksimal 15 menit.'
  }
];

// 4. JADWAL RESMI PELAKSANAAN UTS
export const initialUtsExamSchedule = [
  {
    id: 'ex-1',
    course: 'Pemrograman Web / Mobile',
    date: '2026-11-02',
    dayName: 'Senin',
    time: '08:00 - 09:40 WIB',
    room: 'Lab Komputer 3',
    type: 'Praktikum & Teori',
    nature: 'Open Book / Laptop',
    lecturer: 'Dosen Pengampu',
    sks: 3,
    topics: 'Pertemuan 1 - 7: Fundamental Web, React State & API'
  },
  {
    id: 'ex-2',
    course: 'Basis Data & SQL',
    date: '2026-11-04',
    dayName: 'Rabu',
    time: '10:00 - 11:40 WIB',
    room: 'Ruang Teori 204',
    type: 'Ujian Tertulis',
    nature: 'Closed Book',
    lecturer: 'Dosen Pengampu',
    sks: 3,
    topics: 'ERD, Normalisasi 1NF-3NF, Query DDL, DML & Subquery'
  },
  {
    id: 'ex-3',
    course: 'Rekayasa Perangkat Lunak',
    date: '2026-11-06',
    dayName: 'Jumat',
    time: '13:30 - 15:10 WIB',
    room: 'Ruang Teori 301',
    type: 'Analisis Studi Kasus',
    nature: 'Open Sheet (1 Lembar Catatan)',
    lecturer: 'Dosen Pengampu',
    sks: 2,
    topics: 'Metodologi Agile/Scrum, Requirement Gathering, UML Diagram'
  }
];
