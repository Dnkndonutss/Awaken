# Production deployment

Awaken is hosted by Vercel at <https://awaken-tawny.vercel.app> and connected to the `Dnkndonutss/Awaken` GitHub repository. Vercel treats `main` as the production branch.

## Environment variables

Vercel stores the following values in its encrypted Production environment. Never commit their values to Git:

- `NEXT_PUBLIC_SUPABASE_URL`: public Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: public browser key; database access remains protected by RLS.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only and used only by verified account deletion.
- `GEMINI_API_KEY`: server-only and used by the XP suggestion route.

Only variables intentionally prefixed with `NEXT_PUBLIC_` may be included in browser bundles. After changing a public variable, redeploy so Next.js can inline the new value.

## Supabase Auth URLs

Authentication → URL Configuration in the connected Supabase project must contain:

- Site URL: `https://awaken-tawny.vercel.app`
- Production redirect: `https://awaken-tawny.vercel.app/auth/callback`
- Local redirect: `http://localhost:3000/auth/callback`

Keep the exact production callback instead of a broad production wildcard. Password recovery appends its destination as a query parameter to this callback.

## Publishing updates

1. Pull the latest `main` branch and make the change on a feature branch.
2. Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.
3. Review database changes separately. Back up Supabase before any destructive migration and never rewrite an already deployed migration.
4. Merge or push the reviewed commit to `main`.
5. Vercel automatically builds and promotes the commit to the production URL.
6. Open the production URL and smoke-test the changed flow. For authentication changes, also test account recovery with a newly requested link.

For an intentional manual redeploy from a linked checkout, run `npx vercel@latest deploy --prod`. Environment values can be reviewed in Vercel Project Settings without exposing them in source control.

## Phone installation

The application manifest is served at `/manifest.webmanifest`. Installable icons are in `public/`, and the app runs in standalone display mode when added to a phone home screen.
