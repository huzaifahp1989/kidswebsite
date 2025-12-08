import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { motion } from "framer-motion";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const duas = [
  {
    id: "bismillah",
    category: "Daily",
    title: "Before Eating",
    arabic: "بِسْمِ اللهِ",
    transliteration: "Bismillah",
    translation: "In the name of Allah",
    audioAr: "/duas_audio/bismillah-ar.mp3",
    audioEn: "/duas_audio/bismillah-en.mp3",
    reference: "Sunan Abu Dawud"
  },
  {
    id: "alhamdulillah",
    category: "Daily",
    title: "After Eating",
    arabic: "الْحَمْدُ لِلَّهِ",
    transliteration: "Alhamdulillah",
    translation: "All praise is for Allah",
    audioAr: "/duas_audio/alhamdulillah-ar.mp3",
    audioEn: "/duas_audio/alhamdulillah-en.mp3",
    reference: "Sahih Muslim"
  },
  {
    id: "morning",
    category: "Morning",
    title: "Morning Dua",
    arabic: "اللَّهُمَّ بِكَ أَصْبَحْنَا، وَبِكَ أَمْسَيْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ النُّشُورُ",
    transliteration: "Allahumma bika asbahna, wa bika amsayna, wa bika nahya, wa bika namutu, wa ilayka an-nushur",
    translation: "O Allah, by You we enter the morning, by You we enter the evening, by You we live, by You we die, and to You is the resurrection",
    audio: null,
    reference: "Tirmidhi"
  },
  {
    id: "sleep",
    category: "Bedtime",
    title: "Before Sleeping",
    arabic: "بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا",
    transliteration: "Bismika Allahumma amutu wa ahya",
    translation: "In Your name O Allah, I die and I live",
    audio: null,
    reference: "Bukhari"
  },
  {
    id: "travel",
    category: "Travel",
    title: "Traveling Dua",
    arabic: "سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَٰذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ",
    transliteration: "Subhanal-ladhi sakhkhara lana hadha wa ma kunna lahu muqrinin",
    translation: "Glory to Him who has subjected this to us, and we could not have done it ourselves",
    audio: null,
    reference: "Muslim"
  },
  {
    id: "entering_home",
    category: "Daily",
    title: "Entering Home",
    arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَ الْمَوْلِجِ وَخَيْرَ الْمَخْرَجِ",
    transliteration: "Allahumma inni as'aluka khayra al-mawliji wa khayra al-makhraji",
    translation: "O Allah, I ask You for the best entering and the best leaving",
    audio: null,
    reference: "Abu Dawud"
  },
  {
    id: "protection",
    category: "Protection",
    title: "Protection from harm",
    arabic: "بِسْمِ ٱللّٰهِ ٱلَّذِى لَا يَضُرُّ مَعَ اسْمِهِ شَىْءٌ فِى ٱلْأَرْضِ وَلَا فِى ٱلسَّمَآءِ وَهُوَ ٱلسَّمِيعُ ٱلْعَلِيمُ",
    transliteration: "Bismillahil-ladhi la yadurru ma'asmihi shay'un fil-ardi wa la fis-sama'i wa huwas-Sami'ul-'Aleem",
    translation: "In the name of Allah with whose name nothing on earth or in heaven can cause harm, and He is the All-Hearing, All-Knowing",
    audio: null,
    reference: "Abu Dawud"
  },
  {
    id: "mosque_entry",
    category: "Daily",
    title: "Entering the Mosque",
    arabic: "اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ",
    transliteration: "Allahumma iftah li abwaba rahmatik",
    translation: "O Allah, open for me the doors of Your mercy",
    audio: null,
    reference: "Muslim"
  },
  {
    id: "bathroom_entry",
    category: "Daily",
    title: "Entering the Bathroom",
    arabic: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْخُبُثِ وَالْخَبَائِثِ",
    transliteration: "Allahumma inni a'udhu bika minal khubuthi wal khaba'ith",
    translation: "O Allah, I seek refuge in You from male and female devils",
    audio: null,
    reference: "Bukhari"
  },
  {
    id: "bathroom_exit",
    category: "Daily",
    title: "Leaving the Bathroom",
    arabic: "غُفْرَانَكَ",
    transliteration: "Ghufranak",
    translation: "I seek Your forgiveness",
    audio: null,
    reference: "Abu Dawud"
  },
  {
    id: "start_study",
    category: "Learning",
    title: "Before Studying",
    arabic: "رَبِّ زِدْنِي عِلْمًا",
    transliteration: "Rabbi zidni ilma",
    translation: "My Lord, increase me in knowledge",
    audio: null,
    reference: "Quran 20:114"
  },
  {
    id: "sneezing_reply",
    category: "Manners",
    title: "Sneeze Reply",
    arabic: "يَرْحَمُكَ اللَّهُ",
    transliteration: "Yarhamukallah",
    translation: "May Allah have mercy on you",
    audio: null,
    reference: "Bukhari"
  },
  {
    id: "waking_up",
    category: "Morning",
    title: "Waking Up",
    arabic: "الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ",
    transliteration: "Alhamdu lillahil-ladhi ahyana ba'da ma amatana wa ilayhin-nushur",
    translation: "All praise is for Allah who gave us life after causing us to die, and to Him is the return",
    audio: null,
    reference: "Bukhari"
  },
  {
    id: "market_entry",
    category: "Protection",
    title: "Entering the Market",
    arabic: "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، يُحْيِي وَيُمِيتُ، وَهُوَ حَيٌّ لَا يَمُوتُ، بِيَدِهِ الْخَيْرُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ",
    transliteration: "La ilaha illallah wahdahu la sharika lahu, lahu-l mulku wa lahu-l hamdu, yuhyi wa yumit, wa huwa hayyun la yamutu, biyadihi-l khayr, wa huwa 'ala kulli shay'in qadir",
    translation: "None has the right to be worshipped but Allah alone, without partner; His is the dominion and praise; He gives life and death and He is Ever-Living who does not die; in His Hand is all good and He has power over everything",
    audio: null,
    reference: "Tirmidhi"
  }
];

