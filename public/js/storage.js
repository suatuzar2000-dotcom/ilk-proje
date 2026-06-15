// ─── LOCAL STORAGE ───
// Yeni mimaride her sayfa kendi DOM elemanlarına sahip olduğu için
// "merge" işlemi yapmamız gerekiyor.

function getDraft() {
  const draft = localStorage.getItem(LS_KEY);
  return draft ? JSON.parse(draft) : {
    country: "", region: "", date: "",
    permits: [],
    residenceInfo: "",
    notes: { challenges:"", changes:"", tips:"", urgent:"" }
  };
}

function saveDraft() {
  const p = getDraft(); // Önceki sayfaların verisini koru
  
  // Eğer bu sayfada bu elementler varsa, p objesini güncelle
  if (typeof selCountry !== 'undefined' && selCountry) {
    p.country = selCountry;
    p.region = selRegion;
  }
  
  const ptbody = document.getElementById('ptbody');
  if (ptbody) {
    p.permits = typeof collectPermits === 'function' ? collectPermits() : [];
  }
  
  const residenceInfoEl = document.getElementById('residenceInfo');
  if (residenceInfoEl) {
    p.residenceInfo = residenceInfoEl.value;
  }
  
  const challenges = document.getElementById('challenges');
  if (challenges) {
    p.notes.challenges = challenges.value.trim();
    p.notes.changes = document.getElementById('recentChanges').value.trim();
    p.notes.tips = document.getElementById('tips').value.trim();
    p.notes.urgent = document.getElementById('urgent').value.trim();
  }

  localStorage.setItem(LS_KEY, JSON.stringify(p));
}

function loadDraft() {
  const p = getDraft();
  
  // Hangi sayfada olursak olalım, hafızadaki ülkeyi global değişkenlere yükle
  // Bu sayede "Geri" butonuna basıldığında app.js'teki ülke doğrulaması (validation) hata vermez.
  if (typeof selCountry !== 'undefined') {
      selCountry = p.country || "";
      selRegion = p.region || "";
  }
  
  // 1. Sayfa (index.html)
  if (p.country && typeof selCountry !== 'undefined') {
    const btn = document.querySelector(`.cbtn[data-c="${p.country}"]`);
    if(btn) btn.click();
  }
  
  // 2. Sayfa (oturum.html)
  if (document.getElementById('ptbody')) {
    if(p.permits && p.permits.length > 0) {
      document.getElementById('ptbody').innerHTML = '';
      p.permits.forEach(r => typeof addRow === 'function' && addRow(r.name, r));
    } else {
      if(document.getElementById('ptbody').children.length === 0 && typeof initTable === 'function') initTable();
    }
  }

  if (document.getElementById('residenceInfo')) {
    document.getElementById('residenceInfo').value = p.residenceInfo || '';
  }
  
  // 4. Sayfa (gonder.html)
  if (document.getElementById('challenges') && p.notes) {
    document.getElementById('challenges').value = p.notes.challenges || '';
    document.getElementById('recentChanges').value = p.notes.changes || '';
    document.getElementById('tips').value = p.notes.tips || '';
    document.getElementById('urgent').value = p.notes.urgent || '';
  }
}

function saveSettings() {
  const appsUrl = document.getElementById('appsScriptUrl');
  if(appsUrl) {
    localStorage.setItem(LS_SETTINGS_KEY, appsUrl.value);
  }
}

function loadSettings() {
  const url = localStorage.getItem(LS_SETTINGS_KEY);
  const appsUrl = document.getElementById('appsScriptUrl');
  if(appsUrl) {
    if(url) appsUrl.value = url;
    if(!appsUrl.value) {
      appsUrl.value = "https://script.google.com/macros/s/AKfycbzIEaVME7fq3K-ixNj8MV8IhvzLru_BkpqQbI6cGFJt4404aBcNnBO6JQbDWCoGb5iJ/exec";
    }
  }
}
