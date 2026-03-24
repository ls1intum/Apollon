FROM node:22.14.0-slim AS builder

WORKDIR /app

# Copy manifests needed for workspace dependency installation
COPY package*.json ./
COPY standalone/server/package*.json ./standalone/server/
COPY library/package*.json ./library/

# Install workspace dependencies so @tumaet/apollon links resolve correctly
RUN npm install

# Copy sources required for build
COPY standalone/server ./standalone/server
COPY library ./library

# Build library first (generates dist/types), then build server
RUN npm run build:lib && npm run build:server

FROM node:22.14.0-slim AS runtime

WORKDIR /app

# Set environment variables
ENV HOST=0.0.0.0
ENV PORT=8000
ENV WSSPORT=4444
ENV FRONTEND_URL=http://localhost:5173
ENV MONGO_URI=mongodb://localhost:27017/apollon2DB

# Copy runtime artifacts and package manifests
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/standalone/server/package*.json ./standalone/server/
COPY --from=builder /app/standalone/server/dist ./standalone/server/dist
COPY --from=builder /app/library ./library

# Install production dependencies for the server workspace
RUN npm install --omit=dev --workspace=@tumaet/server

# Start the compiled server
CMD ["node", "standalone/server/dist/src/server.js"]
