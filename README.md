# KuisKilat — React + Tailwind (Tanpa Build)

Ini adalah website kuis **siap pakai** berbasis **React 18 + Tailwind** memakai CDN (tanpa instal node / tanpa build).
Cocok untuk dibuka langsung via browser.

## Cara menjalankan
- Cara paling aman: jalankan lewat server lokal (supaya `fetch` contoh_soal.csv tidak terblokir oleh browser)
  - VSCode: install **Live Server** → klik kanan `index.html` → "Open with Live Server"
  - atau Python: `python -m http.server` lalu buka `http://localhost:8000`
- Alternatif: kamu tetap bisa **upload CSV** manual tanpa server lokal.

## Struktur
- index.html
- src/app.jsx
- contoh_soal.csv

## Format CSV
Header wajib:
id,kategori,pertanyaan,pilihan_a,pilihan_b,pilihan_c,pilihan_d,jawaban

Kolom `jawaban` hanya boleh: A, B, C, atau D.
Jika ada koma di teks, bungkus dengan tanda kutip ganda.

## Fitur
- Auto acak soal
- Auto acak opsi + kunci ikut menyesuaikan
- Mode: Classic, Team, Waktu Mundur, Survival, Cerdas Cermat
- Review lengkap + lompat nomor soal
