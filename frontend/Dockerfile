# Frontend: build React bằng Vite, rồi phục vụ file tĩnh bằng nginx
# --- Bước 1: build ---
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Gọi API cùng domain (/api); nginx chuyển tiếp sang container backend.
# Biến VITE_* được "đóng" vào bundle lúc build, không đổi được lúc chạy.
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build
# --- Bước 2: chạy ---
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
