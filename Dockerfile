FROM node:22-bookworm-slim

# Install DejaVu fonts + fontconfig so Sharp/librsvg can render SVG text in the banner.
# Plus libheif HEVC decoder + heif-convert CLI for iPhone HEIC pre-processing
# (Sharp's bundled libvips lacks HEVC due to patent restrictions; we shell out
# to heif-convert as a separate step before any Sharp call — see server/heicToJpeg.ts).
RUN apt-get update && \
    apt-get install -y fonts-dejavu-core fontconfig libheif-examples libde265-0 && \
        fc-cache -fv && \
            rm -rf /var/lib/apt/lists/*

            WORKDIR /app

            # Install all deps (devDeps needed for the build step)
            COPY package*.json ./
            RUN npm install --legacy-peer-deps

            # Copy source and build (frontend via Vite + backend via esbuild)
            COPY . .
            ARG VITE_TURNSTILE_SITE_KEY
            ARG VITE_KITCHEN_TEST_SECRET
            ENV VITE_KITCHEN_TEST_SECRET=$VITE_KITCHEN_TEST_SECRET
            RUN npm run build

            # Start the production server (listens on $PORT as set by Railway)
            CMD ["npm", "run", "start"]
