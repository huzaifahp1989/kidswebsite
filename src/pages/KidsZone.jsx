import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Trophy, BookOpen, Palette, Sparkles, GraduationCap, Video, Radio, Target, Gamepad2, Star, Shield, Gift, Bell, Moon, Heart, Book, Megaphone, Mic, Play, Lightbulb } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { watchAuth, getUserProfile } from "@/api/firebase";
import Stories from "./Stories";
import CreativeCorner from "./CreativeCorner";
import DrawingBoard from "./DrawingBoard";
import Games from "./Games";
import Videos from "./Videos";
import PoetryWriting from "./PoetryWriting";
import MonthlyContest from "./MonthlyContest";
import Duas from "./Duas";
import Worksheets from "./Worksheets";
import KidsRecordingStudio from "./KidsRecordingStudio";
import FullQuran from "./FullQuran";
import Quizzes from "./Quizzes";


export default function KidsZone() {
  const [fbUser, setFbUser] = useState(null);
  const [points, setPoints] = useState(0);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const stop = watchAuth(async (u) => {
      setFbUser(u);
      if (!u) {
        setPoints(0);
        return;
      }
      getUserProfile(u.uid)
        .then((p) => setPoints(Number((p?.total_points != null ? p.total_points : p?.points) || 0)))
        .catch(() => {});
    });
    return () => { if (typeof stop === 'function') { stop(); } };
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('daily_streak');
      setStreak(Number(raw || 0));
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <div className="relative max-w-7xl mx-auto p-4 sm:p-6">
      <div className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full bg-blue-200/40 blur-2xl" />
      <div className="pointer-events-none absolute top-32 -left-10 w-48 h-48 rounded-full bg-purple-200/40 blur-2xl" />

      <Card className="mb-6 overflow-hidden shadow-xl">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Moon className="w-6 h-6" />
              </div>
              <CardTitle className="text-xl sm:text-2xl tracking-wide">Kids Zone</CardTitle>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-sm text-white/80">Welcome{fbUser?.email ? `, ${fbUser.email.split('@')[0]}` : ", Kids!"}</div>
              <button className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Bell className="w-5 h-5" />
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-sm">
              <Star className="w-4 h-4 text-amber-500" />
              <div className="text-xs sm:text-sm font-semibold">Points</div>
              <div className="ml-auto text-xs sm:text-sm text-gray-700">{points || "—"}</div>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-sm">
              <Shield className="w-4 h-4 text-emerald-600" />
              <div className="text-xs sm:text-sm font-semibold">Shield</div>
              <div className="ml-auto text-xs sm:text-sm text-gray-700">100%</div>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-sm">
              <Gift className="w-4 h-4 text-pink-600" />
              <div className="text-xs sm:text-sm font-semibold">Rewards</div>
              <div className="ml-auto text-xs sm:text-sm text-gray-700">Active</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:gap-4 mb-6">
        <Link to={createPageUrl("LearningPaths")} className="block">
        <motion.div whileTap={{ scale: 0.98 }} className="w-full text-left rounded-2xl overflow-hidden shadow-lg">
          <div className="bg-gradient-to-r from-emerald-500 to-green-600 p-5 sm:p-6 text-white">
            <div className="flex items-center gap-3">
              <Star className="w-6 h-6" />
              <div>
                <div className="text-xl font-bold">Aqīdah</div>
                <div className="text-sm text-white/85">Next lesson: 3</div>
              </div>
              <Sparkles className="ml-auto w-5 h-5 opacity-70" />
            </div>
          </div>
        </motion.div>
        </Link>

        <Link to={createPageUrl("LearningPaths")} className="block">
        <motion.div whileTap={{ scale: 0.98 }} className="w-full text-left rounded-2xl overflow-hidden shadow-lg">
          <div className="bg-gradient-to-r from-teal-400 to-emerald-500 p-5 sm:p-6 text-white">
            <div className="flex items-center gap-3">
              <Heart className="w-6 h-6" />
              <div>
                <div className="text-xl font-bold">Akhlāq (Manners)</div>
                <div className="text-sm text-white/85">Next lesson: 5</div>
              </div>
              <Sparkles className="ml-auto w-5 h-5 opacity-70" />
            </div>
          </div>
        </motion.div>
        </Link>

        <Link to={createPageUrl("Duas")} className="block">
        <motion.div whileTap={{ scale: 0.98 }} className="w-full text-left rounded-2xl overflow-hidden shadow-lg">
          <div className="bg-gradient-to-r from-sky-500 to-blue-600 p-5 sm:p-6 text-white">
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6" />
              <div>
                <div className="text-xl font-bold">Duʿāʾs</div>
                <div className="text-sm text-white/85">Next lesson: 2</div>
              </div>
              <Sparkles className="ml-auto w-5 h-5 opacity-70" />
            </div>
          </div>
        </motion.div>
        </Link>

        <Link to={createPageUrl("LearningPaths")} className="block">
        <motion.div whileTap={{ scale: 0.98 }} className="w-full text-left rounded-2xl overflow-hidden shadow-lg">
          <div className="bg-gradient-to-r from-violet-500 to-purple-600 p-5 sm:p-6 text-white">
            <div className="flex items-center gap-3">
              <Book className="w-6 h-6" />
              <div>
                <div className="text-xl font-bold">Fiqh</div>
                <div className="text-sm text-white/85">Next lesson: 1</div>
              </div>
              <Sparkles className="ml-auto w-5 h-5 opacity-70" />
            </div>
          </div>
        </motion.div>
        </Link>
      </div>

      <div className="mb-8">
        <div className="text-center mb-2">
          <div className="text-lg sm:text-xl font-bold text-gray-900">Quick Access</div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
          <Link to={createPageUrl("KidsRecordingStudio")} className="group flex flex-col items-center">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-teal-100 shadow-md flex items-center justify-center transition-transform group-hover:scale-[1.03]">
              <Mic className="w-10 h-10 sm:w-12 sm:h-12 text-teal-600" />
            </div>
            <div className="mt-3 text-sm sm:text-base font-semibold text-gray-800">Recording Studio</div>
          </Link>

          <Link to={createPageUrl("KidsZone")} className="group flex flex-col items-center">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-amber-100 shadow-md flex items-center justify-center transition-transform group-hover:scale-[1.03]">
              <Moon className="w-10 h-10 sm:w-12 sm:h-12 text-amber-600" />
            </div>
            <div className="mt-3 text-sm sm:text-base font-semibold text-gray-800">Kids Zone</div>
          </Link>

          <Link to={createPageUrl("Quran")} className="group flex flex-col items-center">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-blue-100 shadow-md flex items-center justify-center transition-transform group-hover:scale-[1.03]">
              <BookOpen className="w-10 h-10 sm:w-12 sm:h-12 text-blue-600" />
            </div>
            <div className="mt-3 text-sm sm:text-base font-semibold text-gray-800">Quran</div>
          </Link>

          <Link to={createPageUrl("Multimedia")} className="group flex flex-col items-center">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-purple-100 shadow-md flex items-center justify-center transition-transform group-hover:scale-[1.03]">
              <Play className="w-10 h-10 sm:w-12 sm:h-12 text-purple-600" />
            </div>
            <div className="mt-3 text-sm sm:text-base font-semibold text-gray-800">Media</div>
          </Link>

          <Link to={createPageUrl("Learn")} className="group flex flex-col items-center">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-emerald-100 shadow-md flex items-center justify-center transition-transform group-hover:scale-[1.03]">
              <Lightbulb className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-600" />
            </div>
            <div className="mt-3 text-sm sm:text-base font-semibold text-gray-800">Ilm</div>
          </Link>

          <Link to={createPageUrl("Stories")} className="group flex flex-col items-center">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-indigo-100 shadow-md flex items-center justify-center transition-transform group-hover:scale-[1.03]">
              <BookOpen className="w-10 h-10 sm:w-12 sm:h-12 text-indigo-600" />
            </div>
            <div className="mt-3 text-sm sm:text-base font-semibold text-gray-800">Stories</div>
          </Link>
        </div>
      </div>

      <Card className="mb-8 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Megaphone className="w-5 h-5" />
            Latest Updates
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 bg-gradient-to-br from-indigo-50 via-fuchsia-50 to-purple-50">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="rounded-xl bg-white p-4 shadow">
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="w-4 h-4 text-amber-600" />
                <div className="text-sm font-semibold">Winner Announcement</div>
              </div>
              <div className="text-sm text-gray-600">Congratulations to this week’s quiz winners!</div>
            </div>
            <div className="rounded-xl bg-white p-4 shadow">
              <div className="flex items-center gap-2 mb-1">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <div className="text-sm font-semibold">New Lessons Uploaded</div>
              </div>
              <div className="text-sm text-gray-600">Fresh content added in Aqīdah and Akhlāq.</div>
            </div>
            <div className="rounded-xl bg-white p-4 shadow">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <div className="text-sm font-semibold">Upcoming Events</div>
              </div>
              <div className="text-sm text-gray-600">Join our monthly kids competition and win rewards!</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mb-24">
        <div className="rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-amber-100 to-rose-100 p-5 flex items-center gap-4 shadow">
          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-2xl">🌙</div>
          <div>
            <div className="text-base sm:text-lg font-semibold text-gray-900">Keep learning and earning rewards!</div>
            <div className="text-sm text-gray-600">You’re doing great — stay curious and kind.</div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="quizzes" className="mt-2">
        <TabsList className="flex gap-2 p-2 mb-2 sm:mb-4 overflow-x-auto whitespace-nowrap">
          <TabsTrigger value="quizzes" className="flex items-center gap-2 px-3 py-2 text-xs md:text-sm rounded-full border data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-fuchsia-500 data-[state=active]:text-white">
            <Target className="w-4 h-4" />
            Quizzes
          </TabsTrigger>
          <TabsTrigger value="games" className="flex items-center gap-2 px-3 py-2 text-xs md:text-sm rounded-full border data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white">
            <Gamepad2 className="w-4 h-4" />
            Games
          </TabsTrigger>
          <TabsTrigger value="stories" className="flex items-center gap-2 px-3 py-2 text-xs md:text-sm rounded-full border data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-500 data-[state=active]:text-white">
            <BookOpen className="w-4 h-4" />
            Stories
          </TabsTrigger>
          <TabsTrigger value="creative" className="flex items-center gap-2 px-3 py-2 text-xs md:text-sm rounded-full border data-[state=active]:bg-gradient-to-r data-[state=active]:from-fuchsia-500 data-[state=active]:to-pink-500 data-[state=active]:text-white">
            <Sparkles className="w-4 h-4" />
            Creative Corner
          </TabsTrigger>
          <TabsTrigger value="drawing" className="flex items-center gap-2 px-3 py-2 text-xs md:text-sm rounded-full border data-[state=active]:bg-gradient-to-r data-[state=active]:from-sky-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white">
            <Palette className="w-4 h-4" />
            Drawing Board
          </TabsTrigger>
          <TabsTrigger value="poetry" className="flex items-center gap-2 px-3 py-2 text-xs md:text-sm rounded-full border data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-purple-500 data-[state=active]:text-white">
            <Sparkles className="w-4 h-4" />
            Poetry Writing
          </TabsTrigger>
          <TabsTrigger value="contest" className="flex items-center gap-2 px-3 py-2 text-xs md:text-sm rounded-full border data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-amber-500 data-[state=active]:text-white">
            <Trophy className="w-4 h-4" />
            Monthly Contest
          </TabsTrigger>
          <TabsTrigger value="duas" className="flex items-center gap-2 px-3 py-2 text-xs md:text-sm rounded-full border data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white">
            <Sparkles className="w-4 h-4" />
            Duas
          </TabsTrigger>
          <TabsTrigger value="worksheets" className="flex items-center gap-2 px-3 py-2 text-xs md:text-sm rounded-full border data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-sky-500 data-[state=active]:text-white">
            <GraduationCap className="w-4 h-4" />
            Worksheets
          </TabsTrigger>
          <TabsTrigger value="videos" className="flex items-center gap-2 px-3 py-2 text-xs md:text-sm rounded-full border data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-pink-500 data-[state=active]:text-white">
            <Video className="w-4 h-4" />
            Videos
          </TabsTrigger>
          <TabsTrigger value="kidsstudio" className="flex items-center gap-2 px-3 py-2 text-xs md:text-sm rounded-full border data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white">
            <Radio className="w-4 h-4" />
            Kids Studio
          </TabsTrigger>
          <TabsTrigger value="quran" className="flex items-center gap-2 px-3 py-2 text-xs md:text-sm rounded-full border data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-teal-500 data-[state=active]:text-white">
            <BookOpen className="w-4 h-4" />
            Full Quran
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quizzes" className="mt-8 sm:mt-10">
          <Quizzes />
        </TabsContent>
        <TabsContent value="games" className="mt-8 sm:mt-10">
          <Games />
        </TabsContent>
        <TabsContent value="stories" className="mt-8 sm:mt-10">
          <Stories />
        </TabsContent>
        <TabsContent value="creative" className="mt-8 sm:mt-10">
          <CreativeCorner />
        </TabsContent>
        <TabsContent value="drawing" className="mt-8 sm:mt-10">
          <DrawingBoard />
        </TabsContent>
        <TabsContent value="poetry" className="mt-8 sm:mt-10">
          <PoetryWriting />
        </TabsContent>
        <TabsContent value="contest" className="mt-8 sm:mt-10">
          <MonthlyContest />
        </TabsContent>
        <TabsContent value="duas" className="mt-8 sm:mt-10">
          <Duas />
        </TabsContent>
        <TabsContent value="worksheets" className="mt-8 sm:mt-10">
          <Worksheets />
        </TabsContent>
        <TabsContent value="videos" className="mt-8 sm:mt-10">
          <Videos />
        </TabsContent>
        <TabsContent value="kidsstudio" className="mt-8 sm:mt-10">
          <KidsRecordingStudio />
        </TabsContent>
        <TabsContent value="quran" className="mt-8 sm:mt-10">
          <FullQuran />
        </TabsContent>
      </Tabs>
    </div>
  );
}
