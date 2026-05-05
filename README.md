# Sponbit Editorial CMS

Stack `React + Vite + Express + Postgres` cho một site editorial có dữ liệu thật, auth thật, admin thật, upload ảnh, và sẵn sàng để chuyển sang bước deploy.

## Stack

- `React`
- `Vite`
- `react-router-dom`
- `lucide-react`
- `Express`
- `Postgres`
- `Docker Compose`

## Cấu trúc chính

- `src/App.jsx`: route cho homepage, section, topic, story, admin
- `src/context/AuthContext.jsx`: lưu session client, gọi `signin/signup/me/signout`
- `src/context/SiteContext.jsx`: tải navigation/topic cloud từ API
- `src/pages/AdminPage.jsx`: CRUD cho `sections`, `topics`, `stories`
- `src/pages/AuthPage.jsx`: giao diện `signin/signup`
- `src/components/*`: các block giao diện editorial tái sử dụng
- `server/index.js`: REST API public + auth + admin
- `server/contentService.js`: logic đọc/ghi dữ liệu từ Postgres
- `server/authService.js`: hash password, token ký HMAC và xác thực user
- `server/sql/init.sql`: schema và seed dữ liệu ban đầu
- `docker-compose.yml`: chạy `web + api + postgres`

## Chạy bằng Docker

```bash
cd /Users/legiang/Desktop/GTE/spy
npm run docker:up
```

Sau khi chạy:

- Frontend: `http://localhost:4173`
- Sign in: `http://localhost:4173/signin`
- Sign up: `http://localhost:4173/signup`
- Admin: `http://localhost:4173/admin`
- API: `http://localhost:4000/api/health`

Tài khoản admin không còn được hiển thị ở UI. API sẽ seed admin từ biến môi trường `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` khi khởi động lần đầu.

Dừng stack:

```bash
cd /Users/legiang/Desktop/GTE/spy
npm run docker:down
```

## Chạy local không dùng Docker

Terminal 1:

```bash
cd /Users/legiang/Desktop/GTE/spy
npm run dev:api
```

Terminal 2:

```bash
cd /Users/legiang/Desktop/GTE/spy
npm run dev
```

Khi chạy local không dùng Docker, hãy tạo Postgres trước và cấu hình biến môi trường theo `.env.example`.

## Triển khai và auth

- `POST /api/auth/signup`: user đăng ký thật với `email + password`, không yêu cầu verify email.
- `POST /api/auth/signin`: đăng nhập thật và nhận bearer token.
- `Signup UI`: yêu cầu nhập mật khẩu 2 lần ở frontend để tránh sai sót.
- `Admin`: được seed từ server config, không hiện tài khoản mặc định ở frontend.
- `Production`: bắt buộc cấu hình `AUTH_TOKEN_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` trước khi boot API.

## Auth và phân quyền

- `POST /api/auth/signup`: tạo tài khoản mới với role `editor`
- `POST /api/auth/signin`: đăng nhập và nhận bearer token
- `GET /api/auth/me`: kiểm tra session hiện tại
- Toàn bộ `/api/admin/*` yêu cầu đăng nhập và role `admin`
- Tài khoản `editor` vẫn đăng nhập được nhưng sẽ không vào được trang `/admin`

## Build frontend

```bash
cd /Users/legiang/Desktop/GTE/spy
npm run build
```

## Đồng bộ dữ liệu mới từ feed ngoài

Nếu muốn xóa dữ liệu story cũ trong DB hiện tại và thay bằng feed metadata mới từ nguồn ngoài, chạy:

```bash
cd /Users/legiang/Desktop/GTE/spy
npm run sync:external
```

Lệnh này sẽ:

- xóa `stories`, `topics`, `sections` hiện tại
- tạo lại cấu trúc section/topic theo hướng editorial thật hơn
- import các bài mới từ feed ngoài đã cấu hình
- chỉ lưu metadata có dẫn nguồn (`title`, `author`, `date`, `image`, `source_url`) thay vì sao chép toàn văn bài gốc

