# Chromium and its system libraries come with the Playwright image.
FROM mcr.microsoft.com/playwright:v1.56.1-noble
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY server.mjs ./
ENV PORT=8080 MEDIA_DIR=/data/media
EXPOSE 8080
CMD ["node", "server.mjs"]
