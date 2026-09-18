# Single image serving both the API and the built frontend on one port.
# Build:
#   docker build -t fika-friday .
# Run (DB/Google/JWT config supplied at runtime, never baked into the image).
# -e PORT=1167 after --env-file wins over any PORT set in .env, keeping the
# container listening on the port that's actually published:
#   docker run --env-file .env -e PORT=1167 -p 1167:1167 fika-friday

# ---- Build stage ----
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json server/package.json
COPY web/package.json web/package.json
RUN npm ci

COPY server ./server
COPY web ./web

# Baked in at build time: the frontend bundle needs to know where the API
# is. Leave empty (default) so it calls same-origin — correct for this
# single-container setup where Fastify serves both API and static assets.
ARG VITE_API_URL=""
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build --workspace web

RUN npm prune --omit=dev

# ---- Runtime stage ----
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=1167

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/server/package.json ./server/package.json
COPY --from=build /app/server/src ./server/src
COPY --from=build /app/web/dist ./web/dist

EXPOSE 1167
CMD ["node", "server/src/server.js"]
