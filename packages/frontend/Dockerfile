FROM node:22-alpine AS builder

WORKDIR /build
COPY packages/frontend/package.json ./
RUN npm install

COPY packages/frontend .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /build/dist /usr/share/nginx/html
COPY packages/frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
