# Youtube Spam Remover

Sebuah program sederhana untuk menghapus komentar spam (promosi "judol", "maxwin", dll) di video YouTube secara otomatis. Program ini menggunakan Google YouTube API untuk mengakses dan memoderasi komentar-komentar spam dari video yang terdaftar.

---

## Fitur

- Mengakses video YouTube menggunakan API YouTube
- Memeriksa komentar di video untuk mendeteksi spam
- Menghapus komentar yang terdeteksi sebagai spam secara otomatis
- Dapat memodifikasi dan menambahkan kata kunci spam di `blockedword.json`

-- 

## Instalasi

1. Clone repository ini ke komputer Anda:

   ```bash
   git clone https://github.com/FKfarell17108/youtube-spam-remover.git
   
2. Install dependencies yang diperlukan:

   ```bash
   npm install

3. Siapkan file .env untuk menyimpan informasi seperti ID Channel YouTube dan file kredensial API YouTube:
   
   - Salin credentials.json dari Google Developer Console.
   - Buat file .env dan atur variabel berikut:

   ```bash
   YOUTUBE_CHANNEL_ID=your_channel_id_here

4. Jalankan aplikasi:

   ```bash
   node index.js

---

## Cara Kerja

1. Aplikasi ini akan mengakses komentar pada video YouTube yang terdaftar.
2. Kemudian, aplikasi memeriksa apakah komentar mengandung kata-kata yang terdaftar di file `blockedword.json`.
3. Komentar yang dianggap spam berdasarkan daftar kata tersebut akan dihapus secara otomatis.

---

## Kontribusi

Jika Anda ingin berkontribusi pada proyek ini, silakan fork repositori ini dan ajukan pull request.

---

## Acknowledgements

Proyek ini didasarkan pada [Judol Slayer Project](https://github.com/MBenedictt/JudolSlayerProject), yang telah menyediakan fondasi untuk pengelolaan komentar spam di YouTube.
