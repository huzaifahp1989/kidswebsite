import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import CommunityWorshipTabs from "@/components/CommunityWorshipTabs";
import { createPageUrl } from "@/utils";

/**
 * The community worship tracker lives on its own page so the home screen only
 * needs a single "Juz · Durood · Pledge" tab to reach it.
 */
export default function JuzDurood() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <Link
        to={createPageUrl("Home")}
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#1e3a8a] transition hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to home
      </Link>

      <header className="mb-3">
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
          Juz · Durood · Pledge
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Send durood, recite your juz and pledge your Qur&apos;an share with the community.
        </p>
      </header>

      <section id="juz-durood-tracker" className="scroll-mt-32">
        <CommunityWorshipTabs />
      </section>
    </div>
  );
}
