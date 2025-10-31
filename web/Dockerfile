FROM node:20-alpine AS build
WORKDIR /app
# deps de build
COPY package.json package-lock.json* ./
RUN npm ci || npm i
RUN npm i -D tailwindcss postcss autoprefixer tailwindcss-animate
# código
COPY . .
# build do Vite
RUN npm run build

# --- runtime fino com deps de produção (express) ---
FROM node:20-alpine AS run
WORKDIR /app
ENV NODE_ENV=production
# trazer dist e server
COPY --from=build /app/dist ./dist
COPY --from=build /app/server.cjs ./server.cjs
# trazer package.json e instalar SOMENTE prod deps (inclui express)
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/package-lock.json ./package-lock.json
RUN npm ci --omit=dev || npm i --omit=dev
EXPOSE 3002
CMD ["node","server.cjs"]
