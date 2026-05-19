const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

// ─── Google Sheets Konfigürasyonu ───
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzIEaVME7fq3K-ixNj8MV8IhvzLru_BkpqQbI6cGFJt4404aBcNnBO6JQbDWCoGb5iJ/exec";
const SHEET_ID = "1yDUS6YrkU2wbXse0iPuHdfj06zgOiEtZGCqS9BqR9uQ";

/**
 * Verilen satır dizisini Google Sheets'e anlık olarak gönderir.
 * Başarılıysa true, hata olursa false döndürür.
 */
async function syncToSheets(formattedRows) {
    try {
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ rows: formattedRows, sheetId: SHEET_ID })
        });
        if (!response.ok) {
            console.error('⚠️  Sheets yanıt hatası:', response.status);
            return false;
        }
        console.log(`✅ ${formattedRows.length} satır Google Sheets'e aktarıldı.`);
        return true;
    } catch (e) {
        console.error('⚠️  Sheets bağlantı hatası:', e.message);
        return false;
    }
}

const app = express();
const PORT = 3000;

// Ayarlar
app.use(cors());
app.use(express.json()); // Artık text/plain yerine JSON okuyacağız

// Ön yüz dosyalarını (HTML, CSS, JS) public klasöründen sun
app.use(express.static(path.join(__dirname, 'public')));

// SQLite Veritabanı Bağlantısı
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) {
        console.error('Veritabanına bağlanılamadı:', err.message);
    } else {
        console.log('✅ SQLite veritabanı bağlandı.');
    }
});

// Tabloları Oluştur
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        country TEXT,
        region TEXT,
        person_name TEXT,
        person_title TEXT,
        person_email TEXT,
        person_phone TEXT,
        person_org TEXT,
        person_duration TEXT,
        report_date TEXT,
        permit_name TEXT,
        is_avail TEXT,
        cost TEXT,
        currency TEXT,
        validity TEXT,
        process_time TEXT,
        note TEXT,
        challenges TEXT,
        recent_changes TEXT,
        tips TEXT,
        urgent TEXT,
        created_at TEXT,
        is_synced INTEGER DEFAULT 0
    )`);

    // Eğer tablo zaten varsa is_synced sütununu eklemeye çalış (hata verirse yoksay)
    db.run("ALTER TABLE reports ADD COLUMN is_synced INTEGER DEFAULT 0", (err) => {});
});

// ─── API: Yeni Kayıt Ekleme ───
app.post('/api/reports', (req, res) => {
    const { rows } = req.body;
    if (!rows || rows.length === 0) {
        return res.status(400).json({ error: 'Gönderilecek veri bulunamadı.' });
    }

    const stmt = db.prepare(`INSERT INTO reports (
        country, region, person_name, person_title, person_email, person_phone,
        person_org, person_duration, report_date, permit_name, is_avail, cost,
        currency, validity, process_time, note, challenges, recent_changes, tips, urgent, created_at, is_synced
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 0)`);

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        rows.forEach(row => {
            stmt.run(row, (err) => {
                if (err) console.error('Kayıt eklenirken hata:', err.message);
            });
        });
        db.run("COMMIT", async (err) => {
            if (err) {
                return res.status(500).json({ status: 'error', message: err.message });
            }

            // Önce istemciye başarılı yanıtı gönder
            res.json({ status: 'ok', count: rows.length });

            // ── Anlık Google Sheets Senkronizasyonu ──
            // Gönderilen rows dizisi [country, region, ...] formatında değil;
            // ham değerler olduğu için doğrudan kullanıyoruz.
            const formattedRows = rows.map(r => [
                r[0],  // country
                r[1],  // region
                r[2],  // person_name
                r[3],  // person_title
                r[4],  // person_email
                r[5],  // person_phone
                r[6],  // person_org
                r[7],  // person_duration
                r[8],  // report_date
                r[9],  // permit_name
                r[10], // is_avail
                r[11], // cost
                r[12], // currency
                r[13], // validity
                r[14], // process_time
                r[15], // note
                r[16], // challenges
                r[17], // recent_changes
                r[18], // tips
                r[19], // urgent
                r[20]  // created_at
            ]);

            const synced = await syncToSheets(formattedRows);

            if (synced) {
                // Yeni eklenen kayıtları is_synced = 1 olarak işaretle
                db.all(
                    `SELECT id FROM reports ORDER BY id DESC LIMIT ?`,
                    [rows.length],
                    (selErr, lastRows) => {
                        if (selErr || !lastRows.length) return;
                        const ids = lastRows.map(r => r.id).join(',');
                        db.run(`UPDATE reports SET is_synced = 1 WHERE id IN (${ids})`);
                        console.log(`🔄 ${rows.length} kayıt is_synced=1 olarak güncellendi.`);
                    }
                );
            } else {
                console.warn('⚠️  Sheets senkronizasyonu başarısız, is_synced=0 olarak bırakıldı.');
            }
        });
    });
    stmt.finalize();
});

// ─── API: Manuel Google Sheets Senkronizasyonu (Yedek / Toplu) ───
// Anlık sync başarısız olmuş (is_synced=0) kayıtları toplu gönderir.
app.post('/api/sync', (req, res) => {
    db.all(`SELECT * FROM reports WHERE is_synced = 0`, [], async (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        if (rows.length === 0) return res.json({ message: 'Senkronize edilecek bekleyen kayıt yok.', count: 0 });

        const formattedRows = rows.map(r => [
            r.country, r.region, r.person_name, r.person_title, r.person_email,
            r.person_phone, r.person_org, r.person_duration, r.report_date,
            r.permit_name, r.is_avail, r.cost, r.currency, r.validity,
            r.process_time, r.note, r.challenges, r.recent_changes, r.tips,
            r.urgent, r.created_at
        ]);

        const synced = await syncToSheets(formattedRows);

        if (!synced) {
            return res.status(500).json({ error: 'Google Sheets ile iletişim kurulamadı.' });
        }

        const ids = rows.map(r => r.id);
        db.run(`UPDATE reports SET is_synced = 1 WHERE id IN (${ids.join(',')})`, (updateErr) => {
            if (updateErr) console.error(updateErr);
            res.json({ message: `${rows.length} bekleyen kayıt başarıyla aktarıldı!`, count: rows.length });
        });
    });
});

// ─── API: Tüm Kayıtları Okuma (Dashboard İçin) ───
app.get('/api/reports', (req, res) => {
    db.all(`SELECT * FROM reports ORDER BY id DESC`, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// ─── API: Tüm Kayıtları Silme ───
app.delete('/api/reports/all', (req, res) => {
    db.run(`DELETE FROM reports`, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        // Veritabanını sıfırladığımız için SQLite AUTOINCREMENT sayacını da sıfırlıyoruz:
        db.run(`DELETE FROM sqlite_sequence WHERE name='reports'`, (errSeq) => {});
        res.json({ status: 'ok', message: 'Tüm kayıtlar silindi' });
    });
});

// ─── API: Kayıt Silme ───
app.delete('/api/reports/:id', (req, res) => {
    const id = req.params.id;
    db.run(`DELETE FROM reports WHERE id = ?`, id, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ status: 'ok', message: 'Kayıt silindi' });
    });
});

// Sunucuyu Başlat
app.listen(PORT, () => {
    console.log(`=============================================`);
    console.log(`🚀 Sunucu çalışıyor!`);
    console.log(`👉 Form için: http://localhost:${PORT}/`);
    console.log(`👉 Yönetici Paneli için: http://localhost:${PORT}/raporlar.html`);
    console.log(`=============================================`);
});
