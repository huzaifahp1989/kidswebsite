import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Loader2,
  MapPin,
  Send,
  User,
} from "lucide-react";
import {
  HEARD_ABOUT_OPTIONS,
  MAX_AGE,
  MAX_CITY_LENGTH,
  MAX_NAME_LENGTH,
  MIN_AGE,
  validateAppUserInput,
} from "@/utils/appUsers";

const initialForm = { fullName: "", age: "", city: "", heardAbout: "" };

/**
 * The "get to know our users" form. Shared by the auto popup and the
 * standalone /get-to-know-you page so both stay identical.
 */
export default function GetToKnowYouForm({
  source = "app-prompt",
  submitLabel = "Submit",
  onSubmitted,
}) {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const update = (key) => (event) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    const invalid = validateAppUserInput(form);
    if (invalid) {
      setError(invalid);
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/app-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, source }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Something went wrong. Please try again.");
      setDone(true);
      onSubmitted?.();
    } catch (e) {
      setError(e?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="p-6 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
        <h2 className="mt-3 text-xl font-bold text-slate-900">Jazak Allah Khair!</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Thank you for telling us about yourself. Your answers help us make Islam Media
          Central better for everyone.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 sm:p-5">
      <p className="text-sm leading-6 text-slate-700">
        Please fill in this form so we can know our app users.
      </p>

      <div>
        <Label htmlFor="gtk-name">Full name</Label>
        <Input
          id="gtk-name"
          value={form.fullName}
          onChange={update("fullName")}
          maxLength={MAX_NAME_LENGTH}
          autoComplete="name"
          placeholder="e.g. Abdullah Ahmed"
          className="text-base sm:text-sm"
        />
      </div>

      <div>
        <Label htmlFor="gtk-age">Age</Label>
        <Input
          id="gtk-age"
          type="number"
          inputMode="numeric"
          min={MIN_AGE}
          max={MAX_AGE}
          value={form.age}
          onChange={update("age")}
          placeholder="e.g. 24"
          className="text-base sm:text-sm"
        />
      </div>

      <div>
        <Label htmlFor="gtk-city">City</Label>
        <div className="relative">
          <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            id="gtk-city"
            value={form.city}
            onChange={update("city")}
            maxLength={MAX_CITY_LENGTH}
            autoComplete="address-level2"
            placeholder="e.g. Birmingham"
            className="pl-9 text-base sm:text-sm"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="gtk-heard">
          <span className="inline-flex items-center gap-1.5">
            <HelpCircle className="h-3.5 w-3.5" />
            How did you hear about the app?
          </span>
        </Label>
        <select
          id="gtk-heard"
          value={form.heardAbout}
          onChange={update("heardAbout")}
          className="mt-1.5 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base shadow-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200 sm:text-sm"
        >
          <option value="">Please choose…</option>
          {HEARD_ABOUT_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Button
        type="submit"
        disabled={submitting}
        className="h-11 w-full gap-2 bg-gradient-to-r from-blue-700 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-500"
      >
        {submitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
        {submitting ? "Sending…" : submitLabel}
      </Button>
    </form>
  );
}
