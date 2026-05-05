# Deploy domain với Caddy cho repo này

Tài liệu này dành cho đúng repo `spy` khi bạn muốn:

- bỏ `nginx`
- dùng `Caddy`
- nối domain Namecheap vào server Ubuntu

## 1. Chuẩn bị server

SSH vào server Ubuntu:

```bash
ssh root@YOUR_SERVER_IP
```

Cài Docker nếu chưa có:

```bash
apt update && apt upgrade -y
apt install -y ca-certificates curl gnupg git ufw
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" > /etc/apt/sources.list.d/docker.list
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable docker
systemctl start docker
```

Mở port:

```bash
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw enable
```

## 2. Clone repo

```bash
cd /opt
git clone https://github.com/waitu/spy.git
cd spy
```

## 3. Tạo `.env`

```bash
cp .env.example .env
nano .env
```

Điền giá trị thật:

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

## 4. Deploy bằng Caddy

Repo này đã có sẵn:

- `Caddyfile`
- `docker-compose.prod.yml`

Chạy:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

## 5. Cách route trong repo này

`Caddyfile` hiện cấu hình như sau:

- `yourdomain.com` -> `web:4173`
- `/api/*` -> `api:4000`
- `www.yourdomain.com` -> redirect về `yourdomain.com`

Bạn không cần tự viết lại rule nginx nữa.

## 6. Trỏ domain Namecheap

Vào `Namecheap -> Domain List -> Manage -> Advanced DNS`

Tạo record:

- `A Record` — `Host: @` — `Value: YOUR_SERVER_IP`
- `A Record` — `Host: www` — `Value: YOUR_SERVER_IP`

Lưu lại và chờ propagate.

## 7. Kiểm tra sau khi trỏ domain

```bash
curl -I http://yourdomain.com
curl -I https://yourdomain.com
curl -s https://yourdomain.com/api/health
```

Nếu SSL chưa active ngay:

```bash
docker compose -f docker-compose.prod.yml logs -f caddy
```

## 8. Kiểm tra app thật

Sau khi Caddy lên và domain trỏ đúng, test:

- homepage
- `/signin`
- `/signup`
- `/admin`
- upload ảnh trong editor
- API health `/api/health`

## 9. Ghi chú quan trọng

Repo hiện đã có cấu hình để chạy sau `Caddy`, nhưng runtime của `web` và `api` vẫn đang thiên về kiểu dev container hơn production tối ưu. Nghĩa là bạn có thể nối domain và chạy thật ngay, nhưng nếu muốn tối ưu thêm thì bước sau nên là chỉnh Dockerfile sang production runtime.