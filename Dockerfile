# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=25-alpine

FROM node:${NODE_VERSION} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:${NODE_VERSION} AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:${NODE_VERSION} AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# Install only production dependencies (skip prepare scripts)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

# Copy built assets
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next

USER nextjs
EXPOSE 3000
CMD ["npm", "run", "start"]
