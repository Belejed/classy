/**
 * DATA PUSAT PERSIAPAN UTS KELAS (Classy UTS Hub)
 * Disesuaikan dengan kurikulum & mata kuliah kelas M.Log B (Manajemen Logistik):
 * 1. Pengantar Logistik
 * 2. Pengantar Transportasi
 * 3. Ekonomi Mikro
 * 4. Matematika Ekonomi
 * 5. Pengantar Akuntansi
 * 6. Pengantar Bisnis dan Inovasi
 * 7. Prinsip - Prinsip Manajemen
 * 8. Pendidikan Pancasila
 */

// 1. DAFTAR MATA KULIAH & RANGKUMAN KISI-KISI MATERI
export const initialUtsMaterials = [
  {
    id: 'mat-logistik',
    course: 'Pengantar Logistik',
    code: 'LOG-101',
    description: 'Konsep dasar logistik & supply chain, prinsip 7R, pergudangan (warehousing), inventory control, dan bullwhip effect.',
    topics: [
      'Konsep Dasar Logistik vs Supply Chain Management (SCM)',
      'Prinsip 7R Logistik (Right Product, Quantity, Condition, Place, Time, Customer, Cost)',
      'Fungsi Pergudangan (Warehousing) & Pengendalian Persediaan (Inventory Control)',
      'Fenomena Bullwhip Effect: Penyebab dan Solusi Mitigasi',
      'Distribusi Fisik & Integrasi Moda Logistik'
    ],
    modules: [
      {
        id: 'mod-log-1',
        title: 'Fundamental Logistik & Prinsip 7R (Pertemuan 1 - 3)',
        keyPoints: [
          'Logistik berfokus pada aliran barang, informasi, dan dana dari titik asal ke titik konsumsi.',
          'Perbedaan: Logistik adalah bagian operasional internal, sedangkan SCM mencakup koordinasi lintas entitas (pemasok hingga konsumen akhir).',
          'Prinsip 7R menjamin kepuasan pelanggan dengan efisiensi biaya tertinggi.'
        ],
        cheatsheet: '7R Prinsip: Right Product, Right Quantity, Right Condition, Right Place, Right Time, Right Customer, Right Cost.',
        examTip: 'Hafalkan definisi 7R dan perbedaan mendasar antara ruang lingkup Logistik vs Supply Chain.',
        sampleQuestion: 'Jelaskan perbedaan mendasar antara aktivitas logistik dan manajemen rantai pasok (SCM)!'
      },
      {
        id: 'mod-log-2',
        title: 'Pergudangan, Persediaan & Bullwhip Effect (Pertemuan 4 - 7)',
        keyPoints: [
          'Aktivitas utama gudang: Receiving, Put-away, Storage, Order Picking, Packing, Shipping.',
          'Bullwhip Effect adalah fenomena distorsi fluktuasi permintaan yang semakin membesar dari hilir (konsumen) ke hulu (pemasok).',
          'Penyebab bullwhip effect: peramalan berulang, pemesanan kelompok (order batching), spekulasi harga, dan shortage gaming.'
        ],
        cheatsheet: 'Solusi Bullwhip Effect: Information Sharing (POS data), Lead time reduction, Vendor Managed Inventory (VMI).',
        examTip: 'Dosen sering menanyakan skenario rantai pasok dan meminta solusi meredam Bullwhip Effect.',
        sampleQuestion: 'Sebutkan 4 penyebab utama terjadinya Bullwhip Effect dan berikan contoh solusinya!'
      }
    ]
  },
  {
    id: 'mat-transportasi',
    course: 'Pengantar Transportasi',
    code: 'LOG-102',
    description: 'Peran transportasi dalam ekonomi, perbandingan karakteristik moda (darat, laut, udara, rel), struktur biaya, dan intermodal.',
    topics: [
      'Peran & Fungsi Transportasi dalam Aktivitas Ekonomi dan Logistik',
      'Karakteristik & Trade-off Moda Transportasi: Darat, Laut, Udara, Rel, dan Pipa',
      'Struktur Biaya Transportasi: Fixed Cost vs Variable Cost',
      'Transportasi Multimoda & Intermodalitas (Konektivitas Pelabuhan & Hub)',
      'Dampak Eksternalitas: Emisi, Kemacetan & Green Logistics'
    ],
    modules: [
      {
        id: 'mod-tr-1',
        title: 'Karakteristik & Perbandingan Moda Transportasi (Pertemuan 1 - 3)',
        keyPoints: [
          'Truk (Road): Fleksibilitas tinggi door-to-door, kapasitas terbatas, rentan macet.',
          'Kereta Api (Rail): Efisien untuk kargo berat jarak jauh, fixed cost tinggi, rute kaku.',
          'Kapal Laut (Maritime): Kapasitas muat terbesar, biaya per ton terendah, waktu tempuh lambat.',
          'Pesawat Udara (Air): Kecepatan tertinggi, biaya sangat mahal, cocok untuk komoditas bernilai tinggi/perishable.'
        ],
        cheatsheet: 'Trade-off: Kecepatan vs Biaya -> Air (Cepat/Mahal) vs Sea (Lambat/Murah) vs Road (Fleksibel/Sedang).',
        examTip: 'Pahami tabel perbandingan kelima moda transportasi berdasarkan kecepatan, kapasitas, ketersediaan, dan biaya.',
        sampleQuestion: 'Bandingkan kelebihan dan kekurangan pengiriman via moda Laut vs Udara untuk produk farmasi!'
      },
      {
        id: 'mod-tr-2',
        title: 'Biaya Transportasi & Sistem Intermodal (Pertemuan 4 - 7)',
        keyPoints: [
          'Fixed Cost transportasi mencakup terminal, infrastruktur jalan rel, armada kendaraan.',
          'Variable Cost meliputi bahan bakar, tol, biaya awak kendaraan, dan pemeliharaan.',
          'Intermodal Transportation menggunakan unit muatan terstandarisasi (kontainer) tanpa bongkar muat isi barang saat berganti moda.'
        ],
        cheatsheet: 'Intermodal = 1 peti kemas berpindah dari truk -> kereta -> kapal laut tanpa membongkar isi.',
        examTip: 'Kuasai konsep standardisasi peti kemas (TEU - Twenty-foot Equivalent Unit).',
        sampleQuestion: 'Mengapa penggunaan kontainer terstandarisasi (containerization) sangat merevolusi efisiensi transportasi global?'
      }
    ]
  },
  {
    id: 'mat-mikro',
    course: 'Ekonomi Mikro',
    code: 'EKO-101',
    description: 'Hukum permintaan-penawaran, elastisitas harga, teori perilaku konsumen, kurva indiferen, struktur biaya produksi, dan pasar.',
    topics: [
      'Kelangkaan (Scarcity), Pilihan, dan Biaya Peluang (Opportunity Cost)',
      'Hukum Permintaan, Penawaran & Keseimbangan Pasar (Equilibrium)',
      'Elastisitas Permintaan dan Penawaran (Elastis, Inelastis, Uniter)',
      'Teori Perilaku Konsumen: Pendekatan Kardinal (Marginal Utility) & Ordinal (Indifference Curve)',
      'Teori Produksi & Biaya Jangka Pendek: FC, VC, TC, MC, AC'
    ],
    modules: [
      {
        id: 'mod-mik-1',
        title: 'Permintaan, Penawaran & Keseimbangan Pasar (Pertemuan 1 - 3)',
        keyPoints: [
          'Hukum Permintaan: Jika harga naik, jumlah barang yang diminta turun (ceteris paribus).',
          'Hukum Penawaran: Jika harga naik, jumlah barang yang ditawarkan naik (ceteris paribus).',
          'Titik Keseimbangan terjadi saat kurva Qd berpotongan dengan Qs (Qd = Qs).'
        ],
        cheatsheet: 'Equilibrium: Qd = Qs -> Temukan Pe (harga keseimbangan) lalu substitusi ke Qd untuk dapat Qe.',
        examTip: 'Hati-hati perbedaan pergeseran kurva (shifting) vs pergerakan sepanjang kurva (movement along the curve).',
        sampleQuestion: 'Jika Qd = 100 - 2P dan Qs = 20 + 2P, hitunglah harga (P) dan kuantitas (Q) keseimbangan pasar!'
      },
      {
        id: 'mod-mik-2',
        title: 'Elastisitas & Struktur Biaya Produksi (Pertemuan 4 - 7)',
        keyPoints: [
          'Koefisien Elastisitas: Ed > 1 (Elastis), Ed < 1 (Inelastis), Ed = 1 (Uniter).',
          'Biaya Total (TC) = Fixed Cost (FC) + Variable Cost (VC).',
          'Biaya Marjinal (MC) = Perubahan TC dibagi perubahan kuantitas (dTC / dQ).'
        ],
        cheatsheet: 'MC = ΔTC / ΔQ atau turunan pertama dari fungsi TC. Nilai AC minimum saat AC = MC.',
        examTip: 'Kuasai perhitungan MC dan AC dari persamaan fungsi TC kuadratik.',
        sampleQuestion: 'Diketahui TC = Q² + 4Q + 50. Tentukan fungsi Biaya Marjinal (MC) dan Biaya Rata-Rata (AC)!'
      }
    ]
  },
  {
    id: 'mat-matek',
    course: 'Matematika Ekonomi',
    code: 'MAT-101',
    description: 'Penerapan fungsi linier, gradien, fungsi permintaan & penawaran, pengaruh pajak & subsidi, serta Break Even Point (BEP).',
    topics: [
      'Sistem Koordinat, Persamaan Garis Lurus & Gradien (Slope)',
      'Fungsi Permintaan & Penawaran Linier',
      'Pengaruh Pajak Per Unit (t) & Pajak Proporsional terhadap Keseimbangan Pasar',
      'Pengaruh Subsidi Per Unit (s) terhadap Keseimbangan Pasar',
      'Fungsi Biaya, Pendapatan (TR = P × Q), dan Analisis Titik Impas (BEP)'
    ],
    modules: [
      {
        id: 'mod-mat-1',
        title: 'Fungsi Permintaan, Penawaran & Keseimbangan Pasar (Pertemuan 1 - 3)',
        keyPoints: [
          'Bentuk umum fungsi linier: P - P1 / P2 - P1 = Q - Q1 / Q2 - Q1.',
          'Gradien kurva permintaan selalu negatif (menurun dari kiri atas ke kanan bawah).',
          'Keseimbangan pasar terjadi saat Qd = Qs atau Pd = Ps.'
        ],
        cheatsheet: 'Rumus Gradien: m = (y2 - y1) / (x2 - x1). Persamaan garis: y - y1 = m(x - x1).',
        examTip: 'Jangan sampai tertukar menempatkan variabel P di sumbu vertikal dan Q di sumbu horizontal.',
        sampleQuestion: 'Tentukan fungsi permintaan jika pada P=10, Q=50 dan pada P=15, Q=30!'
      },
      {
        id: 'mod-mat-2',
        title: 'Dampak Pajak, Subsidi & Analisis BEP (Pertemuan 4 - 7)',
        keyPoints: [
          'Pajak (t) menggeser kurva penawaran ke atas: Pst = Ps + t (harga penawaran naik).',
          'Subsidi (s) menggeser kurva penawaran ke bawah: Pss = Ps - s (harga penawaran turun).',
          'Break Even Point (BEP) tercapai saat Total Revenue sama dengan Total Cost (TR = TC atau Laba = 0).'
        ],
        cheatsheet: 'BEP (Unit) = Total Fixed Cost / (Harga Jual per unit - Variable Cost per unit) = FC / (P - VC).',
        examTip: 'Dosen sering meminta menghitung beban pajak yang ditanggung konsumen (tk = Pet - Pe) dan produsen.',
        sampleQuestion: 'Hitunglah titik impas (BEP) jika FC = Rp 10.000.000, VC/unit = Rp 15.000, dan harga jual P = Rp 25.000!'
      }
    ]
  },
  {
    id: 'mat-akuntansi',
    course: 'Pengantar Akuntansi',
    code: 'AKT-101',
    description: 'Siklus akuntansi jasa & dagang, persamaan dasar akuntansi, debit-kredit, jurnal umum, buku besar, neraca saldo, dan penyesuaian.',
    topics: [
      'Definisi Akuntansi, Pengguna Informasi & Prinsip Entitas Terpisah',
      'Persamaan Dasar Akuntansi: Aset = Liabilitas + Ekuitas',
      'Aturan Saldo Normal & Pendebetan/Pengkreditan Akun',
      'Pencatatan Transaksi ke Jurnal Umum & Posting ke Buku Besar',
      'Penyusunan Neraca Saldo & Jurnal Penyesuaian (Adjusting Entries)'
    ],
    modules: [
      {
        id: 'mod-akt-1',
        title: 'Persamaan Dasar Akuntansi & Aturan Debit-Kredit (Pertemuan 1 - 3)',
        keyPoints: [
          'Aset = Liabilitas (Kewajiban) + Ekuitas (Modal).',
          'Setiap transaksi keuangan mempertahankan keseimbangan sisi kiri dan sisi kanan.',
          'Saldo normal: Aset & Beban bertambah di DEBIT; Liabilitas, Ekuitas & Pendapatan bertambah di KREDIT.'
        ],
        cheatsheet: 'Saldo Normal DEBIT: Aset, Beban, Prive.\nSaldo Normal KREDIT: Liabilitas, Ekuitas, Pendapatan.',
        examTip: 'Hafalkan saldo normal akun! Kesalahan meletakkan debit/kredit langsung membuat neraca saldo tidak seimbang.',
        sampleQuestion: 'Perusahaan membeli peralatan kantor Rp 5.000.000 secara kredit. Bagaimana analisis persamaan dasar akuntansinya?'
      },
      {
        id: 'mod-akt-2',
        title: 'Siklus Akuntansi & Jurnal Penyesuaian (Pertemuan 4 - 7)',
        keyPoints: [
          'Tahapan: Bukti Transaksi -> Jurnal Umum -> Buku Besar -> Neraca Saldo -> Jurnal Penyesuaian.',
          'Jurnal penyesuaian wajib untuk pendapatan diterima di muka, beban dibayar di muka, beban akrual, dan penyusutan.',
          'Penyusutan aktiva tetap: Beban Penyusutan (D) pada Akumulasi Penyusutan (K).'
        ],
        cheatsheet: 'Penyesuaian Perlengkapan: Beban Perlengkapan (D) | Perlengkapan (K) sebesar nilai yang TERPAKAI.',
        examTip: 'Perhatikan apakah nilai perlengkapan yang dicatat adalah yang tersisa atau yang telah terpakai.',
        sampleQuestion: 'Pada neraca saldo perlengkapan tercatat Rp 3.000.000. Pada akhir periode sisa perlengkapan Rp 1.000.000. Buatlah jurnal penyesuaiannya!'
      }
    ]
  },
  {
    id: 'mat-bisnis',
    course: 'Pengantar Bisnis dan Inovasi',
    code: 'MAN-101',
    description: 'Lingkungan bisnis, bentuk badan usaha, analisis SWOT & PESTEL, jenis inovasi, dan 9 blok Business Model Canvas (BMC).',
    topics: [
      'Hakikat Bisnis, Sistem Ekonomi, dan Bentuk Badan Usaha (PT, CV, Firma, Koperasi)',
      'Analisis Lingkungan Bisnis: Internal (SWOT) & Eksternal Makro (PESTEL)',
      'Konsep Inovasi: Inovasi Inkremental, Modular, Arsitektural, dan Disruptif',
      'Penyusunan Business Model Canvas (BMC) 9 Blok',
      'Etika Bisnis & Tanggung Jawab Sosial Perusahaan (CSR)'
    ],
    modules: [
      {
        id: 'mod-bis-1',
        title: 'Badan Usaha & Analisis Lingkungan Bisnis (Pertemuan 1 - 3)',
        keyPoints: [
          'PT (Perseroan Terbatas): Tanggung jawab pemegang saham terbatas sebatas modal disetor.',
          'CV (Commanditaire Vennootschap): Terdapat sekutu aktif (tanggung jawab penuh) dan sekutu pasif (modal saja).',
          'Analisis SWOT: Strengths & Weaknesses (Internal) vs Opportunities & Threats (Eksternal).'
        ],
        cheatsheet: 'PESTEL: Political, Economic, Social, Technological, Environmental, Legal.',
        examTip: 'Bedakan tanggung jawab sekutu aktif vs pasif pada CV, sering keluar dalam soal pilihan ganda!',
        sampleQuestion: 'Jelaskan perbedaan mendasar mengenai tanggung jawab hukum antara Perseroan Terbatas (PT) dan CV!'
      },
      {
        id: 'mod-bis-2',
        title: 'Inovasi & Business Model Canvas (BMC) (Pertemuan 4 - 7)',
        keyPoints: [
          'Inovasi disruptif menciptakan pasar baru dan menggantikan pemain mapan lama dengan solusi lebih terjangkau/mudah diakses.',
          '9 Blok BMC: Customer Segments, Value Propositions, Channels, Customer Relationships, Revenue Streams, Key Resources, Key Activities, Key Partnerships, Cost Structure.',
          'Value Proposition adalah alasan kuat mengapa konsumen memilih produk/layanan Anda dibanding kompetitor.'
        ],
        cheatsheet: 'Value Proposition = Janji nilai manfaat yang diserahkan kepada segmen pelanggan.',
        examTip: 'Hafalkan kesembilan blok Business Model Canvas (BMC) dan keterkaitannya.',
        sampleQuestion: 'Sebutkan dan jelaskan 3 blok utama dalam Business Model Canvas yang berfokus pada pelanggan!'
      }
    ]
  },
  {
    id: 'mat-manajemen',
    course: 'Prinsip - Prinsip Manajemen',
    code: 'MAN-102',
    description: 'Fungsi manajemen POAC, teori perkembangan manajemen, perencanaan & penetapan tujuan SMART, struktur organisasi, dan kepemimpinan.',
    topics: [
      'Definisi Manajemen & 4 Fungsi Utama: Planning, Organizing, Actuating, Controlling (POAC)',
      'Tingkatan Manajemen (Top, Middle, First-line) & Keterampilan Manajerial',
      'Perencanaan Strategis & Penetapan Sasaran SMART (Specific, Measurable, Achievable, Relevant, Time-bound)',
      'Pengorganisasian: Struktur Organisasi, Rentang Kendali (Span of Control) & Pendelegasian Wewenang',
      'Kepemimpinan, Motivasi Kerja (Maslow & Herzberg), dan Pengawasan Efektif'
    ],
    modules: [
      {
        id: 'mod-man-1',
        title: 'Fungsi POAC & Tingkatan Manajemen (Pertemuan 1 - 3)',
        keyPoints: [
          'Planning: Menentukan tujuan dan cara terbaik mencapainya.',
          'Organizing: Mengalokasikan sumber daya manusia dan material.',
          'Actuating/Leading: Mengarahkan dan memotivasi tim kerja.',
          'Controlling: Mengukur kinerja aktual terhadap standar rencana dan melakukan koreksi.'
        ],
        cheatsheet: 'Keterampilan Manajemen (Katz): Top Manager butuh Conceptual Skill; First-line butuh Technical Skill; Human Skill dibutuhkan semua tingkat.',
        examTip: 'Jangan tertukar proporsi keahlian: Manajemen Puncak paling butuh keterampilan konseptual.',
        sampleQuestion: 'Jelaskan 4 fungsi utama manajemen (POAC) dan berikan contoh penerapannya dalam tim proyek!'
      },
      {
        id: 'mod-man-2',
        title: 'Perencanaan SMART & Teori Motivasi (Pertemuan 4 - 7)',
        keyPoints: [
          'Target SMART: Specific, Measurable, Achievable, Relevant, Time-bound.',
          'Hierarki Kebutuhan Maslow: Fisiologis -> Rasa Aman -> Sosial/Kasih Sayang -> Penghargaan -> Aktualisasi Diri.',
          'Teori Dua Faktor Herzberg: Hygiene Factors (mencegah ketidakpuasan) vs Motivation Factors (mendorong kepuasan hakiki).'
        ],
        cheatsheet: 'Maslow: Kebutuhan tingkat lebih rendah harus relatif terpenuhi sebelum tingkat berikutnya memotivasi individu.',
        examTip: 'Pahami teori motivasi Maslow dan Herzberg untuk analisis soal studi kasus kepemimpinan.',
        sampleQuestion: 'Bagaimana seorang manajer dapat memotivasi karyawannya berdasarkan teori Hierarki Kebutuhan Maslow?'
      }
    ]
  },
  {
    id: 'mat-pancasila',
    course: 'Pendidikan Pancasila',
    code: 'PAN-101',
    description: 'Pancasila sebagai dasar negara & ideologi nasional, sejarah perumusan BPUPKI-PPKI, nilai Pancasila 1–5, etika politik, dan tantangan ideologi.',
    topics: [
      'Pancasila sebagai Dasar Negara, Pandangan Hidup, dan Ideologi Nasional',
      'Dinamika Sejarah Perumusan Pancasila: Sidang BPUPKI, Piagam Jakarta, Sidang PPKI 18 Agustus 1945',
      'Penjabaran Nilai-Nilai Dasar, Instrumental, dan Praksis Sila 1 s/d 5',
      'Pancasila sebagai Sistem Filsafat dan Sistem Etika',
      'Tantangan Ideologi Pancasila di Era Globalisasi & Digitalisasi'
    ],
    modules: [
      {
        id: 'mod-pan-1',
        title: 'Sejarah Perumusan & Kedudukan Pancasila (Pertemuan 1 - 3)',
        keyPoints: [
          'Tokoh pengusul dasar negara di BPUPKI: Mohammad Yamin (29 Mei), Soepomo (31 Mei), Ir. Soekarno (1 Juni 1945).',
          'Piagam Jakarta (22 Juni 1945) disepakati dengan perubahan klausul 7 kata sila pertama demi persatuan bangsa.',
          'Pengesahan UUD 1945 dan Pancasila secara yuridis konstitusional dilakukan pada sidang PPKI 18 Agustus 1945.'
        ],
        cheatsheet: '1 Juni = Hari Lahir Pancasila (Pidato Soekarno). 18 Agustus = Pengesahan Pancasila sebagai Dasar Negara.',
        examTip: 'Hafalkan tanggal penting: 29 Mei - 1 Juni (Sidang I BPUPKI), 22 Juni (Piagam Jakarta), 18 Agustus (PPKI).',
        sampleQuestion: 'Mengapa rumusan sila pertama Piagam Jakarta diubah pada sidang PPKI 18 Agustus 1945?'
      },
      {
        id: 'mod-pan-2',
        title: 'Pancasila sebagai Sistem Etika & Aktualisasi Nilai (Pertemuan 4 - 7)',
        keyPoints: [
          'Nilai Dasar: Bersifat universal, tetap, dan terkandung dalam pembukaan UUD 1945 (Ketuhanan, Kemanusiaan, Persatuan, Kerakyatan, Keadilan).',
          'Nilai Instrumental: Penjabaran dalam bentuk perundang-undangan dan kebijakan negara.',
          'Nilai Praksis: Realisasi nilai instrumental dalam perilaku nyata sehari-hari.'
        ],
        cheatsheet: 'Tingkatan Nilai: Nilai Dasar (Prinsip) -> Nilai Instrumental (Aturan/UU) -> Nilai Praksis (Tindakan Nyata).',
        examTip: 'Dosen sering memberikan contoh kasus pelanggaran hukum dan meminta mahasiswa mengidentifikasi sila yang dilanggar.',
        sampleQuestion: 'Jelaskan perbedaan antara Nilai Dasar, Nilai Instrumental, dan Nilai Praksis dalam Pancasila!'
      }
    ]
  }
];

