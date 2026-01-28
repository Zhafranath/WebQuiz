const { useEffect, useMemo, useRef, useState } = React;

const ROUTES = {
  HOME: "home",
  MODE: "mode",
  QUIZ: "quiz",
  REVIEW: "review",
};

const DEFAULT_MODE = "classic";

function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

function shuffleArray(arr){
  const a = [...arr];
  for(let i=a.length-1; i>0; i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function safeText(v){
  if(v === null || v === undefined) return "";
  return String(v);
}

function parseCsvFile(file){
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => resolve(res.data),
      error: (err) => reject(err)
    });
  });
}

/**
 * Input row format:
 * id,kategori,pertanyaan,pilihan_a,pilihan_b,pilihan_c,pilihan_d,jawaban
 * jawaban: A/B/C/D
 */
function normalizeQuestions(rows){
  const required = ["id","kategori","pertanyaan","pilihan_a","pilihan_b","pilihan_c","pilihan_d","jawaban"];
  const cleaned = [];

  for (const [idx, r] of rows.entries()){
    const row = {};
    for (const k of required) row[k] = safeText(r[k]).trim();

    // Accept various header cases (fallback)
    if(!row.id && r.ID) row.id = safeText(r.ID).trim();
    if(!row.kategori && (r.Kategori || r.category)) row.kategori = safeText(r.Kategori || r.category).trim();
    if(!row.pertanyaan && (r.Pertanyaan || r.question)) row.pertanyaan = safeText(r.Pertanyaan || r.question).trim();

    // Validate minimal
    if (!row.pertanyaan) continue;
    const ans = row.jawaban.toUpperCase();
    if (!["A","B","C","D"].includes(ans)) continue;

    const options = [
      { key:"A", text: row.pilihan_a },
      { key:"B", text: row.pilihan_b },
      { key:"C", text: row.pilihan_c },
      { key:"D", text: row.pilihan_d },
    ].map(o => ({...o, text: safeText(o.text)}));

    cleaned.push({
      idx,
      id: row.id || String(idx+1),
      kategori: row.kategori || "Umum",
      pertanyaan: row.pertanyaan,
      options,
      answerKey: ans,
    });
  }

  return cleaned;
}

function shuffleOptionsAndFixAnswer(q){
  const original = q.options;
  const correctText = original.find(o => o.key === q.answerKey)?.text ?? "";
  const shuffled = shuffleArray(original.map(o => ({...o})));
  // Remap: new answerKey based on where correctText ended up
  const newAnswerIndex = shuffled.findIndex(o => o.text === correctText);
  const letters = ["A","B","C","D"];
  const remappedAnswerKey = letters[newAnswerIndex] ?? "A";
  // Also rewrite option labels to A-D (presentation)
  const remappedOptions = shuffled.map((o, i) => ({ key: letters[i], text: o.text }));
  return { ...q, options: remappedOptions, answerKey: remappedAnswerKey };
}

function buildQuizBank(rawQuestions){
  // shuffle questions and options
  const qs = shuffleArray(rawQuestions).map(shuffleOptionsAndFixAnswer);
  return qs;
}

function useHashRoute(){
  const [route, setRoute] = useState(() => (location.hash.replace("#","") || ROUTES.HOME));
  useEffect(() => {
    const onHash = () => setRoute(location.hash.replace("#","") || ROUTES.HOME);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return [route, (r) => { location.hash = r; }];
}

function Badge({children}){
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80">
      {children}
    </span>
  );
}

function GradientBg(){
  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-indigo-500/35 blur-3xl" />
      <div className="absolute top-24 -left-40 h-[520px] w-[520px] rounded-full bg-fuchsia-500/25 blur-3xl" />
      <div className="absolute bottom-0 -right-48 h-[520px] w-[520px] rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#070A12] via-[#0B1330] to-[#070A12]" />
    </div>
  );
}

function TopBar({ title, subtitle, right }){
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">{title}</h1>
        {subtitle ? <p className="text-white/70 mt-1">{subtitle}</p> : null}
      </div>
      {right ? <div className="flex items-center gap-2">{right}</div> : null}
    </div>
  );
}

