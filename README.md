# Static RO-Crate Viewer

A static web application for browsing [RO-Crate](https://www.researchobject.org/ro-crate/) archives. Works by double-clicking `index.html` (file:// protocol)

## Features

- **Collections → Items → Files** hierarchy for browsing archives
- **Inline media playback** — audio player for MP3/WAV, image viewer for JPEG/PNG
- **Full-text search** across items, collections, languages, and filenames
- **Rich metadata display** from RO-Crate `rootDataset` with resolved linked entities
- **file:// compatible** — works without a web server

## Quick Start (End Users)

If you have a `data/` directory of RO-Crate files, the install script downloads a pre-built release and generates the viewer:

```bash
curl -fsSL https://github.com/paradisec-archive/static-rocrate-viewer/releases/latest/download/install.sh | bash
```

**Requirements:** `bash`, `curl`, `tar`, `node` (v20+)

### Expected data directory structure

```
data/
└── {CollectionId}/
    ├── ro-crate-metadata.json    # Collection-level metadata (optional)
    └── {ItemId}/
        ├── ro-crate-metadata.json  # Item metadata
        ├── file1.mp3
        └── file1.jpg
```

Metadata can also live inside a `pdsc_admin` directory e.g. `data/{CollectionId}/{ItemId}/pdsc_admin/ro-crate-metadata.json`, however this behaviour is deprecated and will be removed in a future release.

## Development

### Prerequisites

- Node.js 22+
- [pnpm](https://pnpm.io/)

### Setup

```bash
pnpm install
```

### Generate catalog from data

Place your RO-Crate data in `./data/`, then:

```bash
pnpm generate
```

This produces `public/catalog.js` and `public/rocrate-data.js`, which Vite serves during development and copies to `dist/` on build.

### Development server

```bash
pnpm dev
```

### Build for production

```bash
pnpm build
```

The built site is in `dist/`. Open `dist/index.html` directly.

### Build the standalone catalog generator

```bash
pnpm build:generator
```

Produces `dist/generate-catalog.js` — a self-contained Node.js script with all dependencies bundled via Vite library mode.

### Linting

```bash
pnpm lint          # Run all linters
pnpm lint:biome    # Biome (formatting + lint rules)
pnpm lint:types    # TypeScript type checking
pnpm lint:knip     # Unused code detection
```

## Releasing

Releases are automated via GitHub Actions. Push a version tag to trigger a build:

```bash
git tag v1.0.0
git push origin v1.0.0
```

The workflow builds the React app and generator, creates a tarball, and publishes it as a GitHub Release along with the install script.

## Licence

[MIT](LICENSE)
