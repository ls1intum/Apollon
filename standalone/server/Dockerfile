FROM node:22.14.0-slim AS builder

WORKDIR /app

# Copy only what's needed for dependency installation
COPY package*.json ./
COPY standalone/server/package*.json ./standalone/server/

# Install server-only dependencies using workspaces
RUN npm install --workspace=@tumaet/server

# Copy server source and tsconfig only (no node_modules!)
COPY standalone/server/src ./standalone/server/src
COPY standalone/server/tsconfig.json ./standalone/server/tsconfig.json

# Build the server (TypeScript → JavaScript)
RUN npm run build:server

# Set environment variables
ENV HOST=0.0.0.0
ENV PORT=8000
ENV WSSPORT=4444
ENV FRONTEND_URL=http://localhost:5173
ENV MONGO_URI=mongodb://localhost:27017/apollon2DB 

# Start the compiled server
CMD ["node", "standalone/server/dist/src/server.js"]
