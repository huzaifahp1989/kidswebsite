import Layout from "./Layout.jsx";

import Home from "./Home";

import Games from "./Games";

import Leaderboard from "./Leaderboard";

import Stories from "./Stories";


import Learn from "./Learn";

import ParentZone from "./ParentZone";

import About from "./About";

import Welcome from "./Welcome";

import ContactUs from "./ContactUs";

import Duas from "./Duas";

import RecordingStudio from "./RecordingStudio";

import RecordingsAdmin from "./RecordingsAdmin";

import CreativeCorner from "./CreativeCorner";

import LearningLibrary from "./LearningLibrary";

import LearningPaths from "./LearningPaths";


import DrawingBoard from "./DrawingBoard";

import PoetryWriting from "./PoetryWriting";

import MonthlyContest from "./MonthlyContest";

import IslamicEncyclopedia from "./IslamicEncyclopedia";

import AudioTafsir from "./AudioTafsir";

import IslamicFacts from "./IslamicFacts";

import Worksheets from "./Worksheets";

import AudioNew from "./AudioNew";

import Hadith from "./Hadith";

import History from "./History";

import Tajweed from "./Tajweed";

import PrintableQuizzes from "./PrintableQuizzes";

import Multimedia from "./Multimedia";

import FullQuran from "./FullQuran";
import Manzil from "./Manzil";
import Hizb from "./Hizb";
import HifzDashboard from "./HifzDashboard";
import QuranDictionary from "./QuranDictionary";
import AdminReciters from "./AdminReciters";

import ResetPointsAdmin from "./ResetPointsAdmin";

import AdminDashboard from "./AdminDashboard";
import AdminLogin from "./AdminLogin";
import AdminGuard from "./AdminGuard";
import AdminSettings from "./AdminSettings";

import AdminStories from "./AdminStories";

import AdminAudio from "./AdminAudio";

import AdminMedia from "./AdminMedia";

import PrivacyPolicy from "./PrivacyPolicy";

import Challenges from "./Challenges";

import AdminQuestions from "./AdminQuestions";

import Videos from "./Videos";

import AdminVideos from "./AdminVideos";

import AdminAudioContent from "./AdminAudioContent";

import AdminUsers from "./AdminUsers";

import DeleteAccount from "./DeleteAccount";


import AdminBanners from "./AdminBanners";
import AdminSponsors from "./AdminSponsors";

import AdminStoryBuilder from "./AdminStoryBuilder";

import AdminGameSettings from "./AdminGameSettings";

import Quizzes from "./Quizzes";

import AdminQuizManager from "./AdminQuizManager";
import Signup from "./Signup";
import Login from "./Login";
import AdminMessages from "./AdminMessages";
import ChildProgress from "./ChildProgress";
import QuizSignup from "./QuizSignup";
import KidsRecordingStudio from "./KidsRecordingStudio";
import KidsZone from "./KidsZone";
import DailyMissions from "./DailyMissions";
import MyRewards from "./MyRewards";
import Alarm from "./Alarm";
import Competition from "./Competition";
import WhatsAppChannel from "./WhatsAppChannel";

import { BrowserRouter as Router, Route, Routes, useLocation, Navigate } from 'react-router-dom';
import Landing from "./Landing";