Muốn kiểm tra trước khi ghi DB:

```bash
cd /Users/legiang/Desktop/GTE/spy
node scripts/sync-brit-co-feed.mjs --dry-run
```

## Deploy với Caddy + domain thật

Nếu trước đây bạn dùng `nginx` để nối domain, repo này giờ đã có sẵn cấu hình `Caddy` riêng cho server.

Các file liên quan:

- `Caddyfile`
- `docker-compose.prod.yml`

### 1. Chuẩn bị `.env`

Tạo file `.env` trên server từ `.env.example`, rồi điền giá trị thật:

```dotenv
DB_NAME=sponbit
DB_USER=sponbit
DB_PASSWORD=YOUR_STRONG_DB_PASSWORD
APP_DOMAIN=yourdomain.com
AUTH_TOKEN_SECRET=YOUR_LONG_RANDOM_SECRET
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=YOUR_STRONG_ADMIN_PASSWORD
ADMIN_NAME=Sponbit Admin
```

### 2. Chạy stack production

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Production compose dùng `server/sql/schema.sql`, nên DB production mới sẽ chỉ tạo schema và tài khoản admin seed từ server, **không tự đổ dữ liệu demo**.

### 3. Caddy làm gì trong repo này

- `https://yourdomain.com` -> proxy tới `web:4173`
- `https://yourdomain.com/api/*` -> proxy tới `api:4000`
- `https://www.yourdomain.com` -> redirect về domain chính

### 4. Trỏ Namecheap

Trong `Namecheap -> Domain List -> Manage -> Advanced DNS`:

- `A Record` — `Host: @` — `Value: YOUR_SERVER_IP`
- `A Record` — `Host: www` — `Value: YOUR_SERVER_IP`

Sau khi DNS trỏ đúng, Caddy sẽ tự xin SSL cho domain.

### 5. Kiểm tra sau khi deploy

```bash
curl -I http://yourdomain.com
curl -I https://yourdomain.com
curl -s https://yourdomain.com/api/health
```

Nếu SSL chưa lên ngay, chờ DNS propagate thêm vài phút rồi kiểm tra lại log Caddy:

```bash
docker compose -f docker-compose.prod.yml logs -f caddy
```

### 6. Nếu production DB đã lỡ có dữ liệu mẫu

Việc đổi sang `schema.sql` chỉ áp dụng cho **database volume mới**. Nếu bạn đã khởi động production trước đó bằng `server/sql/init.sql`, dữ liệu mẫu đã nằm sẵn trong volume Postgres hiện tại và sẽ không tự mất đi.

Bạn có 2 cách:

- xóa volume Postgres production để khởi tạo lại DB sạch
- hoặc tự xóa dữ liệu demo trong Postgres rồi giữ lại user/admin hiện tại

## Checklist trước deploy

- Cập nhật `.env` với `AUTH_TOKEN_SECRET` mạnh và credential admin riêng.
- Kiểm tra volume media nếu dùng Docker để ảnh upload được giữ lại.
- Chạy `npm run build` cho frontend và smoke test `GET /api/health` cho API.
- Nếu deploy production, đảm bảo `ADMIN_EMAIL` và `ADMIN_PASSWORD` đã được thiết lập trước khi API khởi động lần đầu.

## Ghi chú

- `docker compose up --build -d` đã được smoke test thành công với `web`, `api`, `db`.
- API public hiện có các endpoint chính: `/api/navigation`, `/api/home`, `/api/sections/:sectionKey`, `/api/sections/:sectionKey/topics/:topicSlug`, `/api/stories/:storyId`.
- API auth hiện có: `/api/auth/signup`, `/api/auth/signin`, `/api/auth/me`, `/api/auth/signout`.
- Admin CRUD hiện hỗ trợ quản lý `sections`, `topics`, `stories` để thay đổi dữ liệu thật và phản ánh ra giao diện; quyền admin được kiểm tra cả ở UI lẫn backend.
