FROM node:22-alpine AS builder

WORKDIR /app
RUN npm install -g pnpm@9.1.0 turbo

# Copy everything
COPY . .

# Install dependencies
RUN pnpm install

# Build the backend
RUN turbo run build --filter=@help-desk/backend

FROM node:22-alpine AS runner

WORKDIR /app
RUN npm install -g pnpm@9.1.0

# Copy node_modules and built files
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/package.json ./backend/package.json
COPY --from=builder /app/backend/node_modules ./backend/node_modules

WORKDIR /app/backend
CMD ["node", "dist/server.js"]
