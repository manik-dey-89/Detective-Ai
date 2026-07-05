# Backend Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY backend/package*.json ./
RUN npm ci --only=production

# Copy backend source
COPY backend/tsconfig.json ./
COPY backend/src ./src

# Install TypeScript and build
RUN npm install -g typescript
RUN npm install -g ts-node
RUN npx tsc

# Expose port
EXPOSE 5000

# Start the server
CMD ["node", "dist/server.js"]
