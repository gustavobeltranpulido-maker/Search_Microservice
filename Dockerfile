# ==============================================================
# Dockerfile — search-service
# Multi-stage: compila TypeScript en una etapa y deja en la
# imagen final solo lo necesario para ejecutar (dist + deps prod).
# ==============================================================

# --------------------------------------------------------------
# Etapa 1: dependencias y build
# --------------------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /app

# Primero solo los manifiestos: así la capa de dependencias se
# cachea y no se reinstala todo cuando cambia el código.
COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Quita devDependencies para copiar solo lo de producción.
RUN npm prune --omit=dev

# --------------------------------------------------------------
# Etapa 2: imagen final de ejecución
# --------------------------------------------------------------
FROM node:22-alpine AS runtime

ENV NODE_ENV=production

WORKDIR /app

# Render inyecta PORT; 3003 es el valor por defecto de la app.
ENV PORT=3003
EXPOSE 3003

COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/package.json ./package.json

# No correr como root.
USER node

CMD ["node", "dist/main.js"]
