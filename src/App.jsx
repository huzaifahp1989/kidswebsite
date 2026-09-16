import './App.css'
import { useEffect } from 'react'
import Pages from "@/pages/index.jsx"
import { Toaster } from "@/components/ui/toaster"
import PlatformLinksMenu from "@/components/PlatformLinksMenu"
import StayUpdatedPrompt from "@/components/StayUpdatedPrompt"
import AnalyticsListener from "@/components/AnalyticsListener"
import { watchAuth } from '@/api/firebase'
import { enableWtnFirebaseAnalytics } from '@/utils/androidWebView'
import { identifyAnalyticsUser, initAnalytics } from '@/utils/analytics'
import { trackDonationReturnAndMaybeReview, triggerInAppReview } from '@/utils/inAppReview'
import {
  initOneSignal,
  promptPushNotification,
  resetPushPromptDismissal,
  syncOneSignalUser,
} from '@/utils/oneSignal'

function App() {
  useEffect(() => {
    if (import.meta.env.DEV) {
      window.openPlayStoreReview = () => {
        localStorage.removeItem('review_last_prompt_at');
        localStorage.removeItem('review_session_date');
        triggerInAppReview('dev_test');
      };
      window.showStayUpdatedPopup = () => {
        localStorage.removeItem('stay_updated_prompt_dismissed_at');
        window.dispatchEvent(new Event('force-stay-updated-prompt'));
      };
      window.testPushNotification = () => {
        resetPushPromptDismissal();
        return promptPushNotification({ force: true, skipCooldown: true });
      };
    }

    enableWtnFirebaseAnalytics();
    initAnalytics();

    let stopAuthWatch = () => {};
    // Treat returning from the external donation site as a completed donation journey.
    const handleAppReturn = () => trackDonationReturnAndMaybeReview();
    window.addEventListener('focus', handleAppReturn);
    document.addEventListener('visibilitychange', handleAppReturn);

    // Track signed-in users in Analytics (works with or without OneSignal)
    const stopUserWatch = watchAuth((user) => {
      if (user?.uid || user?.id) {
        identifyAnalyticsUser(user.uid || user.id);
      }
    });

    initOneSignal().then((ready) => {
      if (!ready) return;
      stopAuthWatch = watchAuth((user) => {
        syncOneSignalUser(user);
      });
    });

    return () => {
      window.removeEventListener('focus', handleAppReturn);
      document.removeEventListener('visibilitychange', handleAppReturn);
      stopAuthWatch();
      stopUserWatch?.();
    };
  }, []);

  return (
    <>
      <Pages />
      <AnalyticsListener />
      <Toaster />
      <PlatformLinksMenu />
      <StayUpdatedPrompt />
    </>
  )
}

export default App
