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
5. Environment variables:
   - `NODE_VERSION=22`
   - Secret `GEMINI_API_KEY` để bật AI nhập nhanh và OCR hóa đơn.
   - `GEMINI_MODEL=gemini-2.0-flash` nếu muốn cố định model.
6. Bindings:
   - D1 binding `DB` -> database `chiakeo-db`
7. Save and Deploy.

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
