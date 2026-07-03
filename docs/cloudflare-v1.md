# Cloudflare v1 deploy

V1 deploy frontend len Cloudflare Pages. Du lieu van nam trong browser
`localStorage`. Link share duoc tao theo dang snapshot, co nhung du lieu can xem
ngay trong URL.

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
6. Save and Deploy.

File `public/_redirects` da cau hinh SPA fallback de `/share/:token` chay duoc
tren Pages.

## Cach 2: Wrangler deploy tu local

Dang nhap Cloudflare:

```bash
npx wrangler login
```

Neu Pages project `chia-keo` chua ton tai, tao truoc trong Cloudflare Dashboard
hoac chay:

```bash
npx wrangler pages project create chia-keo --production-branch main
```

Deploy:

```bash
npm run cloudflare:deploy
```

## Cach 3: GitHub Actions

Dung workflow `.github/workflows/deploy-pages.yml`.

Them repo secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Khi push len branch `main`, GitHub Actions se build va deploy `dist` len
Cloudflare Pages project `chia-keo`.

## Gioi han v1

- Chua co Worker API.
- Chua co D1 database.
- Login chi la local UI, chua co auth that.
- Link share la snapshot, khong tu cap nhat neu nguoi tao sua data sau do.