const categories = ["All", "Daily", "Morning", "Bedtime", "Travel", "Protection", "Learning", "Manners"];

export default function Duas() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {}, []);

  const filteredDuas = selectedCategory === "All" 
    ? duas 
    : duas.filter(dua => dua.category === selectedCategory);

  const toggleFavorite = (duaId) => {
    if (favorites.includes(duaId)) {
      setFavorites(favorites.filter(id => id !== duaId));
    } else {
      setFavorites([...favorites, duaId]);
    }
  };

  const stopSpeaking = () => {};

  return (
    <div className="min-h-screen py-8 md:py-12 px-2 md:px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 px-2"
        >
          <div className="text-6xl mb-4">🤲</div>
          <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">
            Daily Duas
          </h1>
          <p className="text-base md:text-lg text-gray-600">
            Learn and memorize essential Islamic supplications
          </p>
        </motion.div>

        {/* Category Tabs */}
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-6">
          <TabsList className="flex flex-wrap gap-2 justify-center">
            {categories.map((category) => (
              <TabsTrigger key={category} value={category}>
                {category}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Duas List */}
        <div className="space-y-6">
          {filteredDuas.map((dua, index) => (
            <motion.div
              key={dua.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-blue-100 text-blue-800">{dua.category}</Badge>
                        <CardTitle className="text-xl">{dua.title}</CardTitle>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleFavorite(dua.id)}
                      className={favorites.includes(dua.id) ? "text-red-500" : "text-gray-400"}
                    >
                      <Heart className={`w-5 h-5 ${favorites.includes(dua.id) ? "fill-current" : ""}`} />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Arabic */}
                  <div className="text-center">
                    <p className="text-2xl md:text-3xl text-right mb-2" style={{ fontFamily: 'serif', lineHeight: '1.8' }}>
                      {dua.arabic}
                    </p>
                  </div>

                  {/* Transliteration */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="font-semibold text-gray-700 mb-1">Transliteration:</p>
                    <p className="text-gray-800 italic">{dua.transliteration}</p>
                  </div>

                  {/* Translation */}
                  <div className="bg-green-50 rounded-lg p-4">
                    <p className="font-semibold text-gray-700 mb-1">Translation:</p>
                    <p className="text-gray-800">{dua.translation}</p>
                    {dua.reference && (
                      <div className="mt-2">
                        <Badge variant="outline" className="text-xs">{dua.reference}</Badge>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {null}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Info Card */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12"
        >
          <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
            <CardContent className="p-8 text-center">
              <div className="text-5xl mb-4">✨</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                Keep Making Dua!
              </h3>
              <p className="text-gray-700 max-w-2xl mx-auto">
                The Prophet Muhammad ﷺ said: "Dua is the essence of worship." 
                Keep these duas in your daily routine and teach them to others!
              </p>
            </CardContent>
          </Card>
        </motion.div>
        {null}
      </div>
    </div>
  );
}
