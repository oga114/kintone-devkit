# Kintone Customize Vite

This project provides a multi‑app setup for building and uploading Kintone customizations with [Vite](https://vitejs.dev/).

## Project structure

```
/
├── apps/            # Source code for each app
│   ├── app1/
│   └── app2/
├── dist/            # Build outputs per app
├── scripts/         # Helper scripts (upload etc.)
├── package.json     # Shared dependencies and scripts
├── vite.config.js   # Dynamic Vite configuration
└── .gitignore
```

Each app directory contains an `index.html` and a `src/` folder with its scripts.

## Commands

Use the `APP_NAME` environment variable to select which app to work with. By default `app1` is used.

```bash
# Start development server for app1
npm run dev

# Build app1
npm run build

# Start development server for another app
APP_NAME=app2 npm run dev

# Build another app
APP_NAME=app2 npm run build
```

Build results are output to `dist/<appName>`.

## Uploading to Kintone

Use the helper script to upload the built files. Set the following environment variables (for example in a `.env` file):

- `KINTONE_BASE_URL`
- `KINTONE_USERNAME`
- `KINTONE_PASSWORD`

Then run:

```bash
node scripts/upload.js [watch]
```

Specify `watch` to keep watching files and upload on change.

## License

MIT
