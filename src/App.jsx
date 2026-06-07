import './App.css'
import { useEffect } from 'react'
import Pages from "@/pages/index.jsx"
import { Toaster } from "@/components/ui/toaster"
import { triggerInAppReview } from '@/utils/inAppReview'

const FIVE_MINUTES = 5 * 60 * 1000;

function App() {
  useEffect(() => {
    const today = new Date().toDateString();
    const lastFired = localStorage.getItem('review_5min_date');
    if (lastFired === today) return;

    const timer = setTimeout(() => {
      localStorage.setItem('review_5min_date', today);
      triggerInAppReview();
    }, FIVE_MINUTES);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <Pages />
      <Toaster />
    </>
  )
}

export default App 