const PAGES = {
    
    Home: Home,
    
    Games: Games,
    
    Leaderboard: Leaderboard,
    
    Stories: Stories,
    
    
    Learn: Learn,
    
    ParentZone: ParentZone,
    
    About: About,
    
    Welcome: Welcome,
    
    ContactUs: ContactUs,
    
    Duas: Duas,
    
    RecordingStudio: RecordingStudio,
    KidsRecordingStudio: KidsRecordingStudio,
    KidsZone: KidsZone,
    DailyMissions: DailyMissions,
    MyRewards: MyRewards,
    
    RecordingsAdmin: RecordingsAdmin,
    
    CreativeCorner: CreativeCorner,
    
    LearningLibrary: LearningLibrary,
    LearningPaths: LearningPaths,
    
    
    DrawingBoard: DrawingBoard,
    
    PoetryWriting: PoetryWriting,
    
    MonthlyContest: MonthlyContest,
    
    IslamicEncyclopedia: IslamicEncyclopedia,
    
    AudioTafsir: AudioTafsir,
    
    IslamicFacts: IslamicFacts,
    
    Worksheets: Worksheets,
    
    AudioNew: AudioNew,
    
    Hadith: Hadith,
    
    History: History,
    
    Tajweed: Tajweed,
    
    PrintableQuizzes: PrintableQuizzes,
    
    Multimedia: Multimedia,
    
    FullQuran: FullQuran,
    Quran: FullQuran,
    AdminReciters: AdminReciters,
    QuranDictionary: QuranDictionary,
    Manzil: Manzil,
    Hizb: Hizb,
    HifzDashboard: HifzDashboard,
    
    ResetPointsAdmin: ResetPointsAdmin,
    
    AdminDashboard: AdminDashboard,
    AdminSettings: AdminSettings,
    
    AdminStories: AdminStories,
    
    AdminAudio: AdminAudio,
    
    AdminMedia: AdminMedia,
    
    PrivacyPolicy: PrivacyPolicy,
    
    Challenges: Challenges,
    
    AdminQuestions: AdminQuestions,
    
    Videos: Videos,
    
    AdminVideos: AdminVideos,
    
    AdminAudioContent: AdminAudioContent,
    
    AdminUsers: AdminUsers,
    
    DeleteAccount: DeleteAccount,
    
    
    AdminBanners: AdminBanners,
    
    AdminStoryBuilder: AdminStoryBuilder,
    
    AdminGameSettings: AdminGameSettings,
    
    Quizzes: Quizzes,
    
    AdminQuizManager: AdminQuizManager,
    Signup: QuizSignup,
    QuizSignup: QuizSignup,
    Login: Login,
    ChildProgress: ChildProgress,
    Alarm: Alarm,
    Competition: Competition,
    WhatsAppChannel: WhatsAppChannel,

}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    // Prevent returning 'Layout' as a page name
    if (!pageName || pageName === 'Layout') {
        return 'Home';
    }
    return pageName;
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    // Allow Assistant page without AdminGuard during local development
    
    const isDev = import.meta.env?.DEV;
    const adminAudioContentElement = isDev ? <AdminAudioContent /> : <AdminGuard><AdminAudioContent /></AdminGuard>;

    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Navigate to="/Home" replace />} />
                
                
                <Route path="/Home" element={<Home />} />
                <Route path="/kids" element={<KidsZone />} />
                <Route path="/DailyMissions" element={<DailyMissions />} />
                <Route path="/MyRewards" element={<MyRewards />} />
                
                <Route path="/Games" element={<Games />} />
                <Route path="/games" element={<Games />} />
                
                <Route path="/Leaderboard" element={<Leaderboard />} />
                
                <Route path="/Stories" element={<Stories />} />
                
                
                <Route path="/Learn" element={<Learn />} />
                
                <Route path="/ParentZone" element={<ParentZone />} />
                <Route path="/parentzone" element={<ParentZone />} />
                
                <Route path="/About" element={<About />} />
                
                <Route path="/Welcome" element={<Welcome />} />
                
                <Route path="/ContactUs" element={<ContactUs />} />
                
                <Route path="/Duas" element={<Duas />} />
                
                <Route path="/RecordingStudio" element={<RecordingStudio />} />
                <Route path="/KidsRecordingStudio" element={<KidsRecordingStudio />} />
                <Route path="/KidsZone" element={<KidsZone />} />
                <Route path="/kidszone" element={<KidsZone />} />

                <Route path="/RecordingsAdmin" element={<AdminGuard><RecordingsAdmin /></AdminGuard>} />
                
                <Route path="/CreativeCorner" element={<CreativeCorner />} />
                
                <Route path="/LearningLibrary" element={<LearningLibrary />} />
                <Route path="/LearningPaths" element={<LearningPaths />} />
                <Route path="/learningpaths" element={<LearningPaths />} />
                
                
                <Route path="/DrawingBoard" element={<DrawingBoard />} />
                
                <Route path="/PoetryWriting" element={<PoetryWriting />} />
                
                <Route path="/MonthlyContest" element={<MonthlyContest />} />
                
                <Route path="/IslamicEncyclopedia" element={<IslamicEncyclopedia />} />
                
                <Route path="/AudioTafsir" element={<AudioTafsir />} />
                
                <Route path="/IslamicFacts" element={<IslamicFacts />} />
                
                <Route path="/Worksheets" element={<Worksheets />} />
                
                <Route path="/AudioNew" element={<AudioNew />} />
                
                <Route path="/Hadith" element={<Hadith />} />
                
                <Route path="/History" element={<History />} />
                
                <Route path="/Tajweed" element={<Tajweed />} />
                
                <Route path="/PrintableQuizzes" element={<PrintableQuizzes />} />
                
                <Route path="/Multimedia" element={<Multimedia />} />
                
                <Route path="/FullQuran" element={<FullQuran />} />
                <Route path="/fullquran" element={<FullQuran />} />
                <Route path="/Quran" element={<FullQuran />} />
                <Route path="/quran" element={<FullQuran />} />
                <Route path="/AdminReciters" element={<AdminReciters />} />
                <Route path="/QuranDictionary" element={<QuranDictionary />} />
                <Route path="/dictionary" element={<QuranDictionary />} />
                <Route path="/Manzil" element={<Manzil />} />
                <Route path="/Hizb" element={<Hizb />} />
                <Route path="/HifzDashboard" element={<HifzDashboard />} />
                
                <Route path="/ResetPointsAdmin" element={<ResetPointsAdmin />} />
                
                <Route path="/AdminLogin" element={<AdminLogin />} />
                {/* Lowercase aliases for convenience */}
                <Route path="/adminlogin" element={<AdminLogin />} />
                
                <Route path="/AdminDashboard" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
                <Route path="/admindashboard" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
                <Route path="/AdminSettings" element={<AdminGuard><AdminSettings /></AdminGuard>} />
                
                <Route path="/AdminStories" element={<AdminGuard><AdminStories /></AdminGuard>} />
                
                <Route path="/AdminAudio" element={<AdminGuard><AdminAudio /></AdminGuard>} />
                
                <Route path="/AdminMedia" element={<AdminGuard><AdminMedia /></AdminGuard>} />
                
                <Route path="/PrivacyPolicy" element={<PrivacyPolicy />} />
                
                <Route path="/Challenges" element={<Challenges />} />
                
                <Route path="/AdminQuestions" element={<AdminGuard><AdminQuestions /></AdminGuard>} />
                
                <Route path="/Videos" element={<Videos />} />
                
                <Route path="/AdminVideos" element={<AdminGuard><AdminVideos /></AdminGuard>} />
                
                <Route path="/AdminAudioContent" element={adminAudioContentElement} />
                
                <Route path="/AdminUsers" element={<AdminGuard><AdminUsers /></AdminGuard>} />
                
                <Route path="/DeleteAccount" element={<DeleteAccount />} />
                
                
                <Route path="/AdminBanners" element={<AdminGuard><AdminBanners /></AdminGuard>} />
                <Route path="/AdminSponsors" element={<AdminGuard><AdminSponsors /></AdminGuard>} />
                <Route path="/adminsponsors" element={<AdminGuard><AdminSponsors /></AdminGuard>} />
                
                <Route path="/AdminStoryBuilder" element={<AdminGuard><AdminStoryBuilder /></AdminGuard>} />
                
                <Route path="/AdminGameSettings" element={<AdminGuard><AdminGameSettings /></AdminGuard>} />
                <Route path="/AdminSurahSequences" element={<AdminGuard><AdminSurahSequences /></AdminGuard>} />
                <Route path="/AdminWuduSteps" element={<AdminGuard><AdminWuduSteps /></AdminGuard>} />
                <Route path="/AdminProphetClues" element={<AdminGuard><AdminProphetClues /></AdminGuard>} />
                
                <Route path="/AdminMessages" element={<AdminGuard><AdminMessages /></AdminGuard>} />
                
                <Route path="/Quizzes" element={<Quizzes />} />
                
                <Route path="/AdminQuizManager" element={<AdminQuizManager />} />
                {/* Signup routes and legacy Signin redirects */}
                <Route path="/signup" element={<QuizSignup />} />
                <Route path="/Signup" element={<QuizSignup />} />
                <Route path="/Signin" element={<QuizSignup />} />
                <Route path="/signin" element={<QuizSignup />} />
                <Route path="/QuizSignup" element={<QuizSignup />} />
                <Route path="/quizsignup" element={<QuizSignup />} />
                {/* Login routes */}
                <Route path="/Login" element={<Login />} />
                <Route path="/login" element={<Login />} />
                <Route path="/ChildProgress" element={<ChildProgress />} />
                <Route path="/childprogress" element={<ChildProgress />} />
                <Route path="/Alarm" element={<Alarm />} />
                <Route path="/alarm" element={<Alarm />} />
                <Route path="/Competition" element={<Competition />} />
                <Route path="/WhatsAppChannel" element={<WhatsAppChannel />} />
                
                <Route path="*" element={<Home />} />
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return <PagesContent />;
}
import AdminSurahSequences from "./AdminSurahSequences";
import AdminWuduSteps from "./AdminWuduSteps";
import AdminProphetClues from "./AdminProphetClues";
