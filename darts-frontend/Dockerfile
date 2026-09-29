# ---- Build stage ----
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci || npm install

COPY . .
RUN npm run build

# ---- Nginx stage ----
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Clear default nginx html (removes the Welcome page)
RUN rm -rf /usr/share/nginx/html/*

# Copy build output to nginx root
COPY --from=build /app/dist/darts-frontend /tmp/dist
RUN if [ -d /tmp/dist/browser ]; then \
      cp -r /tmp/dist/browser/* /usr/share/nginx/html/; \
    else \
      cp -r /tmp/dist/* /usr/share/nginx/html/; \
    fi

EXPOSE 80
