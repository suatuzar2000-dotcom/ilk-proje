// ─── VALIDATION ───
function validateP2() {
  const nameEl = document.getElementById('pName');
  const emailEl = document.getElementById('pEmail');
  
  // Eğer 2. sayfada değilsek (DOM'da elemanlar yoksa), veritabanı (draft) üzerinden doğrula
  if (!nameEl || !emailEl) {
    if (typeof getDraft === 'function') {
      const p = getDraft();
      if (!p.person.name || !p.person.email || !p.person.email.includes('@')) {
        return false;
      }
      return true;
    }
    return true; 
  }

  let valid = true;
  if(!nameEl.value.trim()) {
    nameEl.classList.add('invalid');
    valid = false;
  } else {
    nameEl.classList.remove('invalid');
  }
  
  if(!emailEl.value.trim() || !emailEl.value.includes('@')) {
    emailEl.classList.add('invalid');
    valid = false;
  } else {
    emailEl.classList.remove('invalid');
  }
  
  return valid;
}

document.addEventListener('DOMContentLoaded', () => {
    const pName = document.getElementById('pName');
    const pEmail = document.getElementById('pEmail');
    if(pName) pName.addEventListener('input', function() { if(this.value.trim()) this.classList.remove('invalid'); });
    if(pEmail) pEmail.addEventListener('input', function() { if(this.value.trim() && this.value.includes('@')) this.classList.remove('invalid'); });
});
