FROM node:18-slim AS builder

WORKDIR /app

COPY . .

RUN yarn install && yarn build



FROM nginx:alpine

WORKDIR /usr/share/nginx/html

COPY --from=builder /app/dist/* ./

ENTRYPOINT ["nginx", "-g", "daemon off;"]
