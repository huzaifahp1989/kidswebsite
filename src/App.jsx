import './App.css'
import { useEffect } from 'react'
import Pages from "@/pages/index.jsx"
import { Toaster } from "@/components/ui/toaster"
import InAppReviewPrompt from "@/components/InAppReviewPrompt"
import { trackSessionEngagementAndMaybeReview, triggerInAppReview } from '@/utils/inAppReview'

function App() {
  useEffect(() => {
    if (import.meta.env.DEV) {
      window.showReviewPopup = () => {
        localStorage.removeItem('review_last_prompt_at');
        localStorage.removeItem('review_session_date');
        triggerInAppReview('dev_test');
      };
    }
    return trackSessionEngagementAndMaybeReview();
  }, []);

  return (
    <>
      <Pages />
      <Toaster />
      <InAppReviewPrompt />
    </>
  )
}

export default App 
