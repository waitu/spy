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
