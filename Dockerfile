# build stage - using alpine to keep size down
FROM node:18-alpine AS build

WORKDIR /app

# copy package files first for better layer caching
COPY package*.json ./

# install deps - only prod ones for final build
RUN npm ci --only=production

# copy source
COPY . .

# build the app
RUN npm run build

# production stage - nginx is tiny and fast
FROM nginx:alpine

# copy built assets
COPY --from=build /app/dist /usr/share/nginx/html

# copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# health check so orchestrators know we're alive
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
