FROM node:22-alpine

RUN apk add --no-cache python3 make g++

WORKDIR /app
COPY packages/backend/package.json ./
RUN npm install

COPY packages/backend .
RUN npm run build

EXPOSE 3001

CMD ["node", "dist/main.js"]
