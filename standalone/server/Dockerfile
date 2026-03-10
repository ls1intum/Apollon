FROM node:22.14.0-slim AS builder

WORKDIR /app

# Copy workspace and package files
COPY package*.json ./
COPY library/package*.json ./library/
COPY standalone/server/package*.json ./standalone/server/

# Install all workspace dependencies (library + server)
RUN npm install

# Copy library source and config
COPY library/lib ./library/lib
COPY library/tsconfig.json ./library/tsconfig.json
COPY library/vite.config.ts ./library/vite.config.ts
COPY library/eslint.config.js ./library/eslint.config.js

# Copy server source and config
COPY standalone/server/src ./standalone/server/src
COPY standalone/server/tsconfig.json ./standalone/server/tsconfig.json

# Build the library first (required by server)
RUN npm run build:lib

# Build the server (TypeScript → JavaScript)
RUN npm run build:server
RUN npx playwright install --with-deps

# Set environment variables
ENV HOST=0.0.0.0
ENV PORT=8000
ENV WSSPORT=4444
ENV FRONTEND_URL=http://localhost:5173
ENV MONGO_URI=mongodb://localhost:27017/apollon2DB 

# Start the compiled server
CMD ["node", "standalone/server/dist/src/server.js"]
