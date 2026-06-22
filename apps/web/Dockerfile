FROM node:18-alpine AS builder

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
# Copy built static files to nginx
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