// 2. DAFTAR FLASHCARD PER MATA KULIAH
export const initialUtsFlashcards = [
  // Pengantar Logistik
  {
    id: 'fc-log-1',
    course: 'Pengantar Logistik',
    question: 'Sebutkan 7 Prinsip R (7R) dalam aktivitas manajemen logistik!',
    answer: 'Right Product, Right Quantity, Right Condition, Right Place, Right Time, Right Customer, dan Right Cost.'
  },
  {
    id: 'fc-log-2',
    course: 'Pengantar Logistik',
    question: 'Apa yang dimaksud dengan fenomena Bullwhip Effect dalam rantai pasok?',
    answer: 'Kondisi distorsi di mana fluktuasi pesanan semakin membesar secara eksponensial seiring bergeraknya informasi dari konsumen hilir ke pemasok hulu.'
  },
  {
    id: 'fc-log-3',
    course: 'Pengantar Logistik',
    question: 'Apa perbedaan mendasar antara aktivitas Logistik dan Supply Chain Management (SCM)?',
    answer: 'Logistik berfokus pada integrasi aliran fisik barang di internal organisasi, sedangkan SCM mengoordinasikan seluruh jaringan mitra bisnis dari pemasok pertama hingga pelanggan akhir.'
  },

  // Pengantar Transportasi
  {
    id: 'fc-tr-1',
    course: 'Pengantar Transportasi',
    question: 'Moda transportasi manakah yang memiliki kapasitas muatan terbesar dengan biaya per ton terendah?',
    answer: 'Moda Transportasi Laut (Maritime/Water Transport), sangat optimal untuk pengangkutan komoditas curah jarak jauh.'
  },
  {
    id: 'fc-tr-2',
    course: 'Pengantar Transportasi',
    question: 'Apa definisi transportasi Intermodal?',
    answer: 'Pengangkutan barang menggunakan lebih dari satu moda transportasi dalam unit muatan terstandar (seperti peti kemas kontainer) tanpa perlu membongkar isi barang saat pergantian moda.'
  },

  // Ekonomi Mikro
  {
    id: 'fc-mik-1',
    course: 'Ekonomi Mikro',
    question: 'Apa bunyi Hukum Permintaan dan bagaimana bentuk kemiringan (slope) kurvanya?',
    answer: 'Jika harga barang naik maka jumlah barang yang diminta akan turun (ceteris paribus). Kemiringan kurva permintaan bernilai negatif (slope ke bawah dari kiri atas ke kanan bawah).'
  },
  {
    id: 'fc-mik-2',
    course: 'Ekonomi Mikro',
    question: 'Apa yang dimaksud dengan Biaya Marjinal (Marginal Cost - MC)?',
    answer: 'Tambahan biaya total yang harus dikeluarkan perusahaan untuk memproduksi satu unit tambahan output barang (MC = ΔTC / ΔQ).'
  },

  // Matematika Ekonomi
  {
    id: 'fc-mat-1',
    course: 'Matematika Ekonomi',
    question: 'Bagaimana pengaruh pengenaan Pajak Per Unit (t) terhadap fungsi penawaran?',
    answer: 'Pajak menaikkan harga penawaran produsen sehingga fungsi penawaran baru menjadi Pst = Ps + t, yang menggeser kurva penawaran ke arah atas/kiri.'
  },
  {
    id: 'fc-mat-2',
    course: 'Matematika Ekonomi',
    question: 'Bagaimana rumus dasar menghitung Break Even Point (BEP) dalam satuan unit?',
    answer: 'BEP (Unit) = Total Fixed Cost / (Harga Jual per unit - Variable Cost per unit) = FC / (P - VC).'
  },

  // Pengantar Akuntansi
  {
    id: 'fc-akt-1',
    course: 'Pengantar Akuntansi',
    question: 'Tuliskan rumus Persamaan Dasar Akuntansi dan sebutkan komponennya!',
    answer: 'Aset = Liabilitas + Ekuitas (Aktiva = Kewajiban + Modal). Nilai total harta harus selalu seimbang dengan sumber pendanaannya.'
  },
  {
    id: 'fc-akt-2',
    course: 'Pengantar Akuntansi',
    question: 'Akun kelompok manakah yang saldo normalnya bertambah di posisi DEBIT?',
    answer: 'Kelompok akun Aset (Harta), akun Beban (Biaya), dan akun Prive/Dividen.'
  },

  // Pengantar Bisnis dan Inovasi
  {
    id: 'fc-bis-1',
    course: 'Pengantar Bisnis dan Inovasi',
    question: 'Apa perbedaan tanggung jawab sekutu aktif dan sekutu pasif pada badan usaha CV?',
    answer: 'Sekutu aktif mengelola operasional dengan tanggung jawab pribadi tak terbatas hingga harta pribadi; sekutu pasif hanya menyetor modal dengan tanggung jawab terbatas sebesar modal yang disetor.'
  },
  {
    id: 'fc-bis-2',
    course: 'Pengantar Bisnis dan Inovasi',
    question: 'Apa arti blok Value Proposition dalam Business Model Canvas (BMC)?',
    answer: 'Kumpulan nilai, keunggulan kompetitif, dan solusi unik yang ditawarkan perusahaan untuk memecahkan masalah atau memenuhi kebutuhan segmen konsumennya.'
  },

  // Prinsip - Prinsip Manajemen
  {
    id: 'fc-man-1',
    course: 'Prinsip - Prinsip Manajemen',
    question: 'Sebutkan 4 fungsi manajemen dasar menurut teori POAC!',
    answer: 'Planning (Perencanaan), Organizing (Pengorganisasian), Actuating/Leading (Penggerakan/Pelaksanaan), dan Controlling (Pengawasan/Pengendalian).'
  },
  {
    id: 'fc-man-2',
    course: 'Prinsip - Prinsip Manajemen',
    question: 'Tingkatan manajer manakah yang paling dominan membutuhkan Conceptual Skill?',
    answer: 'Top Manager (Manajemen Puncak), karena bertugas merumuskan visi jangka panjang, strategi korporat, dan arah kebijakan organisasi.'
  },

  // Pendidikan Pancasila
  {
    id: 'fc-pan-1',
    course: 'Pendidikan Pancasila',
    question: 'Kapan Pancasila secara resmi dan yuridis disahkan sebagai Dasar Negara Indonesia?',
    answer: 'Pada tanggal 18 Agustus 1945 dalam Sidang Panitia Persiapan Kemerdekaan Indonesia (PPKI).'
  },
  {
    id: 'fc-pan-2',
    course: 'Pendidikan Pancasila',
    question: 'Apa perbedaan antara Nilai Dasar dan Nilai Praksis dalam Pancasila?',
    answer: 'Nilai Dasar adalah prinsip hakiki sila Pancasila yang bersifat tetap dan universal; sedangkan Nilai Praksis adalah perwujudan konkret nilai tersebut dalam tindakan nyata sehari-hari.'
  }
];

