# Cloudflare deploy

Deploy frontend len Cloudflare Pages, Pages Functions xu ly API, D1 luu toan
bo du lieu ung dung.

## Cach 1: Cloudflare Pages Git integration

1. Push repo len GitHub.
2. Cloudflare Dashboard > Workers & Pages > Create application > Pages.
3. Chon Connect to Git, chon repo `chia-keo`.
4. Build settings:
   - Framework preset: `Vite`.
   - Build command: `pnpm build`.
   - Build output directory: `dist`.
   - Root directory: de trong hoac `/`.
   - Compatibility flag: `nodejs_compat` (Better Auth + Drizzle can Node builtins).
5. Environment variables:
   - `NODE_VERSION=22`
   - Secret `BETTER_AUTH_SECRET` (bat buoc) — chuoi ngau nhien du dai de ky
     session; thieu bien nay thi dang nhap/dang ky khong chay.
   - `ALLOWED_ORIGINS` (tuy chon) — danh sach origin FE duoc phep goi API,
     phan tach bang dau phay; chi can khi FE khac domain voi API.
   - Secret `GEMINI_API_KEY` (tuy chon) de bat AI nhap nhanh va OCR hoa don.
   - `GEMINI_MODEL=gemini-2.0-flash` (tuy chon) neu muon co dinh model.
6. Bindings:
   - D1 binding `DB` -> database `chiakeo-db`
7. Save and Deploy.

> App dang nhap bang email/password + username (Better Auth), khong dung Google
> OAuth. Khong can cac secret `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
> `GOOGLE_REDIRECT_URI`.

File `public/_redirects` da cau hinh SPA fallback de `/share/:token` chay duoc
tren Pages.

## Cach 2: Wrangler deploy tu local

Dang nhap Cloudflare:

```bash
npx wrangler login
```

Neu Pages project `chiakeo` chua ton tai, tao truoc trong Cloudflare Dashboard
hoac chay:

```bash
npx wrangler pages project create chiakeo --production-branch main
```

Deploy:

```bash
npm run cloudflare:deploy
```

`BETTER_AUTH_SECRET` bat buoc, set truoc khi deploy:

```bash
npx wrangler pages secret put BETTER_AUTH_SECRET --project-name chiakeo
```

Gemini cần cấu hình secret trước khi dùng AI trên production:

```bash
npx wrangler pages secret put GEMINI_API_KEY --project-name chiakeo
```

Chay migration D1:

```bash
npx wrangler d1 migrations apply chiakeo-db --remote
```

## Cach 3: GitHub Actions

Dung workflow `.github/workflows/deploy-pages.yml`.

Them repo secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Khi push len branch `main`, GitHub Actions se build va deploy `dist` len
Cloudflare Pages project `chiakeo`.

## Luu tru

- D1 `chiakeo-db`: users, sessions, games, participants, expenses, splits, receipts, share links, profile, mau chi tieu.
- Session phia browser dung HttpOnly cookie, khong luu token trong browser storage.
- Link share doc game live tu D1. Link quyen edit cap nhat truc tiep game trong D1.
