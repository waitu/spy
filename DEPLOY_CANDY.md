# Deploy repo này lên Kendy/Candy từ đầu

Tài liệu này hướng dẫn theo đúng cấu trúc hiện tại của repo `spy`, với stack:

- `web` (`Vite` frontend, port `4173`)
- `api` (`Express` backend, port `4000`)
- `db` (`Postgres 16`)
- volume upload ảnh `uploads_data`

Lưu ý: dưới đây dùng tên `Kendy/Candy` vì cách gọi có thể khác nhau theo tài khoản hoặc giao diện bạn đang dùng. Ý chung là platform deploy nơi bạn kết nối Ubuntu server rồi chạy app từ Git repo hoặc Docker Compose.

## 1. Chuẩn bị Ubuntu server

SSH vào server:

```bash
ssh root@YOUR_SERVER_IP
```

Cập nhật hệ thống:

```bash
apt update && apt upgrade -y
```

Cài package cơ bản:

```bash
apt install -y curl git ca-certificates gnupg ufw
```

Mở firewall:

```bash
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw enable
ufw status
```

## 2. Cài Docker trên Ubuntu

```bash
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" > /etc/apt/sources.list.d/docker.list
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable docker
systemctl start docker
docker --version
docker compose version
```

## 3. Kết nối server vào Kendy/Candy

Vào dashboard Kendy/Candy và tìm mục kiểu như:

- `Add Server`
- `Connect Server`
- `Register Server`

Platform sẽ sinh **một lệnh riêng** để cài agent hoặc connector lên Ubuntu. Hãy copy lệnh đó và chạy trực tiếp trên server.

Ví dụ luồng làm việc:

1. mở `Kendy/Candy Dashboard`
2. chọn `New Server` hoặc `Connect Server`
3. copy command do platform cung cấp
4. paste vào terminal Ubuntu
5. chờ server hiện trạng thái `online`

Ghi chú: lệnh này phụ thuộc vào tài khoản/project của bạn nên không thể viết cứng sẵn trong repo.

## 4. Chọn cách deploy cho repo này

Repo này phù hợp nhất với **Docker Compose deployment**, vì đã có sẵn:

- `docker-compose.yml`
- service `web`
- service `api`
- service `db`
- volume `uploads_data`
- volume `postgres_data`

Nếu Kendy/Candy hỗ trợ deploy từ `docker-compose.yml`, hãy dùng đúng file đó.

Nếu platform không hỗ trợ Docker Compose đầy đủ, bạn sẽ phải tách app thành 3 service riêng.

## 5. Tạo application trong Kendy/Candy

Chọn kiểu deploy theo repo Git:

- Git provider: `GitHub`
- Repository: repo hiện tại `waitu/spy`
- Branch: `master`
- Compose file: `docker-compose.yml`

Nếu dashboard hỏi thư mục gốc, dùng root của repo.

## 6. Biến môi trường phải nhập

Nhập các biến môi trường sau trong Kendy/Candy:

```dotenv
DB_NAME=sponbit
DB_USER=sponbit
DB_PASSWORD=YOUR_STRONG_DB_PASSWORD
DB_PORT=5432
DB_HOST=db
PORT=4000
VITE_API_PROXY_TARGET=http://api:4000
AUTH_TOKEN_SECRET=YOUR_LONG_RANDOM_SECRET
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=YOUR_STRONG_ADMIN_PASSWORD
ADMIN_NAME=Sponbit Admin
```

Giải thích nhanh:

