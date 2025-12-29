export const BANK = {
  seerah: [
    { q: "Where was Prophet Muhammad (PBUH) born?", a: "Makkah", ref: "Seerah" },
    { q: "What was the name of Prophet Muhammad’s (PBUH) first wife?", a: "Khadijah (RA)", ref: "Seerah" },
    { q: "In which cave did the Prophet (PBUH) receive his first revelation?", a: "Cave of Hira", ref: "Seerah" },
    { q: "What was the name of the migration journey from Makkah to Madinah?", a: "Hijrah", ref: "Seerah" },
    { q: "Which battle was the first major battle in Islam?", a: "Battle of Badr", ref: "Seerah" },
    { q: "What is the name of the treaty Prophet Muhammad (PBUH) made with Quraysh?", a: "Treaty of Hudaybiyyah", ref: "Seerah" },
    { q: "How many years did the Prophet (PBUH) preach in Makkah before migrating?", a: "13 years", ref: "Seerah" },
    { q: "Who raised the Prophet (PBUH) after his parents died?", a: "His uncle Abu Talib", ref: "Seerah" },
    { q: "What event marks the start of the Islamic calendar?", a: "Hijrah", ref: "Seerah" },
    { q: "Who was the Prophet’s (PBUH) closest companion and the first Caliph?", a: "Abu Bakr (RA)", ref: "Seerah" }
  ],
  prophets: [
    { q: "Who built the Ark to survive the Flood?", a: "Prophet Nuh (AS)", ref: "Prophets" },
    { q: "Which Prophet was swallowed by a big fish?", a: "Prophet Yunus (AS)", ref: "Prophets" },
    { q: "Who was given the Ten Commandments?", a: "Prophet Musa (AS)", ref: "Prophets" },
    { q: "Which Prophet was thrown into the fire but saved?", a: "Prophet Ibrahim (AS)", ref: "Prophets" },
    { q: "Who led the Israelites out of Egypt?", a: "Prophet Musa (AS)", ref: "Prophets" },
    { q: "Which Prophet was known for his wisdom?", a: "Prophet Sulaiman (AS)", ref: "Prophets" },
    { q: "Who was a king and could talk to animals?", a: "Prophet Dawud (AS)", ref: "Prophets" },
    { q: "Which Prophet was born to Hannah?", a: "Prophet Isa (AS)", ref: "Prophets" },
    { q: "Who was given the Zabur?", a: "Prophet Dawud (AS)", ref: "Prophets" },
    { q: "Which Prophet was tested with sacrificing his son?", a: "Prophet Ibrahim (AS)", ref: "Prophets" }
  ],
  quran: [
    { q: "How many Surahs are in the Quran?", a: "114", ref: "Quran" },
    { q: "What is the opening Surah of the Quran?", a: "Surah Al-Fatihah", ref: "Quran" },
    { q: "What is the longest Surah?", a: "Surah Al-Baqarah", ref: "Quran" },
    { q: "Which Surah is the Heart of the Quran?", a: "Surah Yaseen", ref: "Quran" },
    { q: "Which Surah contains Ayat al-Kursi?", a: "Surah Al-Baqarah", ref: "Quran" },
    { q: "What language was the Quran revealed in?", a: "Arabic", ref: "Quran" },
    { q: "In which month was the Quran revealed?", a: "Ramadan", ref: "Quran" },
    { q: "Which angel delivered the revelation?", a: "Angel Jibreel (AS)", ref: "Quran" },
    { q: "Which Surah tells the story of Prophet Yusuf?", a: "Surah Yusuf", ref: "Quran" },
    { q: "Which Surah is recited for protection?", a: "Surah Al-Falaq & Surah An-Naas", ref: "Quran" }
  ],
  akhlaq: [
    { q: "What does Akhlaq mean?", a: "Character / Good manners", ref: "Akhlaq" },
    { q: "Name one good moral trait in Islam.", a: "Kindness / Honesty / Patience", ref: "Akhlaq" },
    { q: "What should a Muslim say when greeting?", a: "Assalamu Alaikum", ref: "Akhlaq" },
    { q: "Is telling the truth important in Islam?", a: "Yes", ref: "Akhlaq" },
    { q: "What is the term for charity?", a: "Zakat / Sadaqah", ref: "Akhlaq" },
    { q: "How should Muslims treat their parents?", a: "With kindness and respect", ref: "Akhlaq" },
    { q: "What should a Muslim do after making a sin?", a: "Make Tawbah (repent)", ref: "Akhlaq" },
    { q: "How should Muslims speak to others?", a: "Politely and kindly", ref: "Akhlaq" },
    { q: "What does Islam teach about forgiving others?", a: "It is encouraged", ref: "Akhlaq" },
    { q: "Why is patience important?", a: "It brings reward from Allah", ref: "Akhlaq" },
    { q: "What do Muslims do to respect the Quran?", a: "Handle it carefully", ref: "Akhlaq" },
    { q: "What good behaviour is encouraged in Ramadan?", a: "Generosity and kindness", ref: "Akhlaq" },
    { q: "How should Muslims treat neighbours?", a: "With kindness", ref: "Akhlaq" },
    { q: "What does Islam teach about honesty in business?", a: "Always be fair", ref: "Akhlaq" },
    { q: "What is Islam’s view on pride?", a: "It is forbidden", ref: "Akhlaq" },
    { q: "How should a Muslim respond to anger?", a: "Control it", ref: "Akhlaq" },
    { q: "What is the meaning of Bismillah?", a: "In the Name of Allah", ref: "Akhlaq" },
    { q: "How important is cleanliness in Islam?", a: "Very important", ref: "Akhlaq" },
    { q: "What is the role of kindness in Islam?", a: "Allah loves those who are kind", ref: "Akhlaq" },
    { q: "Why should we respect elders?", a: "It is a part of good manners", ref: "Akhlaq" }
  ]
};

export const WORDS = {
  prophets: ["Nuh","Yunus","Musa","Ibrahim","Sulaiman","Dawud","Isa","Yusuf"],
  quran: ["Fatihah","Baqarah","Yaseen","Kursi","Arabic","Ramadan","Falaq","Naas","Yusuf"],
  seerah: ["Makkah","Hijrah","Badr","Hudaybiyyah","Hira","Madinah","AbuTalib","AbuBakr"],
  akhlaq: ["Kindness","Honesty","Patience","Zakat","Sadaqah","Respect","Tawbah","Cleanliness"]
};

export const MATCH_PAIRS = [
  { left: "Musa (AS)", right: "Splitting the sea" },
  { left: "Isa (AS)", right: "Healing the sick" },
  { left: "Dawud (AS)", right: "Iron made soft" }
];

export function pickRandom(arr, n) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}
