FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

FROM deps AS build
COPY tsconfig.json ./
COPY src/ src/
COPY public/ public/
COPY scripts/ scripts/
RUN mkdir -p data && npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache tini && addgroup -S webnesti && adduser -S webnesti -G webnesti && mkdir -p data
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/scripts ./scripts
RUN chown -R webnesti:webnesti /app
USER webnesti
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:${PORT:-3000}/health >/dev/null || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["./scripts/run.sh"]
