# Base44 App


This app was created automatically by Base44.
It's a Vite+React app that communicates with the Base44 API.

## Running the app

```bash
npm install
npm run dev
```

## Building the app

```bash
npm run build
```

For more information and support, please contact Base44 support at app@base44.com.

## IMC Assistant setup

The assistant UI is available at `/assistant`; its admin tools are at `/AdminAssistant` for the configured administrator.

1. Run `supabase/imc-assistant.sql` in the Supabase SQL Editor.
2. Configure `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, and `IMC_ADMIN_EMAIL` as server-only environment variables in Vercel and in a local `.env.local` when developing the API. Do not use a `VITE_` prefix for secrets or commit the values.
3. The assistant uses OpenAI `text-embedding-3-small` embeddings (1536 dimensions) and `gpt-4o-mini` by default. `IMC_ASSISTANT_MODEL` can override the answer model.
4. Complete and review the seeded draft articles in the admin UI before publishing; drafts are not used to answer users.

Without the migration and explicit server secrets, the assistant intentionally returns an unavailable message rather than generating ungrounded answers. Apply a separate content/privacy retention policy for stored authenticated chat history and analytics events.