// ─── SEARCH ───
function filterCountries(val) {
  val = val.toLowerCase();
  const tabs = document.getElementById('regionTabs');
  const panels = document.querySelectorAll('.rp');
  if(!tabs) return; // Sadece index.html'de çalışır
  
  if (val) {
    tabs.style.display = 'none';
    panels.forEach(p => p.style.display = 'block');
  } else {
    tabs.style.display = 'flex';
    panels.forEach(p => p.style.display = '');
    const activeTab = document.querySelector('.rt.active');
    if(activeTab) activeTab.click();
  }

  document.querySelectorAll('.cbtn').forEach(btn => {
    const text = btn.textContent.toLowerCase();
    if(text.includes(val)) {
      btn.style.display = 'flex';
    } else {
      btn.style.display = 'none';
    }
  });
}

// ─── REGION TABS ───
function switchR(key, el) {
  document.getElementById('countrySearch').value = '';
  filterCountries('');
  
  document.querySelectorAll('.rt').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.rp').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('rp-' + key).classList.add('active');
}

// ─── PAGE NAV ───
function goPage(url) {
  // Sayfadan çıkmadan önce doğrulamaları ve kaydetmeyi garantiye al
  if (typeof saveDraft === 'function') saveDraft();
  
  // Doğrulamalar
  if (url === 'oturum.html' && !selCountry) { alert(typeof t === 'function' ? t('Lütfen önce bir ülke seçin.') : 'Lütfen önce bir ülke seçin.'); return; }
  
  window.location.href = url;
}

// ─── TABLE ───
function initTable() { 
  const tbody = document.getElementById('ptbody');
  if(!tbody) return;
  tbody.innerHTML = '';
  PERMITS.forEach(name => addRow(name)); 
}

function addRow(name, initData = null) {
  const tbody = document.getElementById('ptbody');
  if(!tbody) return;
  
  const tr = document.createElement('tr');
  const d = initData || { avail:false, cost:'', cur:'USD', dur:'—', proc:'—', note:'' };
  
  const tName = typeof t === 'function' ? t(name) : name;
  const tCost = typeof t === 'function' ? t("Tahmini Maliyet") : "Tahmini Maliyet";
  const tNote = typeof t === 'function' ? t("Şart, belge, kota vb.") : "Şart, belge, kota vb.";
  
  tr.innerHTML = `
    <td class="rn">${tbody.children.length+1}</td>
    <td><input type="text" data-tr-name="${name}" value="${tName}" placeholder="${typeof t === 'function' ? t('Oturum / izin türü adı') : 'Oturum / izin türü adı'}"/></td>
    <td><div class="avw"><input type="checkbox" class="avail-chk" ${d.avail?'checked':''}/></div></td>
    <td><input type="number" placeholder="0" min="0" step="0.01" value="${d.cost||''}"/></td>
    <td><select>${CURR.map(c=>`<option ${c===d.cur?'selected':''}>${c}</option>`).join('')}</select></td>
    <td><select>${DUR.map(x=>`<option ${x===d.dur?'selected':''}>${typeof t === 'function' ? t(x) : x}</option>`).join('')}</select></td>
    <td><select>${PROC.map(x=>`<option ${x===d.proc?'selected':''}>${typeof t === 'function' ? t(x) : x}</option>`).join('')}</select></td>
    <td><input type="text" placeholder="${tNote}" value="${d.note||''}"/></td>
    <td class="no-print"><button class="delbtn" onclick="delRow(this)">×</button></td>
  `;
  tbody.appendChild(tr);
  
  const chk = tr.querySelector('.avail-chk');
  const toggleInputs = () => {
    const isAvail = chk.checked;
    tr.querySelectorAll('input:not(.avail-chk), select').forEach(el => {
      if(el.parentElement.parentElement === tr && el.parentElement.cellIndex !== 1) {
         el.disabled = !isAvail;
      }
    });
    if(typeof saveDraft === 'function') saveDraft();
  };
  
  chk.addEventListener('change', toggleInputs);
  tr.querySelectorAll('input, select').forEach(el => {
    el.addEventListener('change', () => { if(typeof saveDraft === 'function') saveDraft(); });
    if(el.type === 'text' || el.type === 'number') el.addEventListener('input', () => { if(typeof saveDraft === 'function') saveDraft(); });
  });
  
  toggleInputs();
  renumber();
}

function delRow(btn) { btn.closest('tr').remove(); renumber(); if(typeof saveDraft === 'function') saveDraft(); }