- `DB_HOST=db` vì trong Compose, backend nói chuyện với Postgres qua tên service `db`
- `VITE_API_PROXY_TARGET=http://api:4000` vì frontend gọi API qua service `api`
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` dùng để seed admin lần đầu

## 7. Volume cần bật

Hãy đảm bảo Kendy/Candy giữ nguyên các volume sau:

- `postgres_data` để giữ dữ liệu Postgres
- `uploads_data` để giữ ảnh upload

Nếu platform có UI mapping volume, hãy để đúng như trong `docker-compose.yml`.

## 8. Port và public access

Project này hiện dùng:

- `web`: `4173`
- `api`: `4000`
- `db`: `5432`

Trong production:

- chỉ nên public app qua `80` / `443`
- không public trực tiếp `5432`
- không nên public `4000` nếu platform đã có reverse proxy sẵn

Nếu Kendy/Candy có mục `Exposed Port` hoặc `Public Port`, chọn frontend app là cổng public chính.

## 9. Deploy lần đầu

Sau khi lưu repo + env vars + volumes:

1. bấm `Deploy`
2. chờ build image xong
3. chờ service `db`, `api`, `web` cùng lên trạng thái healthy/running

Sau deploy, hãy kiểm tra:

- app URL tạm mà Kendy/Candy cấp
- API health: `/api/health`
- trang `/signin`
- trang `/signup`

## 10. Smoke test sau deploy

Các test tối thiểu nên chạy:

- mở homepage
- vào `/signup`, tạo user mới thật
- vào `/signin`, đăng nhập thật
- đăng nhập admin seed
- vào `/admin`
- upload một ảnh trong story editor
- mở lại story để xác nhận ảnh còn tồn tại

## 11. Nối domain Namecheap sau khi app đã chạy

Chỉ làm bước domain sau khi app đã deploy ổn bằng URL tạm.

Trong Kendy/Candy, tìm mục:

- `Domains`
- `Custom Domain`
- `Add Domain`

Thêm domain:

- `yourdomain.com`
- `www.yourdomain.com`

Sau đó xem platform yêu cầu gì:

### Trường hợp A: platform cho IP server

Vào Namecheap -> `Advanced DNS`:

- `A Record` — Host: `@` — Value: `SERVER_IP`
- `A Record` — Host: `www` — Value: `SERVER_IP`

### Trường hợp B: platform cho hostname

Vào Namecheap -> `Advanced DNS`:

- `CNAME Record` — Host: `www` — Value: `hostname-do-platform-cap`

Với root domain `@`, tùy platform:

- dùng `A Record` nếu họ cung cấp IP
- hoặc redirect `@ -> www`
- hoặc dùng cách riêng do platform hướng dẫn

### Trường hợp C: platform yêu cầu đổi nameserver

Vào Namecheap -> `Domain` -> `Nameservers` -> `Custom DNS`, rồi nhập nameserver do Kendy/Candy cung cấp.

## 12. SSL / HTTPS

Phần lớn platform sẽ tự cấp SSL sau khi DNS trỏ đúng.

Sau khi trỏ domain:

- chờ DNS propagate
- quay lại dashboard Kendy/Candy
- chờ trạng thái `SSL ready`, `HTTPS active`, hoặc tương tự

Kiểm tra:

```bash
dig yourdomain.com
dig www.yourdomain.com
```

Và test bằng trình duyệt:

- `https://yourdomain.com`
- `https://www.yourdomain.com`

## 13. Checklist production cho repo này

Trước khi public chính thức:

- dùng `AUTH_TOKEN_SECRET` mạnh
- dùng `ADMIN_PASSWORD` mạnh
- không để Postgres public ra internet
- xác nhận volume `uploads_data` tồn tại
- xác nhận volume `postgres_data` tồn tại
- test signup/signin/admin
- test upload ảnh
- test reload container mà dữ liệu vẫn còn

## 14. Điều quan trọng cần biết

Repo hiện tại đã chạy được với Docker và Docker Compose, nhưng container vẫn đang thiên về runtime kiểu dev (`vite dev`, `nodemon`).

Nghĩa là:

- **có thể deploy để chạy**
- nhưng **chưa phải cấu hình production tối ưu nhất**

Nếu bạn muốn bước tiếp theo, nên làm thêm một vòng `production-ready deploy`, gồm:

- Dockerfile production cho frontend
- Dockerfile production cho API
- reverse proxy / SSL chuẩn hơn
- compose file tách rõ cho production

---

Nếu bạn đang đứng ở bước dashboard Kendy/Candy và muốn mình chỉ **chính xác phải bấm gì ở repo này**, hãy gửi:

- ảnh màn hình phần `Add Server`
- ảnh màn hình phần `Create App / Deploy Repo`
- hoặc text những field mà Kendy/Candy đang yêu cầu

Mình sẽ map từng field đó sang repo này cho bạn ngay.
