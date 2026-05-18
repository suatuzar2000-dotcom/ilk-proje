// ─── CONFIG ───
const SHEETS_ID = "1yDUS6YrkU2wbXse0iPuHdfj06zgOiEtZGCqS9BqR9uQ";
const SHEETS_URL = `https://docs.google.com/spreadsheets/d/${SHEETS_ID}/edit`;
const LS_KEY = 'oturum_form_draft';
const LS_SETTINGS_KEY = 'oturum_form_settings';

// ─── DATA ───
const PERMITS = [
  "Din adamı / dini görevli",
  "Şirket ortağı / yatırımcı",
  "Şirket çalışanı (iş vizesi)",
  "Dernek / vakıf çalışanı",
  "Dernek / vakıf gönüllüsü",
  "Üniversite öğrencisi",
  "Aile birleşimi / eş ve çocuk",
  "Araştırmacı / akademisyen",
  "İnsani yardım çalışanı (NGO / INGO)",
  "Paralı uzun dönem vize — 1 yıl",
  "Paralı uzun dönem vize — 6 ay",
  "Turistik kısa dönem vize (1–3 ay)",
];
const CURR = ["USD","EUR","SAR","AED","EGP","TND","DZD","LYD","SDG","IQD","JOD","LBP","YER","QAR","KWD","BHD","OMR","XAF","Diğer"];
const DUR  = ["—","1 ay","3 ay","6 ay","1 yıl","2 yıl","Süresiz","Diğer"];
const PROC = ["—","1–3 gün","1 hafta","2–4 hafta","1–2 ay","2–3 ay","3+ ay","Bilinmiyor"];

let selCountry = "", selRegion = "";
