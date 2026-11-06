# Backend API (Express + Sequelize)
FROM node:22-bookworm-slim
# mysqldump / mysql cho npm run db:backup, db:restore (và bản sao lưu tự động
# trước db:seed / db:reset). Gói này là MariaDB client, vẫn dùng được với MySQL 8.4.
RUN apt-get update \
&& apt-get install -y --no-install-recommends default-mysql-client \
&& rm -rf /var/lib/apt/lists/*
WORKDIR /app
# Cài thư viện trước khi chép code: sửa code không làm mất cache của bước npm ci.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .
ENV PORT=8080
EXPOSE 8080
# Áp migration còn thiếu (an toàn khi chạy lại) rồi mới mở server.
CMD ["sh", "-c", "npm run db:migrate && npm start"]
