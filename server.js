const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const { parse } = require('csv-parse/sync');

// ─── Google Sheets Konfigürasyonu ───
const SHEET_ID = "1yDUS6YrkU2wbXse0iPuHdfj06zgOiEtZGCqS9BqR9uQ";
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzIEaVME7fq3K-ixNj8MV8IhvzLru_BkpqQbI6cGFJt4404aBcNnBO6JQbDWCoGb5iJ/exec";
const CSV_EXPORT_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;

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
    db.run(`DROP TABLE IF EXISTS reports`); // Eski tabloyu sil (yeni şema için)
    db.run(`CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        country TEXT,
        region TEXT,
        report_date TEXT,
        permit_name TEXT,
        is_avail TEXT,
        cost TEXT,
        currency TEXT,
        validity TEXT,
        process_time TEXT,
        note TEXT,
        residence_info TEXT,
        challenges TEXT,
        recent_changes TEXT,
        tips TEXT,
        urgent TEXT,
        created_at TEXT,
        is_synced INTEGER DEFAULT 0
    )`);
});

// ─── API: Yeni Kayıt Ekleme ───
app.post('/api/reports', (req, res) => {
    const { rows } = req.body;
    if (!rows || rows.length === 0) {
        return res.status(400).json({ error: 'Gönderilecek veri bulunamadı.' });
    }

    const stmt = db.prepare(`INSERT INTO reports (
        country, region, report_date, permit_name, is_avail, cost, currency,
        validity, process_time, note, residence_info, challenges, recent_changes, tips, urgent, created_at, is_synced
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 0)`);

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
            const formattedRows = rows.map(r => [
                r[0],  // country
                r[1],  // region
                r[2],  // report_date
                r[3],  // permit_name
                r[4],  // is_avail
                r[5],  // cost
                r[6],  // currency
                r[7],  // validity
                r[8],  // process_time
                r[9],  // note
                r[10], // residence_info
                r[11], // challenges
                r[12], // recent_changes
                r[13], // tips
                r[14], // urgent
                r[15]  // created_at
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
            r.country, r.region, r.report_date, r.permit_name, r.is_avail,
            r.cost, r.currency, r.validity, r.process_time, r.note,
            r.residence_info, r.challenges, r.recent_changes, r.tips, r.urgent, r.created_at
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

// ─── API: Google Sheets'ten Veri Çek (Pull) CSV Üzerinden ───
app.post('/api/pull-from-sheets', async (req, res) => {
    try {
        const response = await fetch(CSV_EXPORT_URL);
        if (!response.ok) throw new Error('CSV fetch failed: ' + response.statusText);
        
        const csvText = await response.text();
        const rows = parse(csvText, { skip_empty_lines: true });

        if (!rows || rows.length < 2) {
            return res.json({ status: 'ok', message: 'E-Tablo boş görünüyor.', count: 0 });
        }

        const header = rows[0];
        const isOldFormat = header.includes('Personel') || header.includes('Ünvan');

        // Önce tabloyu temizle
        db.run(`DELETE FROM reports`, function(err) {
            if (err) return res.status(500).json({ error: 'Tablo temizlenirken hata: ' + err.message });
            db.run(`DELETE FROM sqlite_sequence WHERE name='reports'`, (errSeq) => {});

            const stmt = db.prepare(`INSERT INTO reports (
                country, region, report_date, permit_name, is_avail, cost, currency,
                validity, process_time, note, residence_info, challenges, recent_changes, tips, urgent, created_at, is_synced
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 1)`);

            db.serialize(() => {
                db.run("BEGIN TRANSACTION");
                rows.slice(1).forEach(row => {
                    if (isOldFormat) {
                        // Eski format dizilimi (21 sütun)
                        // [Ülke0, Bölge1, Personel2, Ünvan3, E-posta4, Telefon5, Kurum6, Görev Süresi7, Rapor Tarihi8, Oturum Türü9, Mevcut?10, Maliyet11, Para Birimi12, Geçerlilik13, İşlem Süresi14, Şart/Not15, Zorluklar16, Son Değişiklikler17, Öneriler18, Acil Durum19, Gönderim Zamanı20]
                        if(row.length >= 20) {
                            stmt.run([
                                row[0], row[1], row[8], row[9], row[10], row[11], row[12],
                                row[13], row[14], row[15], "", row[16], row[17], row[18], row[19], row[20]
                            ]);
                        }
                    } else {
                        // Yeni format dizilimi (16 sütun)
                        // [Ülke0, Bölge1, Rapor Tarihi2, Oturum Türü3, Mevcut?4, Tahmini Maliyet5, Para Birimi6, Geçerlilik7, İşlem Süresi8, Şart/Not9, Oturum Detayları10, Zorluklar11, Son Değişiklikler12, Öneriler13, Acil Durum14, Gönderim Zamanı15]
                        if(row.length >= 15) {
                            stmt.run([
                                row[0], row[1], row[2], row[3], row[4], row[5], row[6],
                                row[7], row[8], row[9], row[10] || "", row[11], row[12], row[13], row[14], row[15] || ""
                            ]);
                        }
                    }
                });
                db.run("COMMIT", (err) => {
                    if (err) return res.status(500).json({ status: 'error', message: err.message });
                    res.json({ status: 'ok', message: 'E-tablodan veriler başarıyla çekildi.', count: rows.length - 1 });
                });
            });
            stmt.finalize();
        });

    } catch (e) {
        console.error('Sheets pull error:', e.message);
        res.status(500).json({ error: e.message });
    }
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
