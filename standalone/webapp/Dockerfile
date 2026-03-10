FROM node:22.14.0-slim AS builder

WORKDIR /app

# Copy package files to install dependencies
COPY package*.json ./
COPY standalone/webapp/package*.json ./standalone/webapp/
COPY library/package*.json ./library/

# Install all workspace deps (use ci for consistent, reliable installs)
RUN npm ci --include=optional


# Copy only necessary source files (no node_modules)
# Copy source files
COPY standalone/webapp ./standalone/webapp
COPY library ./library

# Also copy any global config used during build
# Build

ARG VITE_BACKEND_URL
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL

ARG VITE_BACKEND_URL_WSS
ENV VITE_BACKEND_URL_WSS=$VITE_BACKEND_URL_WSS

RUN npm run build:lib && npm run build:webapp

# Serve with Nginx
FROM nginx:alpine

# Clean default content
RUN rm -rf /usr/share/nginx/html/*

# Copy only final build
COPY --from=builder /app/standalone/webapp/dist /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf


CMD ["nginx", "-g", "daemon off;"]