let allReports = [];

document.addEventListener('DOMContentLoaded', fetchReports);

async function fetchReports() {
    try {
        const response = await fetch('/api/reports');
        if (!response.ok) throw new Error('Veriler çekilemedi.');
        
        allReports = await response.json();
        renderTable();
        updateStats();
    } catch (error) {
        document.getElementById('reportsBody').innerHTML = `<tr><td colspan="11" style="text-align:center; color:red;">Hata: ${error.message}</td></tr>`;
    }
}

function renderTable() {
    const tbody = document.getElementById('reportsBody');
    if (allReports.length === 0) {
        tbody.innerHTML = `<tr><td colspan="12" style="text-align:center; padding:30px;">Henüz hiç kayıt yok.</td></tr>`;
        return;
    }

    tbody.innerHTML = allReports.map(r => `
        <tr>
            <td style="color:var(--ink4)">#${r.id}</td>
            <td style="font-size:12px">${r.created_at}</td>
            <td style="font-weight:600">${r.country}</td>
            <td style="font-size:12px;color:var(--ink3)">${r.region}</td>
            <td style="font-size:12px">${r.report_date || '—'}</td>
            <td style="font-weight:500;color:var(--navy)">${r.permit_name}</td>
            <td><span class="badge ${r.is_avail === 'Evet' ? 'yes' : 'no'}">${r.is_avail}</span></td>
            <td>${r.cost ? r.cost + ' ' + r.currency : '—'}</td>
            <td>${r.validity !== '—' ? r.validity : '—'}</td>
            <td style="font-size:12px;color:var(--ink3);white-space:normal;min-width:200px;">${r.note || '—'}</td>
            <td style="text-align:center;">
                <button onclick="deleteReport(${r.id})" style="background:none;border:none;cursor:pointer;color:var(--red);font-size:16px;padding:5px;transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'" title="Kaydı Sil">🗑️</button>
            </td>
        </tr>
    `).join('');
}