function renumber() {
  document.querySelectorAll('#ptbody tr').forEach((tr, i) => {
    const c = tr.querySelector('.rn');
    if (c) c.textContent = i + 1;
  });
}

function collectPermits() {
  const tbody = document.getElementById('ptbody');
  if(!tbody) return [];
  return Array.from(document.querySelectorAll('#ptbody tr')).map(tr => {
    const cells = tr.querySelectorAll('td');
    const nameInput = cells[1].querySelector('input');
    const trName = nameInput.getAttribute('data-tr-name');
    const isUntranslated = trName && typeof t === 'function' && nameInput.value === t(trName);
    
    return {
      name:  isUntranslated ? trName : nameInput.value || '',
      avail: cells[2].querySelector('input').checked,
      cost:  cells[3].querySelector('input').value,
      cur:   cells[4].querySelector('select').value,
      dur:   cells[5].querySelector('select').value,
      proc:  cells[6].querySelector('select').value,
      note:  cells[7].querySelector('input').value,
    };
  }).filter(r => r.name);
}

// ─── SUMMARY ───
function buildSummary() {
  const statGrid = document.getElementById('statGrid');
  if(!statGrid) return;
  
  // Kaydedilen taslaktan tüm veriyi oku
  if (typeof saveDraft === 'function') saveDraft(); 
  const p = typeof getDraft === 'function' ? getDraft() : null;
  if (!p) return;

  const avail = p.permits ? p.permits.filter(r => r.avail).length : 0;
  const total = p.permits ? p.permits.length : 0;
  
  document.getElementById('statGrid').innerHTML = `
    <div class="sc"><div class="lbl">${typeof t === 'function' ? t('Ülke') : 'Ülke'}</div><div class="val" style="font-size:17px">${typeof t === 'function' ? t(p.country||'—') : (p.country||'—')}</div></div>
    <div class="sc"><div class="lbl">${typeof t === 'function' ? t('Bölge') : 'Bölge'}</div><div class="val" style="font-size:15px;font-family:'IBM Plex Sans'">${typeof t === 'function' ? t(p.region||'—') : (p.region||'—')}</div></div>
    <div class="sc"><div class="lbl">${typeof t === 'function' ? t('Rapor tarihi') : 'Rapor tarihi'}</div><div class="val" style="font-size:15px;font-family:'IBM Plex Sans'">${p.date||'—'}</div></div>
    <div class="sc"><div class="lbl">${typeof t === 'function' ? t('Mevcut oturum') : 'Mevcut oturum'}</div><div class="val" style="color:var(--green)">${avail}</div></div>
    <div class="sc"><div class="lbl">${typeof t === 'function' ? t('Mevcut değil') : 'Mevcut değil'}</div><div class="val" style="color:var(--red)">${total - avail}</div></div>
  `;
  
  const sumBody = document.getElementById('sumBody');
  if (sumBody && p.permits) {
    sumBody.innerHTML = p.permits.map(r => `
      <tr>
        <td>${typeof t === 'function' ? t(r.name) : r.name}</td>
        <td><span class="badge ${r.avail?'yes':'no'}">${r.avail ? (typeof t === 'function' ? t('Evet') : 'Evet') : (typeof t === 'function' ? t('Hayır') : 'Hayır')}</span></td>
        <td>${r.cost ? r.cost+' '+r.cur : '—'}</td>
        <td>${r.dur !== '—' ? (typeof t === 'function' ? t(r.dur) : r.dur) : '—'}</td>
        <td>${r.proc !== '—' ? (typeof t === 'function' ? t(r.proc) : r.proc) : '—'}</td>
        <td style="font-size:12px;color:var(--ink3)">${r.note||'—'}</td>
      </tr>
    `).join('');
  }
  
  const sumRes = document.getElementById('sumResidenceInfo');
  if (sumRes) {
      sumRes.textContent = p.residenceInfo || 'Bilgi girilmedi.';
  }
}

