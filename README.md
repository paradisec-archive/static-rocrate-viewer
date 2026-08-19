# Static RO-Crate Viewer

**[View the showcase site](https://paradisec-archive.github.io/static-rocrate-viewer/)**

A static web application for browsing [RO-Crate](https://www.researchobject.org/ro-crate/) archives. Works by double-clicking `index.html` (file:// protocol)

## Features

- **Collections → Items → Files** hierarchy for browsing archives
- **Inline media playback** — audio and video players for any format your browser can decode, image viewer for JPEG/PNG
- **ELAN transcripts** — `.eaf` annotations render beside the recording they annotate, as a table or an ELAN-like timeline, synced to playback both ways
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
        ├── file1.eaf               # ELAN transcript (optional)
        └── file1.jpg
```

An `.eaf` renders beneath the recording it annotates. The viewer works out which
recording that is from the crate's `hasAnnotation` / `annotationOf` links, falling
back to a filename-stem match (`file1.eaf` ↔ `file1.mp3`) for older crates that
carry no links. Where a recording has several renditions, the transcript attaches
to one of them — video first, then MP3, then any other audio.

## Development

### Prerequisites

- Node.js 22+
- [pnpm](https://pnpm.io/)

### Setup

```bash
pnpm install
```

### Generate catalog from data

```bash
pnpm generate
```

This produces three files in `public/`, which Vite serves during development and copies to `dist/` on build:

| File | Contents |
|---|---|
| `catalog.js` | The browse and search index — collections, items and files. |
| `rocrate-data.js` | Full RO-Crate metadata for the item pages. |
| `transcripts.js` | Parsed ELAN annotations, keyed to the file they render beneath. |

`.eaf` files are parsed here, at generate time, because the viewer has to run over
`file://` where `fetch()` is blocked — the browser never sees the XML.

There are two data directories, and they serve different people:

| Directory | Who | Tracked in git |
|---|---|---|
| `./data/` | End users, pointed at their own archive. What `install.sh` and the standalone generator default to. | No |
| `./fixtures/` | This repo's committed sample crates, which `pnpm generate` and the tests run against. | Yes |

The generator takes the directory as `--data-dir` and derives the URL prefix it
writes into `catalog.js` from that directory's name, so the same crate works
unchanged in either. To generate against your own archive instead:

```bash
node scripts/generate-catalog.ts --data-dir ./data
```

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

### Tests

```bash
pnpm test          # Run once
pnpm test:watch    # Watch mode
```

Vitest, Node environment. Covers the generator's EAF parser and annotation
resolver, and the pure modules under `src/lib/`. Lefthook's pre-commit hook runs
the tests alongside the linters.

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
