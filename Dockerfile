# Multi-stage Dockerfile for RAG System Multi-Document QA
# Stage 1: Build React Frontend
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Production Server
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy backend source
COPY src/ ./src/

# Copy built frontend assets
COPY --from=client-builder /app/client/dist ./client/dist

# Create storage directories
RUN mkdir -p data uploads

EXPOSE 3000

CMD ["node", "src/index.js"]
