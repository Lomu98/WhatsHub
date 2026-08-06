# Va costruita con il contesto alla RADICE del monorepo (npm workspaces:
# serve il package.json/package-lock.json di root per l'hoisting).
# Railway: build > Dockerfile Path = bot/Dockerfile, Root Directory = /

FROM node:20-bookworm-slim AS build

# Librerie di sistema richieste dal Chromium headless scaricato da puppeteer.
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    wget \
    xdg-utils \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
COPY bot/package.json bot/package.json

# --include-workspace-root serve alle dipendenze condivise (tsx/typescript sono
# solo nel workspace bot, ma npm risolve comunque dalla radice).
RUN npm ci --workspace=@whatshub/bot --include-workspace-root

COPY bot bot

RUN npm run build --workspace=@whatshub/bot

WORKDIR /app/bot

ENV NODE_ENV=production

# La sessione WhatsApp va su un volume Railway montato qui, altrimenti ogni
# deploy la perde e serve un nuovo scan del QR.
ENV WA_SESSION_PATH=/data/.wwebjs_auth

CMD ["node", "dist/index.js"]