// 3. DAFTAR SOAL LATIHAN QUIZ PER MATA KULIAH
export const initialUtsQuizzes = [
  // Pengantar Logistik
  {
    id: 'qz-log-1',
    course: 'Pengantar Logistik',
    question: 'Prinsip logistik yang memastikan pengiriman barang tidak mengalami kerusakan fisik dan memenuhi standar mutu pembeli disebut...',
    options: ['Right Customer', 'Right Condition', 'Right Quantity', 'Right Place'],
    answer: 1, // B (Right Condition)
    explanation: 'Right Condition berarti barang harus sampai ke tangan penerima dalam kondisi utuh, baik, dan tidak cacat fisik atau mengalami penurunan kualitas.'
  },
  {
    id: 'qz-log-2',
    course: 'Pengantar Logistik',
    question: 'Manakah di bawah ini yang merupakan langkah paling efektif untuk mengurangi dampak negatif Bullwhip Effect dalam rantai pasok?',
    options: [
      'Menambah jumlah perantara distributor di setiap kota',
      'Meningkatkan frekuensi pemesanan dalam jumlah raksasa (bulk order)',
      'Berbagi data permintaan kasir riil (POS Data) secara transparan antar mitra',
      'Menaikkan harga produk secara fluktuatif setiap minggu'
    ],
    answer: 2, // C
    explanation: 'Transparansi Point-of-Sale (POS) data riil langsung dari konsumen memungkinkan seluruh pemasok hulu memproduksi sesuai kebutuhan nyata tanpa over-forecasting.'
  },

  // Pengantar Transportasi
  {
    id: 'qz-tr-1',
    course: 'Pengantar Transportasi',
    question: 'Keunggulan utama moda transportasi truk (road transport) dibandingkan moda kereta api atau kapal laut adalah...',
    options: [
      'Memiliki kapasitas angkut per ton paling besar',
      'Kemampuan layanan langsung dari pintu ke pintu (door-to-door service)',
      'Konsumsi bahan bakar per ton kargo paling hemat',
      'Bebas dari risiko kemacetan lalu lintas perkotaan'
    ],
    answer: 1, // B
    explanation: 'Truk memiliki fleksibilitas rute paling tinggi dan dapat menjangkau langsung titik muat pengirim hingga pekarangan penerima (door-to-door).'
  },
  {
    id: 'qz-tr-2',
    course: 'Pengantar Transportasi',
    question: 'Standar ukuran kontainer internasional 1 TEU setara dengan ukuran panjang peti kemas...',
    options: ['10 Kaki (Feet)', '20 Kaki (Feet)', '40 Kaki (Feet)', '45 Kaki (Feet)'],
    answer: 1, // B (20 Feet)
    explanation: 'TEU merupakan singkatan dari Twenty-foot Equivalent Unit, yaitu satuan baku peti kemas berukuran panjang 20 kaki.'
  },

  // Ekonomi Mikro
  {
    id: 'qz-mik-1',
    course: 'Ekonomi Mikro',
    question: 'Jika fungsi permintaan Qd = 80 - 4P dan fungsi penawaran Qs = 20 + 2P, berapakah harga keseimbangan (Pe) pasar?',
    options: ['Pe = 10', 'Pe = 15', 'Pe = 8', 'Pe = 12'],
    answer: 0, // A (Pe = 10)
    explanation: 'Keseimbangan: Qd = Qs -> 80 - 4P = 20 + 2P -> 60 = 6P -> P = 10. (Jumlah keseimbangan Q = 40 unit).'
  },
  {
    id: 'qz-mik-2',
    course: 'Ekonomi Mikro',
    question: 'Kondisi di mana persentase perubahan jumlah barang yang diminta lebih kecil daripada persentase perubahan harga barang (Ed < 1) disebut...',
    options: ['Elastis', 'Inelastis', 'Elastis Uniter', 'Inelastis Sempurna'],
    answer: 1, // B (Inelastis)
    explanation: 'Ed < 1 menandakan permintaan inelastis, biasanya terjadi pada barang-barang kebutuhan pokok yang sulit dicari substitusinya.'
  },

  // Matematika Ekonomi
  {
    id: 'qz-mat-1',
    course: 'Matematika Ekonomi',
    question: 'Perusahaan memiliki Fixed Cost Rp 20.000.000, Variable Cost Rp 30.000/unit, dan harga jual P = Rp 50.000/unit. Berapakah BEP dalam unit?',
    options: ['500 Unit', '1.000 Unit', '1.500 Unit', '2.000 Unit'],
    answer: 1, // B (1.000 Unit)
    explanation: 'BEP = FC / (P - VC) = 20.000.000 / (50.000 - 30.000) = 20.000.000 / 20.000 = 1.000 Unit.'
  },
  {
    id: 'qz-mat-2',
    course: 'Matematika Ekonomi',
    question: 'Jika fungsi penawaran awal adalah P = 3 + 0.5Q, dan pemerintah memberikan subsidi sebesar s = 1 per unit, maka persamaan penawaran baru adalah...',
    options: ['P = 4 + 0.5Q', 'P = 2 + 0.5Q', 'P = 3 + 1.5Q', 'P = 1 + 0.5Q'],
    answer: 1, // B (P = 2 + 0.5Q)
    explanation: 'Dengan subsidi (s), kurva penawaran bergeser turun: Pss = Ps - s = (3 + 0.5Q) - 1 = 2 + 0.5Q.'
  },

  // Pengantar Akuntansi
  {
    id: 'qz-akt-1',
    course: 'Pengantar Akuntansi',
    question: 'Perusahaan membayar beban sewa kantor sebesar Rp 6.000.000 secara tunai. Pencatatan jurnal umum yang tepat adalah...',
    options: [
      'Kas (D) Rp 6.000.000; Beban Sewa (K) Rp 6.000.000',
      'Beban Sewa (D) Rp 6.000.000; Kas (K) Rp 6.000.000',
      'Sewa Dibayar di Muka (D) Rp 6.000.000; Modal (K) Rp 6.000.000',
      'Beban Sewa (D) Rp 6.000.000; Utang Usaha (K) Rp 6.000.000'
    ],
    answer: 1, // B
    explanation: 'Beban Sewa bertambah di posisi Debit sebesar Rp 6.000.000, dan aset Kas berkurang di posisi Kredit sebesar Rp 6.000.000.'
  },
  {
    id: 'qz-akt-2',
    course: 'Pengantar Akuntansi',
    question: 'Saldo akun Perlengkapan sebelum disesuaikan adalah Rp 5.000.000. Berdasarkan pemeriksaan fisik akhir periode, perlengkapan yang masih tersisa adalah Rp 1.500.000. Berapa nilai yang dicatat pada Jurnal Penyesuaian?',
    options: [
      'Rp 1.500.000 (sebesar sisa)',
      'Rp 5.000.000 (sebesar saldo awal)',
      'Rp 3.500.000 (sebesar yang terpakai)',
      'Rp 6.500.000 (sebesar akumulasi)'
    ],
    answer: 2, // C
    explanation: 'Penyesuaian mencatat bagian perlengkapan yang telah habis dipakai menjadi beban: Rp 5.000.000 - Rp 1.500.000 = Rp 3.500.000.'
  },

  // Pengantar Bisnis dan Inovasi
  {
    id: 'qz-bis-1',
    course: 'Pengantar Bisnis dan Inovasi',
    question: 'Inovasi yang menciptakan segmen pasar baru dan secara bertahap menggantikan perusahaan raksasa yang lambat beradaptasi disebut...',
    options: ['Inovasi Inkremental', 'Inovasi Disruptif', 'Inovasi Modular', 'Inovasi Estetika'],
    answer: 1, // B (Inovasi Disruptif)
    explanation: 'Inovasi disruptif menawarkan kemudahan akses, harga bersaing, atau teknologi baru yang mendisrupsi tatanan pasar konvensional.'
  },
  {
    id: 'qz-bis-2',
    course: 'Pengantar Bisnis dan Inovasi',
    question: 'Di dalam Business Model Canvas (BMC), jalur perantara yang digunakan untuk menyampaikan proposisi nilai kepada segmen pelanggan disebut...',
    options: ['Customer Relationships', 'Key Activities', 'Channels', 'Revenue Streams'],
    answer: 2, // C (Channels)
    explanation: 'Channels (Saluran) mencakup sarana promosi, distribusi, dan penjualan untuk menjangkau target pelanggan.'
  },

  // Prinsip - Prinsip Manajemen
  {
    id: 'qz-man-1',
    course: 'Prinsip - Prinsip Manajemen',
    question: 'Dalam konsep SMART Goals, huruf "M" mewakili kriteria sasaran yang harus bersifat...',
    options: ['Meaningful', 'Measurable (Dapat Diukur)', 'Manageable', 'Motivational'],
    answer: 1, // B
    explanation: 'Measurable berarti sasaran harus memiliki indikator atau metrik kuantitatif yang jelas agar pencapaiannya dapat dievaluasi secara obyektif.'
  },
  {
    id: 'qz-man-2',
    course: 'Prinsip - Prinsip Manajemen',
    question: 'Menurut hierarki kebutuhan Abraham Maslow, kebutuhan manusia yang menempati puncak tertinggi adalah...',
    options: ['Kebutuhan Fisiologis', 'Kebutuhan Rasa Aman', 'Kebutuhan Sosial', 'Aktualisasi Diri (Self-Actualization)'],
    answer: 3, // D
    explanation: 'Aktualisasi Diri merupakan puncak kebutuhan manusia untuk merealisasikan potensi, kreativitas, dan bakat terbaiknya.'
  },

  // Pendidikan Pancasila
  {
    id: 'qz-pan-1',
    course: 'Pendidikan Pancasila',
    question: 'Siapakah tokoh yang pertama kali memperkenalkan istilah "Pancasila" dalam pidato sidang BPUPKI tanggal 1 Juni 1945?',
    options: ['Drs. Mohammad Hatta', 'Mr. Mohammad Yamin', 'Ir. Soekarno', 'Prof. Dr. Soepomo'],
    answer: 2, // C (Ir. Soekarno)
    explanation: 'Ir. Soekarno mengusulkan 5 prinsip dasar negara dan menyebutnya dengan nama "Pancasila" pada tanggal 1 Juni 1945.'
  },
  {
    id: 'qz-pan-2',
    course: 'Pendidikan Pancasila',
    question: 'Tindakan seorang mahasiswa yang bergotong-royong membantu korban bencana tanpa membeda-bedakan suku dan agama merupakan wujud pengamalan nilai...',
    options: ['Nilai Instrumental', 'Nilai Teoretis', 'Nilai Praksis', 'Nilai Yuridis'],
    answer: 2, // C
    explanation: 'Nilai Praksis adalah realisasi konkret dari nilai-nilai Pancasila dalam tindakan dan perilaku nyata kehidupan bermasyarakat sehari-hari.'
  }
];

