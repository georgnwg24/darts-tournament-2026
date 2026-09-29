# ---- Build stage ----
FROM node:20-alpine AS build
WORKDIR /app

# Install deps (works with or without package-lock.json)
COPY package*.json ./
RUN npm ci || npm install

# Build
COPY . .
RUN npm run build

# ---- Runtime stage ----
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

# Only install production deps (works with or without lockfile)
COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev

# Copy compiled output
COPY --from=build /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/main"]
