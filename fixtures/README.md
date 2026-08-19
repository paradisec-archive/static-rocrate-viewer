# Fixtures

Committed sample RO-Crates, used by `pnpm generate` and the tests. This is
**not** where end users put their archive — that is `./data/`, which stays
gitignored (see the README's Quick Start).

The two directories are otherwise identical in shape; the generator derives the
URL prefix it writes into `catalog.js` from whichever `--data-dir` it is given,
so a crate works unchanged in either.

```
fixtures/
└── {CollectionId}/
    ├── ro-crate-metadata.json    # Collection-level metadata (optional)
    └── {ItemId}/
        ├── ro-crate-metadata.json
        └── ...media files
```
