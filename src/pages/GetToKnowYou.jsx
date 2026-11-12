import { UserRoundCheck } from "lucide-react";
import GetToKnowYouForm from "@/components/GetToKnowYouForm";
import { markAppUserProfileSubmitted } from "@/utils/appUsers";

export default function GetToKnowYou() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-800 to-indigo-600 text-white shadow-lg">
            <UserRoundCheck className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Get to know you
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
            Please fill in this form so we can know our app users.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-lg sm:rounded-3xl">
          <GetToKnowYouForm
            source="page"
            submitLabel="Submit"
            onSubmitted={markAppUserProfileSubmitted}
          />
        </div>
      </div>
    </div>
  );
}