function PrimaryButton({ children, onClick, disabled }){
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        "group relative inline-flex items-center justify-center rounded-2xl px-5 py-3 font-bold",
        "bg-white text-[#0B1330] hover:translate-y-[-1px] active:translate-y-[0px]",
        "transition-transform disabled:opacity-40 disabled:cursor-not-allowed",
        "shadow-[0_18px_60px_rgba(255,255,255,.20)]"
      ].join(" ")}
    >
      <span className="absolute inset-0 rounded-2xl shimmer opacity-0 group-hover:opacity-100 transition-opacity"></span>
      <span className="relative">{children}</span>
    </button>
  );
}

function GhostButton({ children, onClick }){
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center justify-center rounded-2xl px-5 py-3 font-semibold bg-white/5 border border-white/10 hover:bg-white/10 transition"
    >
      {children}
    </button>
  );
}

function CopyBlock({ title, value }){
  const [copied, setCopied] = useState(false);
  return (
    <div className="card glow rounded-3xl p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="font-bold">{title}</div>
        <button
          className="rounded-xl bg-white/10 border border-white/10 px-3 py-2 text-sm hover:bg-white/15 transition"
          onClick={async () => {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          }}
        >
          {copied ? "Tersalin ✓" : "Copy"}
        </button>
      </div>
      <pre className="mt-3 max-h-48 overflow-auto rounded-2xl bg-black/30 border border-white/10 p-4 text-xs text-white/80 whitespace-pre-wrap">{value}</pre>
    </div>
  );
}

function FileDrop({ onFile }){
  const [drag, setDrag] = useState(false);
  const inputRef = useRef(null);

  return (
    <div
      className={[
        "card glow rounded-3xl p-6 cursor-pointer transition",
        drag ? "ring-2 ring-white/40 bg-white/10" : "hover:bg-white/10"
      ].join(" ")}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        const f = e.dataTransfer.files?.[0];
        if(f) onFile(f);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if(f) onFile(f);
          e.target.value = "";
        }}
      />
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center floaty">
          <span className="text-xl">📄</span>
        </div>
        <div>
          <div className="text-lg font-extrabold">Klik / Drag & Drop</div>
          <p className="text-white/70 mt-1">
            Format harus sesuai template: id, kategori, pertanyaan, pilihan_a..d, jawaban (A/B/C/D).
          </p>
        </div>
      </div>
    </div>
  );
}

