# Build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# força hash único a cada build (cache-bust)
RUN node -e "require('fs').writeFileSync('src/force-rebuild-stamp.js', `export default \"build-${Date.now()}\"`)"
RUN npm run build

# Runtime
FROM node:20-alpine
WORKDIR /app
RUN npm i -g serve
COPY --from=build /app/dist ./dist
EXPOSE 3002
CMD ["serve", "-s", "dist", "-l", "3002"]