async function deleteReport(id) {
    if (!confirm(`ID: #${id} numaralı kaydı silmek istediğinize emin misiniz?\nBu işlem geri alınamaz!`)) {
        return;
    }

    try {
        const response = await fetch(`/api/reports/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Silme işlemi başarısız oldu.');
        
        // Tabloyu ve Ülke Görünümünü Yenile
        fetchReports();
    } catch (error) {
        alert('Hata: ' + error.message);
    }
}

async function deleteAllReports() {
    if (!confirm("Tüm veritabanını silmek istediğinize EMIN MİSİNİZ?\n\nUyarı: Bu işlem ASLA geri alınamaz ve tüm kayıtlarınız kalıcı olarak silinir!")) return;

    const code = prompt("Silmek için doğrulama kodunu giriniz:");
    
    // Kullanıcı iptal (cancel) tuşuna basarsa code null döner
    if (code === null) return; 

    if (code !== "riksil") {
        alert("Hatalı kod girdiniz. Silme işlemi iptal edildi.");
        return;
    }

    try {
        const response = await fetch('/api/reports/all', { method: 'DELETE' });
        if (!response.ok) throw new Error('Silme işlemi başarısız oldu.');
        
        alert("Tüm veriler başarıyla silindi.");
        fetchReports();
    } catch (error) {
        alert('Hata: ' + error.message);
    }
}

function updateStats() {
    document.getElementById('statTotal').textContent = allReports.length;
    
    const uniqueCountries = new Set(allReports.map(r => r.country)).size;
    document.getElementById('statCountries').textContent = uniqueCountries;
    
    const availCount = allReports.filter(r => r.is_avail === 'Evet').length;
    document.getElementById('statAvail').textContent = availCount;
    
    if (allReports.length > 0) {
        document.getElementById('statLast').textContent = allReports[0].created_at;
    } else {
        document.getElementById('statLast').textContent = 'Kayıt yok';
    }
}

function exportToCSV() {
    if (allReports.length === 0) return alert("Dışa aktarılacak veri yok!");

    const headers = ["ID", "Ülke", "Bölge", "Rapor Tarihi", "Oturum Türü", "Mevcut?", "Tahmini Maliyet", "Para Birimi", "Geçerlilik", "İşlem Süresi", "Şart/Not", "Oturum Detayları", "Zorluklar", "Son Değişiklikler", "Öneriler", "Acil Durum", "Gönderim Zamanı"];
    
    const rows = allReports.map(r => [
        r.id, r.country, r.region, r.report_date, r.permit_name, r.is_avail, r.cost, r.currency, r.validity, r.process_time, r.note, r.residence_info, r.challenges, r.recent_changes, r.tips, r.urgent, r.created_at
    ]);

    const csvRows = [headers, ...rows].map(row =>
        row.map(cell => '"' + String(cell || '').replace(/"/g, '""') + '"').join(',')
    );

    const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Tum_Raporlar_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

async function syncToSheets() {
    const btn = document.getElementById('syncBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳ Aktarılıyor...';
    btn.disabled = true;

    try {
        const response = await fetch('/api/sync', { method: 'POST' });
        const result = await response.json();
        
        if (!response.ok) throw new Error(result.error || 'Bilinmeyen Hata');
        
        if (result.count > 0) {
            alert(result.message + ` (${result.count} yeni kayıt eklendi). Tamam'a bastığınızda Google Sheets sayfanız açılacak.`);
            window.open("https://docs.google.com/spreadsheets/d/1yDUS6YrkU2wbXse0iPuHdfj06zgOiEtZGCqS9BqR9uQ/edit", "_blank");
        } else {
            alert("Senkronize edilecek yeni kayıt bulunamadı. Tüm verileriniz zaten Google Sheets'te güncel.");
        }
        
        fetchReports(); // Tabloyu yenile
    } catch (error) {
        alert('Aktarım başarısız: ' + error.message);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function pullFromSheets() {
    if (!confirm("E-Tablodaki tüm veriler çekilip mevcut veritabanınız (SQLite) tamamen silinecek ve üzerine yazılacaktır.\n\nEmin misiniz?")) return;

    const btn = document.getElementById('pullBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳ Çekiliyor...';
    btn.disabled = true;

    try {
        const response = await fetch('/api/pull-from-sheets', { method: 'POST' });
        const result = await response.json();
        
        if (!response.ok) throw new Error(result.error || 'Bilinmeyen Hata');
        
        alert(result.message + ` (${result.count} kayıt eklendi).`);
        
        fetchReports(); // Tabloyu yenile
    } catch (error) {
        alert('E-Tablodan veri çekme başarısız: ' + error.message);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// ─── GÖRÜNÜM VE İÇ PANEL (ÜLKELER) İŞLEMLERİ ───

function switchView(view) {
    const btnTable = document.getElementById('btnTableView');
    const btnCountry = document.getElementById('btnCountryView');
    const viewTable = document.getElementById('tableView');
    const viewCountry = document.getElementById('countryView');

    if (view === 'table') {
        btnTable.className = 'btn btn-navy';
        btnCountry.className = 'btn btn-ghost';
        viewTable.classList.remove('hidden');
        viewCountry.classList.add('hidden');
    } else {
        btnTable.className = 'btn btn-ghost';
        btnCountry.className = 'btn btn-navy';
        viewTable.classList.add('hidden');
        viewCountry.classList.remove('hidden');
        renderCountryCards();
    }
}

function renderCountryCards() {
    const grid = document.getElementById('countryCardsGrid');
    if (allReports.length === 0) {
        grid.innerHTML = '<div style="color:var(--ink3);padding:20px;grid-column:1/-1;text-align:center;">Henüz hiç kayıt yok.</div>';
        return;
    }

    // Ülkelere göre grupla (Her ülkenin en güncel rapor tarihini bul)
    const countries = {};
    allReports.forEach(r => {
        if (!countries[r.country]) {
            countries[r.country] = { name: r.country, region: r.region, count: 0, lastUpdate: r.created_at };
        }
        countries[r.country].count++;
    });

    const sortedCountries = Object.values(countries).sort((a,b) => a.name.localeCompare(b.name));

    // Panel gizle (sekme geçişlerinde sıfırlanması için)
    document.getElementById('countryDetailPanel').classList.add('hidden');

    grid.innerHTML = sortedCountries.map(c => `
        <div class="country-card" id="card-${c.name.replace(/\s+/g, '-')}" onclick="showCountryDetails('${c.name}', this)">
            <h3>${c.name}</h3>
            <p style="margin-bottom:4px;">${c.region}</p>
            <p style="font-size:11px;">${c.count} oturum</p>
        </div>
    `).join('');
}

function showCountryDetails(countryName, cardElement) {
    // Tüm kartlardaki aktif sınıfını kaldır
    document.querySelectorAll('.country-card').forEach(el => el.classList.remove('active'));
    // Tıklanan karta aktif sınıfı ekle
    if (cardElement) {
        cardElement.classList.add('active');
    }

    const countryReports = allReports.filter(r => r.country === countryName);
    if (countryReports.length === 0) return;

    const sonRapor = countryReports[0];

    document.getElementById('detailCountryName').textContent = countryName;
    document.getElementById('detailRegionName').textContent = sonRapor.region;

    const mevcutIzinler = countryReports.filter(r => r.is_avail === 'Evet');
    
    let izinlerHtml = '';
    if (mevcutIzinler.length === 0) {
        izinlerHtml = '<p style="color:var(--red);font-size:13px;padding:20px;text-align:center;">Bu ülkede mevcut bir oturum türü bildirilmemiş.</p>';
    } else {
        izinlerHtml = mevcutIzinler.map(r => `
            <div style="background:var(--off); padding:12px 16px; border-radius:6px; margin-bottom:10px; border-left:3px solid var(--green);">
                <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                    <strong style="color:var(--navy);font-size:14px;">${r.permit_name}</strong>
                    <span style="font-size:12px;color:var(--ink3);font-weight:600">${r.cost ? r.cost + ' ' + r.currency : 'Maliyet Belirtilmemiş'}</span>
                </div>
                <div style="font-size:12px;color:var(--ink3);display:flex;gap:15px;margin-bottom:6px;">
                    <span>⏳ Geçerlilik: ${r.validity !== '—' ? r.validity : '?'}</span>
                    <span>⏱ İşlem: ${r.process_time !== '—' ? r.process_time : '?'}</span>
                </div>
                ${r.note ? `<div style="font-size:12px;color:var(--ink2);margin-top:5px;padding-top:5px;border-top:1px dashed var(--line)"><i>Not:</i> ${r.note}</div>` : ''}
            </div>
        `).join('');
    }

    const html = `
        <!-- Sol Kolon: Notlar & Durum Değerlendirmesi -->
        <div style="display:flex; flex-direction:column; gap:20px;">
            <div class="detail-section" style="border-top:3px solid var(--gold);">
                <h3>📝 Ek Bilgiler ve Durum Değerlendirmesi</h3>
                <div class="m-field">
                    <div class="m-lbl">Acil / Öncelikli Durum</div>
                    <div class="m-val" style="color:${sonRapor.urgent ? 'var(--red)' : 'var(--ink)'}; font-weight:${sonRapor.urgent ? '600' : '400'}">${sonRapor.urgent || 'Belirtilmemiş'}</div>
                </div>
                <div class="m-field"><div class="m-lbl">Güncel Zorluklar / Engeller</div><div class="m-val-note">${sonRapor.challenges || 'Belirtilmemiş'}</div></div>
                <div class="m-field"><div class="m-lbl">Son 6 Ayda Değişen Mevzuat</div><div class="m-val-note">${sonRapor.recent_changes || 'Belirtilmemiş'}</div></div>
                <div class="m-field"><div class="m-lbl">Öneriler & İpuçları</div><div class="m-val-note">${sonRapor.tips || 'Belirtilmemiş'}</div></div>
                <div class="m-field" style="margin-top:10px;"><div class="m-lbl">Son Rapor Tarihi</div><div class="m-val">${sonRapor.report_date || '—'}</div></div>
            </div>
        </div>

        <!-- Sağ Kolon: Mevcut İzinler Listesi (Detaylı Bilgi) -->
        <div class="detail-section" style="background:#fff;">
            <h3>🛂 Ülkedeki Mevcut Oturum Türleri</h3>
            <div style="max-height:600px; overflow-y:auto; padding-right:5px;">
                ${izinlerHtml}
            </div>
            
            <h3 style="margin-top: 20px; border-top: 1px solid var(--line); padding-top: 20px;">📄 Genel Oturum Detayları</h3>
            <div style="white-space:pre-wrap; font-size:14px; line-height:1.6; color:var(--ink2);">
                ${sonRapor.residence_info || 'Bu ülke için genel oturum detayı girilmemiş.'}
            </div>
        </div>
    `;

    document.getElementById('detailBodyContent').innerHTML = html;
    document.getElementById('countryDetailPanel').classList.remove('hidden');
}
