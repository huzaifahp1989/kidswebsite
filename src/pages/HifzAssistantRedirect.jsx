import { useEffect } from "react";
import { HIFZ_ASSISTANT_URL } from "@/constants/externalLinks";

export default function HifzAssistantRedirect() {
  useEffect(() => {
    window.location.replace(HIFZ_ASSISTANT_URL);
  }, []);

  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4 text-center">
      <p className="text-gray-600">Opening Quran Hifz Assistant...</p>
    </div>
  );
}
