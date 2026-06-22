FROM node:22-alpine AS builder

WORKDIR /app
RUN npm install -g pnpm@9.1.0 turbo

# Copy everything
COPY . .

# Install dependencies
RUN pnpm install

# Build the web app
RUN turbo run build --filter=@help-desk/web

# Production image
FROM nginx:alpine AS runner
WORKDIR /usr/share/nginx/html
RUN rm -rf ./*
# Copy built static files to nginx
COPY --from=builder /app/apps/web/dist/ ./
# Copy nginx configuration for SPA routing
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
