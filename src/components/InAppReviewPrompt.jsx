import { useEffect, useState } from "react";
import { Star, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  dismissReviewPromptForLonger,
  markReviewPromptShown,
  PLAY_STORE_URL,
  registerReviewPromptHandler,
} from "@/utils/inAppReview";

export default function InAppReviewPrompt() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    return registerReviewPromptHandler((reason) => {
      markReviewPromptShown(reason);
      setOpen(true);
    });
  }, []);

  if (!open) return null;

  const handleRate = () => {
    setOpen(false);
    window.open(PLAY_STORE_URL, "_blank", "noopener,noreferrer");
  };

  const handleLater = () => {
    dismissReviewPromptForLonger();
    setOpen(false);
  };

  return (
    <div
      className="fixed inset-0 z-[10001] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-prompt-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70"
        aria-label="Close review prompt"
        onClick={handleLater}
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl border bg-white p-6 shadow-2xl">
        <button
          type="button"
          onClick={handleLater}
          className="absolute right-4 top-4 rounded-sm text-gray-400 hover:text-gray-600"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500">
          <Star className="h-7 w-7 fill-white text-white" />
        </div>

        <h2 id="review-prompt-title" className="text-center text-xl font-bold text-gray-900">
          Enjoying Islam Media Central?
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Your feedback helps us improve Islamic learning activities for kids and families.
        </p>

        <div className="mt-6 flex flex-col gap-2">
          <Button
            onClick={handleRate}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
          >
            Rate on Play Store
            <ExternalLink className="ml-2 h-4 w-4" />
          </Button>
          <Button variant="ghost" onClick={handleLater} className="w-full">
            Maybe later
          </Button>
        </div>
      </div>
    </div>
  );
}
