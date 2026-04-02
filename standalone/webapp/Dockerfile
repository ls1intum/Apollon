FROM node:22.14.0-slim AS builder

WORKDIR /app

COPY package*.json ./
COPY standalone/webapp/package*.json ./standalone/webapp/
COPY library/package*.json ./library/

RUN npm ci

COPY standalone/webapp ./standalone/webapp
COPY library ./library

RUN npm run build:lib && npm run build:webapp

FROM nginx:1.27-alpine AS runtime

LABEL org.opencontainers.image.source="https://github.com/ls1intum/Apollon" \
      org.opencontainers.image.title="apollon-webapp"

RUN rm /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/standalone/webapp/dist /usr/share/nginx/html

# Prepare directories for non-root nginx
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

EXPOSE 8080

USER nginx

CMD ["nginx", "-g", "daemon off;"]
