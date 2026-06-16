This is the Nexora web app built with [Next.js](https://nextjs.org).

## Getting Started

1. Copy the env file:

```bash
cp .env.example .env.local
```

2. Update the backend API URL in `.env.local`.

3. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Environment

Required:

- `API_BASE_URL`
- `NEXT_PUBLIC_API_BASE_URL`

Production format:

- Set both values to the site root, for example `https://learn.yourdomain.com`
- Do not append `/api/v1` because the app already includes versioned API paths internally

Optional public onboarding location prefill:

- `PUBLIC_IP_GEO_ENDPOINT`
- `PUBLIC_IP_GEO_AUTH_HEADER`
- `PUBLIC_IP_GEO_AUTH_VALUE`
- `PUBLIC_IP_GEO_FIELD_MAP_JSON`

Example provider mapping:

```env
PUBLIC_IP_GEO_ENDPOINT=https://provider.example/lookup/{ip}
PUBLIC_IP_GEO_FIELD_MAP_JSON={"country":"country_name","state":"region","city":"city","pincode":"postal","timezone":"timezone"}
```

Notes:

- The location provider is intentionally env-driven and provider-agnostic.
- If the geo env values are empty, signup and profile completion continue normally without prefill.
- `{ip}` in the endpoint is replaced server-side when present.

## Verification

```bash
npm run typecheck
npm run build
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