// ─── SUBMIT TO SERVER ───
async function submitToSheets() {
  if (typeof saveDraft === 'function') saveDraft();
  const p = getDraft();

  showLoading(typeof t === 'function' ? t('Veriler veritabanına kaydediliyor...') : 'Veriler veritabanına kaydediliyor...');

  const timestamp = new Date().toLocaleString('tr-TR');
  // Yeni Google Sheets sütunlarına göre (Personel hariç, hem oturum tablo satırları hem metin)
  // Ülke | Bölge | Rapor Tarihi | Oturum Türü | Mevcut? | Tahmini Maliyet | Para Birimi | Geçerlilik | İşlem Süresi | Şart/Not | Oturum Detayları (Genel Metin) | Zorluklar | Son Değişiklikler | Öneriler | Acil Durum | Gönderim Zamanı
  const rows = p.permits.map(r => [
    p.country,
    p.region,
    p.date,
    r.name,
    r.avail ? 'Evet' : 'Hayır',
    r.cost,
    r.cur,
    r.dur,
    r.proc,
    r.note,
    p.residenceInfo,
    p.notes.challenges,
    p.notes.changes,
    p.notes.tips,
    p.notes.urgent,
    timestamp
  ]);

  try {
    const resp = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows })
    });
    
    if (!resp.ok) throw new Error('Sunucu hatası');
    
    hideLoading();
    if(typeof localStorage !== 'undefined') localStorage.removeItem(LS_KEY);
    window.location.href = 'basarili.html';
  } catch(e) {
    console.error(e);
    hideLoading();
    alert(typeof t === 'function' ? t("Veritabanına kaydedilemedi! Lütfen Node.js sunucusunun çalıştığından emin olun.") : "Veritabanına kaydedilemedi! Lütfen Node.js sunucusunun çalıştığından emin olun.");
    downloadCSV(rows, p.country);
    if(typeof localStorage !== 'undefined') localStorage.removeItem(LS_KEY);
    window.location.href = 'basarili.html?fallback=true';
  }
}

function downloadCSV(rows, country) {
  const header = ["Ülke", "Bölge", "Rapor Tarihi", "Oturum Türü", "Mevcut?", "Tahmini Maliyet", "Para Birimi", "Geçerlilik", "İşlem Süresi", "Şart/Not", "Oturum Detayları", "Zorluklar", "Son Değişiklikler", "Öneriler", "Acil Durum", "Gönderim Zamanı"];
  const csvRows = [header, ...rows].map(row =>
    row.map(cell => '"' + String(cell||'').replace(/"/g,'""') + '"').join(',')
  );
  const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `oturum_${(country||'rapor').replace(/\s/g,'_')}_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function showLoading(msg) { 
  const el = document.getElementById('loadingEl');
  if(el) {
    document.getElementById('loadingMsg').textContent = typeof t === 'function' ? t(msg) : msg; 
    el.classList.remove('hidden'); 
  }
}
function hideLoading() { 
  const el = document.getElementById('loadingEl');
  if(el) el.classList.add('hidden'); 
}

// ─── INITIALIZE FORM ───
document.addEventListener('DOMContentLoaded', () => {
  const pDate = document.getElementById('pDate');
  if(pDate && !pDate.value) pDate.valueAsDate = new Date();
  
  // Initialize country buttons
  document.querySelectorAll('.cbtn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cbtn').forEach(b => b.classList.remove('sel'));
      btn.classList.add('sel');
      selCountry = btn.dataset.c;
      selRegion = btn.dataset.r;
      const selName = document.getElementById('selName');
      if(selName) selName.textContent = selCountry;
      const selReg = document.getElementById('selReg');
      if(selReg) selReg.textContent = '(' + selRegion + ')';
      const selBar = document.getElementById('selBar');
      if(selBar) selBar.classList.add('show');
      if(typeof saveDraft === 'function') saveDraft();
    });
  });

  if(typeof loadSettings === 'function') loadSettings();
  if(typeof loadDraft === 'function') loadDraft();
  
  // Gonder.html için özel durum
  if(document.getElementById('statGrid')) {
    buildSummary();
  }

  // Basarili.html için fallback durumu
  if(document.getElementById('successMsg')) {
    const urlParams = new URLSearchParams(window.location.search);
    if(urlParams.get('fallback') === 'true') {
      document.getElementById('successMsg').textContent = typeof t === 'function' ? t("Rapor CSV olarak indirildi. Dosyayı açarak Google Sheets'e kopyalayabilirsiniz.") : "Rapor CSV olarak indirildi. Dosyayı açarak Google Sheets'e kopyalayabilirsiniz.";
    }
  }
  
  document.querySelectorAll('input:not(#appsScriptUrl), textarea').forEach(el => {
    el.addEventListener('change', () => { if(typeof saveDraft === 'function') saveDraft(); });
    if(el.type === 'text' || el.type === 'email' || el.tagName === 'TEXTAREA') {
      el.addEventListener('input', () => { if(typeof saveDraft === 'function') saveDraft(); });
    }
  });
});