function Modal({ open, title, children, onClose }){
  if(!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg card glow rounded-3xl p-6 pop">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xl font-extrabold">{title}</div>
          </div>
          <button className="rounded-xl bg-white/10 border border-white/10 px-3 py-2 hover:bg-white/15 transition" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

function HomePage({ go, setBank, setMeta }){
  const [status, setStatus] = useState(null);

  const csvSpec = `id,kategori,pertanyaan,pilihan_a,pilihan_b,pilihan_c,pilihan_d,jawaban
1,Matematika,2+2=?,3,4,5,6,B
2,Sains,"Planet terdekat dari Matahari adalah...,",Bumi,Mars,Merkurius,Jupiter,C`;

  const aiPrompt = JSON.stringify({
    role: "Professional Quiz Creator",
    task: "Generate a quiz in CSV format",
    columns: ["id","kategori","pertanyaan","pilihan_a","pilihan_b","pilihan_c","pilihan_d","jawaban"],
    rules: [
      "'jawaban' column MUST be 'A', 'B', 'C', or 'D'",
      "Use comma (,) as delimiter",
      "Wrap text in double quotes if it contains commas",
      "Language: Indonesian",
      "Topic: [YOUR_TOPIC]",
      "Total Questions: [NUMBER]"
    ],
    output_format: "Raw CSV content starting with the header ONLY"
  }, null, 2);

  const onFile = async (file) => {
    try{
      setStatus({type:"info", msg:"Membaca CSV..."});
      const rows = await parseCsvFile(file);
      const normalized = normalizeQuestions(rows);
      if(normalized.length < 1){
        setStatus({type:"error", msg:"CSV terbaca, tapi tidak ada soal valid. Pastikan kolom & jawaban A/B/C/D benar."});
        return;
      }
      const bank = buildQuizBank(normalized);
      setBank(bank);
      setMeta({ fileName: file.name, total: bank.length });
      setStatus({type:"ok", msg:`Berhasil memuat ${bank.length} soal dari ${file.name}.`});
      setTimeout(() => go(ROUTES.MODE), 500);
    }catch(e){
      console.error(e);
      setStatus({type:"error", msg:"Gagal membaca CSV. Coba pastikan file .csv valid dan delimiter pakai koma (,)."});
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 md:py-14">

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <div className="card glow rounded-3xl p-7 overflow-hidden relative">
            <div className="absolute -top-10 -right-10 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
            <div className="relative">
              <div className="text-3xl md:text-4xl font-extrabold leading-tight">
                Bikin sesi kuis yang seru, cepat, dan penuh animasi ✨
              </div>
              <p className="text-white/70 mt-3 max-w-2xl">
                Siapkan soal dalam CSV sesuai template, upload, lalu pilih mode permainan. Soal & opsi jawaban akan diacak otomatis.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Badge>Classic</Badge>
                <Badge>Team</Badge>
                <Badge>Waktu Mundur</Badge>
                <Badge>Survival</Badge>
                <Badge>Cerdas Cermat</Badge>
              </div>

              <div className="mt-6">
                <FileDrop onFile={onFile} />
                {status ? (
                  <div className={[
                    "mt-4 rounded-2xl border px-4 py-3 text-sm",
                    status.type === "ok" ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-100" :
                    status.type === "error" ? "border-rose-400/40 bg-rose-400/10 text-rose-100 wiggle" :
                    "border-white/15 bg-white/5 text-white/80"
                  ].join(" ")}>
                    {status.msg}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <CopyBlock title="csv_spec.raw (template CSV)" value={csvSpec} />
            <CopyBlock title="AI_prompt.json (untuk generate soal via AI)" value={aiPrompt} />
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="card glow rounded-3xl p-6">
            <div className="font-extrabold text-lg">Demo Cepat</div>
            <p className="text-white/70 mt-2">
              Tidak punya CSV? Pakai file <span className="text-white font-semibold">contoh_soal.csv</span> dari folder ZIP.
            </p>
            <div className="mt-4 grid gap-3">
              <GhostButton onClick={() => {
                fetch("./contoh_soal.csv").then(r => r.text()).then(txt => {
                  const parsed = Papa.parse(txt, { header: true, skipEmptyLines: true });
                  const normalized = normalizeQuestions(parsed.data);
                  const bank = buildQuizBank(normalized);
                  setBank(bank);
                  setMeta({ fileName: "contoh_soal.csv", total: bank.length });
                  go(ROUTES.MODE);
                });
              }}>
                Pakai contoh_soal.csv
              </GhostButton>
              <GhostButton onClick={() => alert("Buka file contoh_soal.csv di folder untuk melihat format lengkap.")}>
                Lihat petunjuk format
              </GhostButton>
            </div>
          </div>

          <div className="card glow rounded-3xl p-6">
            <div className="font-extrabold text-lg">Apa yang terjadi setelah upload?</div>
            <div className="mt-4 space-y-3">
              {[
                ["1", "Validasi kolom & jawaban"],
                ["2", "Soal diacak"],
                ["3", "Opsi jawaban diacak + kunci disesuaikan"],
                ["4", "Pilih mode permainan"],
                ["5", "Main + Review"],
              ].map(([n, t]) => (
                <div key={n} className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center font-extrabold">{n}</div>
                  <div className="text-white/80">{t}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModeCard({ title, desc, icon, active, onClick, tags }){
  return (
    <button onClick={onClick} className={[
      "text-left card glow rounded-3xl p-6 transition w-full",
      "hover:bg-white/10 hover:translate-y-[-2px]",
      active ? "ring-2 ring-white/35 bg-white/10" : ""
    ].join(" ")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-xl floaty">
            {icon}
          </div>
          <div>
            <div className="text-lg font-extrabold">{title}</div>
            <p className="text-white/70 mt-1">{desc}</p>
          </div>
        </div>
        {active ? <Badge>Dipilih</Badge> : null}
      </div>
      {tags?.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {tags.map(t => <Badge key={t}>{t}</Badge>)}
        </div>
      ) : null}
    </button>
  );
}

function ModePage({ go, bank, meta, mode, setMode, config, setConfig }){
  const [openTeam, setOpenTeam] = useState(false);
  const [openCountdown, setOpenCountdown] = useState(false);
  const [openCC, setOpenCC] = useState(false);

  const needsBank = bank && bank.length > 0;

  const pick = (m) => {
    setMode(m);
    if(m === "team") setOpenTeam(true);
    if(m === "countdown") setOpenCountdown(true);
    if(m === "cerdas") setOpenCC(true);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 md:py-14">
      <TopBar
        title="Pilih Mode Kuis"
        subtitle={meta?.fileName ? `Sumber soal: ${meta.fileName} • Total: ${meta.total}` : "Upload soal dulu dari halaman awal."}
        right={
          <div className="flex gap-2">
            <GhostButton onClick={() => go(ROUTES.HOME)}>← Kembali</GhostButton>
            <PrimaryButton disabled={!needsBank} onClick={() => go(ROUTES.QUIZ)}>
              Mulai Kuis →
            </PrimaryButton>
          </div>
        }
      />

      {!needsBank ? (
        <div className="mt-8 card glow rounded-3xl p-6 text-white/80">
          Belum ada soal. Silakan kembali ke beranda untuk upload CSV.
        </div>
      ) : null}

      <div className="mt-8 grid md:grid-cols-2 gap-6">
        <ModeCard
          title="Classic"
          desc="Main seperti kuis biasa. Jawab, cek benar/salah, lanjut."
          icon="🎯"
          active={mode==="classic"}
          onClick={() => pick("classic")}
          tags={["Santai", "Cocok untuk latihan"]}
        />
        <ModeCard
          title="Team"
          desc="Main bergiliran per tim, skor dihitung otomatis."
          icon="👥"
          active={mode==="team"}
          onClick={() => pick("team")}
          tags={["Skor tim", "Bergiliran"]}
        />
        <ModeCard
          title="Waktu Mundur"
          desc="Tiap soal punya timer. Habis waktu dianggap salah."
          icon="⏳"
          active={mode==="countdown"}
          onClick={() => pick("countdown")}
          tags={["Timer", "Lebih menegangkan"]}
        />
        <ModeCard
          title="Survival"
          desc="Salah sekali? Langsung game over (atau sesuai jumlah nyawa)."
          icon="🔥"
          active={mode==="survival"}
          onClick={() => pick("survival")}
          tags={["Tantangan", "Cepat & tegas"]}
        />
        <ModeCard
          title="Cerdas Cermat"
          desc="Minta jumlah tim, 2 babak: Babak 1 tiap tim 10 soal, babak 2 sisa soal."
          icon="🏆"
          active={mode==="cerdas"}
          onClick={() => pick("cerdas")}
          tags={["2 babak", "Format kompetisi"]}
        />
        <div className="card glow rounded-3xl p-6">
          <div className="font-extrabold text-lg">Ringkasan Pengaturan</div>
          <div className="mt-3 text-white/75 space-y-2">
            <div>Mode: <span className="text-white font-semibold">{mode}</span></div>
            {mode==="team" || mode==="cerdas" ? (
              <div>Jumlah tim: <span className="text-white font-semibold">{config.teamCount}</span></div>
            ) : null}
            {mode==="countdown" ? (
              <div>Timer / soal: <span className="text-white font-semibold">{config.secondsPerQuestion} detik</span></div>
            ) : null}
            {mode==="survival" ? (
              <div>Nyawa: <span className="text-white font-semibold">{config.lives}</span></div>
            ) : null}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {mode==="team" ? <GhostButton onClick={() => setOpenTeam(true)}>Atur Team</GhostButton> : null}
            {mode==="countdown" ? <GhostButton onClick={() => setOpenCountdown(true)}>Atur Timer</GhostButton> : null}
            {mode==="survival" ? <GhostButton onClick={() => setConfig(c => ({...c, lives: clamp(c.lives+1,1,10)}))}>Tambah Nyawa</GhostButton> : null}
            {mode==="cerdas" ? <GhostButton onClick={() => setOpenCC(true)}>Atur Cerdas Cermat</GhostButton> : null}
          </div>
        </div>
      </div>

      <Modal open={openTeam} title="Pengaturan Team" onClose={() => setOpenTeam(false)}>
        <label className="text-sm text-white/80">Jumlah tim (2–8)</label>
        <input
          type="number"
          min="2"
          max="8"
          value={config.teamCount}
          onChange={(e) => setConfig(c => ({...c, teamCount: clamp(parseInt(e.target.value||"2",10),2,8)}))}
          className="mt-2 w-full rounded-2xl bg-black/30 border border-white/10 px-4 py-3 outline-none focus:ring-2 focus:ring-white/30"
        />
        <div className="mt-5 flex justify-end gap-2">
          <GhostButton onClick={() => setOpenTeam(false)}>Simpan</GhostButton>
        </div>
      </Modal>

      <Modal open={openCountdown} title="Pengaturan Waktu Mundur" onClose={() => setOpenCountdown(false)}>
        <label className="text-sm text-white/80">Detik per soal (5–120)</label>
        <input
          type="number"
          min="5"
          max="120"
          value={config.secondsPerQuestion}
          onChange={(e) => setConfig(c => ({...c, secondsPerQuestion: clamp(parseInt(e.target.value||"30",10),5,120)}))}
          className="mt-2 w-full rounded-2xl bg-black/30 border border-white/10 px-4 py-3 outline-none focus:ring-2 focus:ring-white/30"
        />
        <div className="mt-5 flex justify-end gap-2">
          <GhostButton onClick={() => setOpenCountdown(false)}>Simpan</GhostButton>
        </div>
      </Modal>

      <Modal open={openCC} title="Pengaturan Cerdas Cermat" onClose={() => setOpenCC(false)}>
        <label className="text-sm text-white/80">Jumlah tim (2–8)</label>
        <input
          type="number"
          min="2"
          max="8"
          value={config.teamCount}
          onChange={(e) => setConfig(c => ({...c, teamCount: clamp(parseInt(e.target.value||"2",10),2,8)}))}
          className="mt-2 w-full rounded-2xl bg-black/30 border border-white/10 px-4 py-3 outline-none focus:ring-2 focus:ring-white/30"
        />
        <p className="text-white/70 text-sm mt-3">
          Babak 1: tiap tim 10 soal (bergiliran). Babak 2: sisa soal.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <GhostButton onClick={() => setOpenCC(false)}>Simpan</GhostButton>
        </div>
      </Modal>
    </div>
  );
}

function ProgressBar({ value }){
  return (
    <div className="h-3 rounded-full bg-white/10 border border-white/10 overflow-hidden">
      <div className="h-full bg-white/70 transition-all" style={{ width: `${clamp(value,0,100)}%` }} />
    </div>
  );
}

function QuizPage({ go, bank, mode, config, session, setSession }){
  const total = bank?.length || 0;
  const [selected, setSelected] = useState(null); // "A"/"B"/"C"/"D"
  const [reveal, setReveal] = useState(false);
  const [shake, setShake] = useState(false);

  const idx = session.currentIndex;
  const q = bank[idx];

  // Countdown timer
  const [timeLeft, setTimeLeft] = useState(config.secondsPerQuestion);
  useEffect(() => {
    if(mode !== "countdown") return;
    setTimeLeft(config.secondsPerQuestion);
  }, [idx, mode, config.secondsPerQuestion]);

  useEffect(() => {
    if(mode !== "countdown") return;
    if(reveal) return;
    const t = setInterval(() => {
      setTimeLeft(s => {
        if(s <= 1){
          clearInterval(t);
          // auto mark wrong
          if(!reveal){
            setReveal(true);
            setSelected(null);
            setSession(sess => {
              const answers = [...sess.answers];
              answers[idx] = { chosen: null, correct: false, answerKey: q.answerKey };
              return { ...sess, answers };
            });
            setShake(true);
            setTimeout(()=>setShake(false), 650);
          }
          return 0;
        }
        return s-1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [idx, mode, reveal]);

  const teamCount = config.teamCount;
  const currentTeam = useMemo(() => {
    if(mode === "team" || mode === "cerdas"){
      return session.turnTeam;
    }
    return null;
  }, [mode, session.turnTeam]);

  const phase = useMemo(() => {
    if(mode !== "cerdas") return null;
    return session.cerdasPhase; // 1 or 2
  }, [mode, session.cerdasPhase]);

  const headerRight = (
    <div className="flex flex-wrap items-center gap-2 justify-end">
      <Badge>Soal {idx+1} / {total}</Badge>
      {(mode==="countdown") ? <Badge>⏳ {timeLeft}s</Badge> : null}
      {(mode==="survival") ? <Badge>❤️ {session.lives}</Badge> : null}
      {(mode==="team" || mode==="cerdas") ? <Badge>Tim {currentTeam+1} dari {teamCount}</Badge> : null}
      {(mode==="cerdas") ? <Badge>Babak {phase}</Badge> : null}
    </div>
  );

  useEffect(() => {
    if(!bank || bank.length === 0) go(ROUTES.HOME);
  }, [bank]);

  if(!q) return null;

  const canAnswer = !reveal;

  const choose = (optKey) => {
    if(!canAnswer) return;
    setSelected(optKey);
    const correct = optKey === q.answerKey;
    setReveal(true);

    setSession(sess => {
      const answers = [...sess.answers];
      answers[idx] = { chosen: optKey, correct, answerKey: q.answerKey };
      let teamScores = sess.teamScores ? [...sess.teamScores] : null;
      let lives = sess.lives;

      if(mode === "team" || mode === "cerdas"){
        if(teamScores){
          if(correct) teamScores[sess.turnTeam] += 1;
        }
      }

      if(mode === "survival"){
        if(!correct) lives = Math.max(0, lives - 1);
      }

      return { ...sess, answers, teamScores, lives };
    });

    if(!correct){
      setShake(true);
      setTimeout(()=>setShake(false), 650);
    }
  };

  const goNext = () => {
    // survival: stop if lives == 0
    if(mode === "survival" && session.lives <= 0){
      go(ROUTES.REVIEW);
      return;
    }

    if(idx >= total - 1){
      go(ROUTES.REVIEW);
      return;
    }

    // Next turn team for team/cerdas
    setSession(sess => {
      let nextTurnTeam = sess.turnTeam;
      let cerdasPhase = sess.cerdasPhase;
      let cerdasCountByTeam = { ...sess.cerdasCountByTeam };

      if(mode === "team"){
        nextTurnTeam = (sess.turnTeam + 1) % config.teamCount;
      }

      if(mode === "cerdas"){
        // Babak 1: tiap tim harus dapat 10 soal (bergiliran)
        if(cerdasPhase === 1){
          const t = sess.turnTeam;
          cerdasCountByTeam[t] = (cerdasCountByTeam[t] || 0) + 1;

          // If all teams reached 10, move to phase 2
          const allReached = Array.from({length: config.teamCount}).every((_, i) => (cerdasCountByTeam[i] || 0) >= 10);
          if(allReached){
            cerdasPhase = 2;
          }
        }
        nextTurnTeam = (sess.turnTeam + 1) % config.teamCount;
      }

      return { ...sess, currentIndex: sess.currentIndex + 1, turnTeam: nextTurnTeam, cerdasPhase, cerdasCountByTeam };
    });

    setSelected(null);
    setReveal(false);
  };

  const optionStyle = (key) => {
    const isCorrect = key === q.answerKey;
    const isChosen = key === selected;
    if(!reveal){
      return "bg-white/5 hover:bg-white/10 border-white/10";
    }
    if(isCorrect){
      return "bg-emerald-400/15 border-emerald-400/45";
    }
    if(isChosen && !isCorrect){
      return "bg-rose-400/15 border-rose-400/45";
    }
    return "bg-white/3 border-white/8 opacity-75";
  };

  const answeredCount = session.answers.filter(Boolean).length;
  const progress = total ? Math.round((answeredCount/total)*100) : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 md:py-14">
      <TopBar
        title="Kuis"
        subtitle={q.kategori ? `Kategori: ${q.kategori}` : null}
        right={
          <div className="flex gap-2">
            <GhostButton onClick={() => go(ROUTES.MODE)}>← Mode</GhostButton>
            <GhostButton onClick={() => go(ROUTES.REVIEW)}>Review</GhostButton>
          </div>
        }
      />

      <div className="mt-6">{headerRight}</div>
      <div className="mt-3"><ProgressBar value={progress} /></div>

      <div className={["mt-7 card glow rounded-3xl p-7", shake ? "wiggle" : ""].join(" ")}>
        <div className="text-white/60 text-sm font-semibold">Pertanyaan</div>
        <div className="mt-2 text-xl md:text-2xl font-extrabold leading-snug">
          {q.pertanyaan}
        </div>

        <div className="mt-6 grid gap-3">
          {q.options.map((o) => (
            <button
              key={o.key}
              onClick={() => choose(o.key)}
              className={[
                "text-left rounded-2xl border px-5 py-4 transition pop",
                optionStyle(o.key),
              ].join(" ")}
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-black/30 border border-white/10 flex items-center justify-center font-extrabold">
                  {o.key}
                </div>
                <div className="font-semibold text-white/90">{o.text}</div>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-7 flex items-center justify-between gap-3">
          <div className="text-white/70 text-sm">
            {reveal ? (selected === q.answerKey ? "✅ Jawaban kamu benar!" : `❌ Salah. Kunci: ${q.answerKey}`) : "Pilih salah satu jawaban."}
          </div>
          <PrimaryButton onClick={goNext} disabled={!reveal}>
            Next →
          </PrimaryButton>
        </div>
      </div>

      {(mode==="team" || mode==="cerdas") && session.teamScores ? (
        <div className="mt-6 card glow rounded-3xl p-6">
          <div className="font-extrabold text-lg">Skor Tim</div>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            {session.teamScores.map((s, i) => (
              <div key={i} className={[
                "rounded-2xl border p-4",
                i===currentTeam ? "border-white/30 bg-white/10" : "border-white/10 bg-white/5"
              ].join(" ")}>
                <div className="text-white/60 text-sm">Tim {i+1}</div>
                <div className="text-2xl font-extrabold mt-1">{s}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ReviewPage({ go, bank, mode, config, session, resetAll }){
  const answers = session.answers;
  const total = bank.length;
  const correctCount = answers.filter(a => a?.correct).length;
  const wrongCount = total - correctCount;

  const jumpRefs = useRef([]);

  useEffect(() => {
    jumpRefs.current = jumpRefs.current.slice(0, total);
  }, [total]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 md:py-14">
      <TopBar
        title="Review"
        subtitle={`Benar: ${correctCount} • Salah: ${wrongCount} • Total: ${total}`}
        right={
          <div className="flex gap-2">
            <GhostButton onClick={() => go(ROUTES.QUIZ)}>← Kuis</GhostButton>
            <GhostButton onClick={() => go(ROUTES.MODE)}>Mode</GhostButton>
            <PrimaryButton onClick={resetAll}>Main Lagi</PrimaryButton>
          </div>
        }
      />

      <div className="mt-7 card glow rounded-3xl p-6">
        <div className="font-extrabold text-lg">Lompat ke nomor soal</div>
        <div className="mt-4 flex flex-wrap gap-2">
          {Array.from({length: total}).map((_, i) => {
            const ok = answers[i]?.correct;
            return (
              <button
                key={i}
                onClick={() => jumpRefs.current[i]?.scrollIntoView({ behavior:"smooth", block:"start" })}
                className={[
                  "h-10 w-10 rounded-2xl border font-extrabold transition",
                  ok ? "border-emerald-400/40 bg-emerald-400/10 hover:bg-emerald-400/15" :
                       "border-rose-400/40 bg-rose-400/10 hover:bg-rose-400/15"
                ].join(" ")}
                title={ok ? "Benar" : "Salah"}
              >
                {i+1}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-7 space-y-5">
        {bank.map((q, i) => {
          const a = answers[i];
          const chosen = a?.chosen;
          const ok = a?.correct;
          const key = q.answerKey;

          return (
            <div key={q.id+"-"+i} ref={el => jumpRefs.current[i] = el} className="card glow rounded-3xl p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Badge>No. {i+1}</Badge>
                  <Badge>{q.kategori}</Badge>
                </div>
                <Badge>{ok ? "✅ Benar" : "❌ Salah"}</Badge>
              </div>

              <div className="mt-4 text-xl font-extrabold">{q.pertanyaan}</div>

              <div className="mt-5 grid gap-2">
                {q.options.map((o) => {
                  const isKey = o.key === key;
                  const isChosen = o.key === chosen;
                  const cls = isKey
                    ? "border-emerald-400/45 bg-emerald-400/12"
                    : (isChosen && !isKey)
                      ? "border-rose-400/45 bg-rose-400/12"
                      : "border-white/10 bg-white/5";
                  return (
                    <div key={o.key} className={`rounded-2xl border px-4 py-3 ${cls}`}>
                      <span className="font-extrabold">{o.key}.</span>{" "}
                      <span className="text-white/90 font-semibold">{o.text}</span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 text-sm text-white/75">
                Jawaban kamu: <span className="text-white font-extrabold">{chosen ?? "— (waktu habis/tidak menjawab)"}</span>{" "}
                • Kunci: <span className="text-white font-extrabold">{key}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function App(){
  const [route, go] = useHashRoute();

  const [bank, setBank] = useState([]);
  const [meta, setMeta] = useState(null);

  const [mode, setMode] = useState(DEFAULT_MODE);
  const [config, setConfig] = useState({
    teamCount: 2,
    secondsPerQuestion: 30,
    lives: 1,
  });

  const freshSession = (m=mode) => {
    return {
      currentIndex: 0,
      answers: Array.from({length: bank.length}).map(() => null),
      // team/cerdas
      teamScores: (m==="team" || m==="cerdas") ? Array.from({length: config.teamCount}).map(() => 0) : null,
      turnTeam: 0,
      // survival
      lives: (m==="survival") ? config.lives : null,
      // cerdas cermat
      cerdasPhase: (m==="cerdas") ? 1 : null,
      cerdasCountByTeam: (m==="cerdas") ? Object.fromEntries(Array.from({length: config.teamCount}).map((_,i)=>[i,0])) : null,
    };
  };

  const [session, setSession] = useState(() => freshSession(DEFAULT_MODE));

  // Ketika masuk halaman kuis, pastikan session selalu sinkron dengan mode & config terbaru.
// Ini penting karena setState React bersifat async: user bisa klik "Mulai Kuis" tepat setelah memilih mode,
// sehingga route sudah pindah ke #quiz sementara session masih versi mode sebelumnya (bisa bikin halaman blank).
useEffect(() => {
  if(route === ROUTES.QUIZ){
    setSession(freshSession(mode));
  }
  if(route === ROUTES.REVIEW){
    // ensure answers array length
    setSession(sess => {
      if(sess.answers?.length === bank.length) return sess;
      return { ...sess, answers: Array.from({length: bank.length}).map(()=>null) };
    });
  }
}, [route, mode, config.teamCount, config.secondsPerQuestion, config.lives, bank.length]);

  const resetAll = () => {
    setSession(freshSession(mode));
    go(ROUTES.HOME);
  };

  useEffect(() => {
    // guard routes
    if((route === ROUTES.MODE || route === ROUTES.QUIZ || route === ROUTES.REVIEW) && (!bank || bank.length === 0)){
      // allow home
      go(ROUTES.HOME);
    }
  }, [route, bank]);

  return (
    <div className="min-h-screen">
      <GradientBg />
      <div className="px-4 py-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center font-extrabold">
              ⚡
            </div>
            <div>
              <div className="font-extrabold tracking-tight">MyQuiz</div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <Badge>Route: #{route}</Badge>
            {meta?.total ? <Badge>{meta.total} soal</Badge> : <Badge>Belum upload</Badge>}
          </div>
        </div>
      </div>

      {route === ROUTES.HOME ? (
        <HomePage go={go} setBank={setBank} setMeta={setMeta} />
      ) : null}

      {route === ROUTES.MODE ? (
        <ModePage
          go={go}
          bank={bank}
          meta={meta}
          mode={mode}
          setMode={setMode}
          config={config}
          setConfig={setConfig}
        />
      ) : null}

      {route === ROUTES.QUIZ ? (
        <QuizPage
          go={go}
          bank={bank}
          mode={mode}
          config={config}
          session={session}
          setSession={setSession}
        />
      ) : null}

      {route === ROUTES.REVIEW ? (
        <ReviewPage
          go={go}
          bank={bank}
          mode={mode}
          config={config}
          session={session}
          resetAll={resetAll}
        />
      ) : null}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
