import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const ORGANISER = 'Islam Media Central';
const CONTACT_EMAIL = 'imedia786@gmail.com';
const WEBSITE_URL = import.meta.env.VITE_SITE_URL || 'https://islammediacentral.com';
const PROMOTER_COUNTRY = 'United Kingdom';

function formatDate(value) {
  if (!value) return null;
  try {
    return new Date(value).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return null;
  }
}

function Section({ title, children }) {
  return (
    <section className="border-t border-slate-200 py-5 first:border-t-0 first:pt-0">
      <h2 className="text-base font-extrabold text-[#0f2a5f]">{title}</h2>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-slate-700">{children}</div>
    </section>
  );
}

export default function SurveyTerms() {
  const [campaign, setCampaign] = React.useState(null);
  const [prizes, setPrizes] = React.useState([]);
  const [loadedAt] = React.useState(() => new Date());

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/survey');
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        setCampaign(json?.campaign || null);
        setPrizes(Array.isArray(json?.prizes) ? json.prizes : []);
      } catch {
        /* terms fall back to generic wording */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const opensAt = formatDate(campaign?.opensAt);
  const closesAt = formatDate(campaign?.closesAt);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EFF6FF] via-white to-[#DBEAFE]">
      <header className="bg-gradient-to-r from-[#0f2a5f] via-[#123b7a] to-[#0b2454] text-white shadow-lg">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3.5">
          <Link
            to={createPageUrl('Home')}
            className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
          >
            <span className="text-2xl md:text-3xl">🌙</span>
            <span className="leading-tight">
              <span className="block text-sm font-extrabold tracking-tight md:text-base">
                Islam Media Central
              </span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
                Competition Terms
              </span>
            </span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-20 pt-6">
        <div className="rounded-2xl border border-[#0f2a5f]/10 bg-white p-5 shadow-sm sm:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0f2a5f]/60">
            Prize draw terms &amp; conditions
          </p>
          <h1 className="mt-1 text-2xl font-extrabold text-[#0f2a5f]">
            {campaign?.title || 'Have Your Say & Win Prizes!'}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Please read these terms carefully before entering. Entry is free and no purchase is
            necessary.
          </p>

          <div className="mt-6">
            <Section title="1. Promoter">
              <p>
                This prize draw is promoted by {ORGANISER} ({PROMOTER_COUNTRY}) — {WEBSITE_URL}.
                You can contact us at{' '}
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="font-bold text-[#0f2a5f] underline decoration-dotted underline-offset-2"
                >
                  {CONTACT_EMAIL}
                </a>
                .
              </p>
            </Section>

            <Section title="2. Opening and closing dates">
              <p>
                The prize draw {opensAt ? `opens on ${opensAt}` : 'opens when the survey goes live'}
                {closesAt ? ` and closes at 23:59 (UK time) on ${closesAt}` : ' and closes when the survey closes'}.
              </p>
              <p>
                Entries received after the closing date will not be accepted. We may extend or
                shorten the promotion period where necessary and will update this page if we do.
              </p>
            </Section>

            <Section title="3. Eligibility">
              <p>
                The prize draw is open to residents of the {PROMOTER_COUNTRY} aged 18 or over.
                Entrants under 18 may only take part with the consent of a parent or guardian, and
                the entry must be submitted by that parent or guardian on their behalf.
              </p>
              <p>
                Employees of {ORGANISER} and their immediate families, and anyone professionally
                connected with this promotion, are not eligible to enter.
              </p>
              <p>
                By entering you confirm that all information you provide is accurate and that you
                meet these eligibility requirements.
              </p>
            </Section>

            <Section title="4. How to enter">
              <p>
                Entry is free. To enter, complete the survey on this website and submit the prize
                draw entry form with your first name, email address and age confirmation. No purchase
                or payment is required, and no subscription of any kind is necessary.
              </p>
              <p>
                Completion of the survey is required to enter, but it is not a condition of entry
                that you agree to receive marketing communications.
              </p>
            </Section>

            <Section title="5. The prizes">
              {prizes.length > 0 ? (
                <ul className="list-disc space-y-1.5 pl-5">
                  {prizes.map((p) => (
                    <li key={p.id}>
                      <span className="font-semibold text-slate-800">{p.title}</span>
                      {p.valueLabel ? ` — ${p.valueLabel}` : ''}
                      {p.description ? `. ${p.description}` : ''}{' '}
                      <span className="text-slate-500">
                        ({p.winnersCount || 1} winner{(p.winnersCount || 1) === 1 ? '' : 's'})
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>
                  Prizes consist of a takeaway gift voucher, an Amazon gift voucher, and a
                  personalised Islam Media Central mug and keyring. Prize details and values are
                  shown on the survey page.
                </p>
              )}
              <p>
                Prizes are as described and are non-transferable. No cash alternative is available.
                If a prize becomes unavailable for reasons beyond our control we may substitute a
                prize of equal or greater value.
              </p>
            </Section>

            <Section title="6. How winners are selected">
              <p>
                Winners are selected at random from all eligible entries received before the closing
                date, using a cryptographically secure random selection process. Each eligible entry
                has an equal chance of being drawn.
              </p>
              <p>
                The number of winners for each prize is shown on the survey page and may be limited
                overall. The selection is recorded with the date and time it took place. No member of
                staff can choose, weight or exclude a particular entrant.
              </p>
            </Section>

            <Section title="7. How winners are notified">
              <p>
                Winners will be contacted using the email address provided at the time of entry,
                normally within 14 days of the closing date. Notification will include details of how
                to claim the prize.
              </p>
            </Section>

            <Section title="8. Claiming a prize">
              <p>
                If you are a winner, you must respond within 14 days of being notified. We may ask for
                proof of identity and, where relevant, proof of eligibility or parental consent
                before releasing a prize.
              </p>
            </Section>

            <Section title="9. If a winner cannot be contacted">
              <p>
                If a winner cannot be contacted, does not respond within the claim period, or is not
                eligible, we reserve the right to withdraw the prize and select a replacement winner
                at random from the remaining eligible entries under the same process.
              </p>
            </Section>

            <Section title="10. Repeat entries">
              <p>
                Only one entry per person and per email address is permitted. Duplicate, automated,
                bulk, third-party or fraudulent entries will be disqualified, and we may use
                technical measures to detect and prevent them.
              </p>
            </Section>

            <Section title="11. How we use and retain your information">
              <p>
                We collect your first name, email address, age confirmation and, for under-18
                entrants, a parent or guardian email address, together with your survey answers. This
                information is used to administer the prize draw, verify eligibility, contact winners
                and understand how to improve {ORGANISER}. It is processed in accordance with our
                privacy policy.
              </p>
              <p>
                Providing your details is necessary to enter the prize draw. If you also opt in to
                marketing emails, we will use your email address to send you news, updates and
                promotions; you can withdraw that consent at any time using the unsubscribe link in
                any email. Marketing consent is entirely optional and is never a condition of entry.
              </p>
              <p>
                Entry details are retained for up to{' '}
                {campaign?.retentionMonths || 12} months after the prize draw closes, after which they
                are deleted or anonymised, except where we are required to keep records for legal or
                accounting purposes.
              </p>
            </Section>

            <Section title="12. General">
              <p>
                We reserve the right to cancel, suspend or amend this prize draw where it is
                necessary to do so. Our decision on all matters relating to the promotion is final.
                This promotion is not sponsored, endorsed or administered by any third-party brand
                named as a prize, and those brands are not associated with it in any way.
              </p>
              <p>
                Nothing in these terms affects your statutory rights as a consumer.
              </p>
            </Section>

            <Section title="13. Contact">
              <p>
                Questions about this prize draw? Email{' '}
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="font-bold text-[#0f2a5f] underline decoration-dotted underline-offset-2"
                >
                  {CONTACT_EMAIL}
                </a>{' '}
                or visit {WEBSITE_URL}.
              </p>
            </Section>
          </div>

          <p className="mt-4 text-[11px] text-slate-500">
            Version {campaign?.termsVersion || 'v1'} · Page generated {loadedAt.toLocaleDateString('en-GB')}
          </p>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Link
              to={createPageUrl('Survey')}
              className="rounded-xl bg-gradient-to-r from-[#123b7a] to-[#0f2a5f] px-5 py-3 text-center text-sm font-extrabold text-white shadow-md hover:shadow-lg"
            >
              Back to the survey
            </Link>
            <Link
              to={createPageUrl('Home')}
              className="rounded-xl border border-slate-200 px-5 py-3 text-center text-sm font-bold text-slate-600 hover:bg-slate-50"
            >
              Islam Media Central home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
