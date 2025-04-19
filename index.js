require("dotenv").config();
const fs = require("fs");
const readline = require("readline");
const { google } = require("googleapis");

// Hak akses yang diperlukan untuk YouTube Data API
const SCOPES = ["https://www.googleapis.com/auth/youtube.force-ssl"];
const TOKEN_PATH = "token.json";
const youtubeChannelID = process.env.YOUTUBE_CHANNEL_ID; // Pastikan channel ID tersedia di file .env

// Inisialisasi OAuth2 client
async function authorize() {
    const credentials = JSON.parse(fs.readFileSync("credentials.json"));
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    // Cek apakah token sudah tersedia dan valid
    if (fs.existsSync(TOKEN_PATH) && fs.readFileSync(TOKEN_PATH).toString().trim() !== "") {
        try {
            oAuth2Client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH)));
            console.log("🔑 Token ditemukan, menggunakan token yang sudah ada.");
            return oAuth2Client;
        } catch (error) {
            console.error("❌ Gagal membaca token lama:", error);
            // Jika token rusak, proses otorisasi baru akan dimulai
        }
    }

    return await getNewToken(oAuth2Client);
}

// Fungsi untuk mendapatkan token baru jika belum ada
function getNewToken(oAuth2Client) {
    return new Promise((resolve, reject) => {
        const authUrl = oAuth2Client.generateAuthUrl({
            access_type: "offline",
            scope: SCOPES,
        });

        console.log("🔗 Buka URL berikut untuk otorisasi aplikasi ini:", authUrl);
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

        rl.question("Masukkan kode yang kamu dapat dari halaman tersebut: ", (code) => {
            rl.close();
            oAuth2Client.getToken(code, (err, token) => {
                if (err) {
                    console.error("❌ Gagal mendapatkan access token:", err);
                    reject(err);
                    return;
                }
                oAuth2Client.setCredentials(token);
                fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
                console.log("✅ Token berhasil disimpan ke:", TOKEN_PATH);
                resolve(oAuth2Client);
            });
        });
    });
}

// Ambil komentar dari suatu video
async function fetchComments(auth, VIDEO_ID) {
    const youtube = google.youtube({ version: "v3", auth });

    try {
        const response = await youtube.commentThreads.list({
            part: "snippet",
            videoId: VIDEO_ID,
            maxResults: 100,
        });

        const spamComments = [];

        response.data.items.forEach((item) => {
            const comment = item.snippet.topLevelComment.snippet;
            const commentText = comment.textDisplay;
            const commentId = item.id;

            console.log(`💬 Memeriksa komentar: "${commentText}"`);

            if (getJudolComment(commentText)) {
                console.log(`🚨 Spam terdeteksi: "${commentText}"`);
                spamComments.push(commentId);
            }
        });

        return spamComments;
    } catch (error) {
        console.error("❌ Gagal mengambil komentar:", error);
        return [];
    }
}

// Deteksi komentar spam berdasarkan kata yang diblokir dan normalisasi unicode
function getJudolComment(text) {
    const normalizedText = text.normalize("NFKD");
    if (text !== normalizedText) {
        return true;
    }

    const blockedWords = JSON.parse(fs.readFileSync("blockedword.json"));
    const lowerText = text.toLowerCase();

    return blockedWords.some(word => lowerText.includes(word.toLowerCase()));
}

// Hapus komentar berdasarkan ID
async function deleteComments(auth, commentIds) {
    const youtube = google.youtube({ version: "v3", auth });

    const totalCommentsToBeDeleted = commentIds.length;
    let totalDeletedComments = 0;

    do {
        const commentIdsChunk = commentIds.splice(0, 50); // API limit: max 50 per request
        if (commentIdsChunk.length === 0) break;

        try {
            await youtube.comments.setModerationStatus({
                id: commentIdsChunk,
                moderationStatus: "rejected",
            });

            totalDeletedComments += commentIdsChunk.length;
            console.log(`🧹 ${totalDeletedComments}/${totalCommentsToBeDeleted} komentar berhasil dihapus.
                Sisa: ${commentIds.length}
                Komentar yang dihapus:`, commentIdsChunk);
        } catch (error) {
            console.error(`❌ Gagal menghapus komentar berikut: ${commentIdsChunk}:`, error.message);
        }
    } while (commentIds.length > 0);
}

// Ambil seluruh video dari channel yang ditentukan
async function youtubeContentList(auth) {
    const youtube = google.youtube({ version: "v3", auth });

    try {
        const response = await youtube.channels.list({
            part: "contentDetails",
            id: youtubeChannelID, // Bisa juga gunakan 'forUsername' jika perlu
        });

        const channel = response.data.items[0];
        const uploadsPlaylistId = channel.contentDetails.relatedPlaylists.uploads;

        const allVideos = [];
        let nextPageToken = "";

        do {
            const playlistResponse = await youtube.playlistItems.list({
                part: "snippet",
                playlistId: uploadsPlaylistId,
                maxResults: 50,
                pageToken: nextPageToken,
            });

            allVideos.push(...playlistResponse.data.items);
            nextPageToken = playlistResponse.data.nextPageToken;
        } while (nextPageToken);

        return allVideos;
    } catch (error) {
        console.error("❌ Gagal mengambil daftar video:", error);
        return [];
    }
}

// Eksekusi utama
(async () => {
    try {
        const auth = await authorize();
        // const contentList = await youtubeContentList(auth);

        const testVideoId = "EPhS9-Ix1OU"; // Ganti dengan video ID milikmu
        console.log(`\n📹 Memeriksa video dengan ID: ${testVideoId}`);
        const spamComments = await fetchComments(auth, testVideoId);

        if (spamComments.length > 0) {
            console.log(`🚫 Ditemukan ${spamComments.length} komentar spam. Memulai penghapusan...`);
            await deleteComments(auth, spamComments);
            console.log("✅ Semua komentar spam berhasil dihapus.");
        } else {
            console.log("✅ Tidak ditemukan komentar spam.");
        }

        // Untuk memproses semua video dalam satu channel, aktifkan kode berikut:
        /*
        for (const video of contentList) {
            const title = video.snippet.title;
            const videoId = video.snippet.resourceId.videoId;
            console.log(`\n📹 Memeriksa video: ${title} (ID: ${videoId})`);
            const spamComments = await fetchComments(auth, videoId);

            if (spamComments.length > 0) {
                console.log(`🚫 Ditemukan ${spamComments.length} komentar spam. Menghapus...`);
                await deleteComments(auth, spamComments);
                console.log("✅ Komentar spam dihapus.");
            } else {
                console.log("✅ Tidak ditemukan komentar spam pada video ini.");
            }
        }
        */

    } catch (error) {
        console.error("❌ Terjadi kesalahan saat menjalankan skrip:", error);
    }
})();