// 4. JADWAL RESMI PELAKSANAAN UTS KELAS
export const initialUtsExamSchedule = [
  {
    id: 'ex-1',
    course: 'Pengantar Logistik',
    date: '2026-11-02',
    dayName: 'Senin',
    time: '08:00 - 09:40 WIB',
    room: 'Ruang Teori 201',
    type: 'Ujian Tertulis & Studi Kasus',
    nature: 'Closed Book',
    lecturer: 'Dosen Pengampu',
    sks: 3,
    topics: 'Konsep Logistik, 7R Prinsip, Warehousing, Bullwhip Effect (Pertemuan 1 - 7)'
  },
  {
    id: 'ex-2',
    course: 'Ekonomi Mikro',
    date: '2026-11-03',
    dayName: 'Selasa',
    time: '10:00 - 11:40 WIB',
    room: 'Ruang Teori 203',
    type: 'Ujian Hitungan & Grafik',
    nature: 'Open Sheet (1 Lembar Rumus)',
    lecturer: 'Dosen Pengampu',
    sks: 3,
    topics: 'Permintaan, Penawaran, Titik Equilibrium, Elastisitas, Kurva Biaya MC/AC'
  },
  {
    id: 'ex-3',
    course: 'Matematika Ekonomi',
    date: '2026-11-04',
    dayName: 'Rabu',
    time: '08:00 - 09:40 WIB',
    room: 'Ruang Teori 204',
    type: 'Ujian Hitungan',
    nature: 'Closed Book + Kalkulator',
    lecturer: 'Dosen Pengampu',
    sks: 3,
    topics: 'Fungsi Linier, Pajak & Subsidi Pasar, Titik Impas (BEP) dan Biaya'
  },
  {
    id: 'ex-4',
    course: 'Pengantar Akuntansi',
    date: '2026-11-05',
    dayName: 'Kamis',
    time: '10:00 - 12:00 WIB',
    room: 'Lab Komputer / Teori',
    type: 'Praktek Siklus Akuntansi',
    nature: 'Closed Book',
    lecturer: 'Dosen Pengampu',
    sks: 3,
    topics: 'Jurnal Umum, Buku Besar, Neraca Saldo, Jurnal Penyesuaian Akrual/Penyusutan'
  },
  {
    id: 'ex-5',
    course: 'Pengantar Transportasi',
    date: '2026-11-06',
    dayName: 'Jumat',
    time: '08:00 - 09:40 WIB',
    room: 'Ruang Teori 202',
    type: 'Ujian Teori',
    nature: 'Closed Book',
    lecturer: 'Dosen Pengampu',
    sks: 2,
    topics: 'Karakteristik Moda Transportasi, Biaya Fixed/Variable, Intermodalitas'
  },
  {
    id: 'ex-6',
    course: 'Pengantar Bisnis dan Inovasi',
    date: '2026-11-09',
    dayName: 'Senin',
    time: '10:00 - 11:40 WIB',
    room: 'Ruang Teori 205',
    type: 'Analisis BMC & Presentasi',
    nature: 'Open Book',
    lecturer: 'Dosen Pengampu',
    sks: 3,
    topics: 'Bentuk Badan Usaha, SWOT, PESTEL, 9 Blok Business Model Canvas'
  },
  {
    id: 'ex-7',
    course: 'Prinsip - Prinsip Manajemen',
    date: '2026-11-10',
    dayName: 'Selasa',
    time: '08:00 - 09:40 WIB',
    room: 'Ruang Teori 201',
    type: 'Ujian Studi Kasus',
    nature: 'Closed Book',
    lecturer: 'Dosen Pengampu',
    sks: 3,
    topics: 'Fungsi POAC, Sasaran SMART, Struktur Organisasi, Teori Motivasi'
  },
  {
    id: 'ex-8',
    course: 'Pendidikan Pancasila',
    date: '2026-11-11',
    dayName: 'Rabu',
    time: '10:00 - 11:40 WIB',
    room: 'Ruang Teori 204',
    type: 'Ujian Esai',
    nature: 'Closed Book',
    lecturer: 'Dosen Pengampu',
    sks: 2,
    topics: 'Sejarah Perumusan BPUPKI-PPKI, Nilai Sila 1-5, Sistem Etika Pancasila'
  }
];
