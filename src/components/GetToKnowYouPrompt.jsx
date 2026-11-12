import { useEffect, useState } from "react";
import { UserRoundCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import GetToKnowYouForm from "@/components/GetToKnowYouForm";
import {
  hasDismissedAppUserPrompt,
  hasSubmittedAppUserProfile,
  markAppUserProfileSubmitted,
  markAppUserPromptDismissed,
} from "@/utils/appUsers";

const SHOW_DELAY_MS = 4500;

/**
 * Auto popup asking new users to tell us about themselves. Shown once per
 * device until submitted or dismissed; the same form is also available at
 * /get-to-know-you.
 */
export default function GetToKnowYouPrompt() {
  const [visible, setVisible] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (window.location.pathname.toLowerCase().startsWith("/admin")) return undefined;
    const timer = window.setTimeout(() => {
      if (!hasSubmittedAppUserProfile() && !hasDismissedAppUserPrompt()) setVisible(true);
    }, SHOW_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  const close = () => {
    markAppUserPromptDismissed();
    setVisible(false);
  };

  const handleSubmitted = () => {
    markAppUserProfileSubmitted();
    setSubmitted(true);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9997] flex items-center justify-center overflow-y-auto px-2 py-3 sm:px-4 sm:py-4">
      <button
        type="button"
        onClick={close}
        className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
        aria-label="Close get to know you form"
      />
      <div className="relative z-10 my-auto max-h-[calc(100dvh-1.5rem)] w-[calc(100%-0.5rem)] max-w-md overflow-y-auto rounded-2xl border border-blue-100 bg-white shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:w-full sm:rounded-3xl">
        <div className="bg-gradient-to-r from-blue-800 via-blue-700 to-indigo-600 p-4 text-white sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15">
                <UserRoundCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-base font-bold">Get to know you</p>
                <p className="mt-1 text-sm text-blue-50">
                  Help us understand who uses Islam Media Central.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={close}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <GetToKnowYouForm source="app-prompt" submitLabel="Submit" onSubmitted={handleSubmitted} />

        <div className="px-4 pb-4 sm:px-5 sm:pb-5">
          {submitted ? (
            <Button type="button" onClick={close} className="w-full bg-blue-700 hover:bg-blue-600">
              Close
            </Button>
          ) : (
            <button
              type="button"
              onClick={close}
              className="w-full text-center text-sm font-medium text-slate-500 hover:text-slate-800"
            >
              Not now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
