# Fixtures

Committed sample RO-Crates, used by `pnpm generate` and the tests. This is
**not** where end users put their archive — that is `./data/`, which stays
gitignored (see the README's Quick Start).

The two directories are otherwise identical in shape; the generator derives the
URL prefix it writes into `catalog.js` from whichever `--data-dir` it is given,
so a crate works unchanged in either.

Source is `s3://nabu-catalog-prod`. Media has been shrunk hard to keep the repo
small — see [Shrinking](#shrinking). The crates are real, not hand-written.

## What each item is here to cover

| Item | Covers |
|---|---|
| `NT1/001` | A **deliberately stale** crate: no `hasAnnotation`/`annotationOf` links, so association falls back to filename-stem matching. Carries the legacy `audio/vnd.wav` encodingFormat, `http://example.org/` entity ids, and a collection crate under the prefixed filename `NT1-ro-crate-metadata.json`. Its EAF is 451 annotations on a single `Channel1` tier — the volume test. |
| `VKS3/026` | Images plus audio, **no EAF** — an item the transcript code must leave alone. Supplies the `image/tiff` that must render as a download, never a player. |
| `KD1/VU20180811SAN` | The structure test: 3 recordings, 3 EAFs, 5 tiers each, heavy `REF_ANNOTATION` chaining, and `-03` carrying `.mp4` + `.mp3` + `.wav` for the same recording so rendition precedence has something to choose between. Annotation links are present in **both** directions. |

## Deliberate staleness in `NT1/001`

Its crate is **not** updated to match the shrunk files on disk — `contentSize`
and `duration` still describe the originals. That is the point: it exercises the
path where crate metadata disagrees with the media actually served, which the
timeline has to correct from `loadedmetadata`. Do not "fix" it.

The two refreshed crates (`VKS3/026`, `KD1/VU20180811SAN`) *are* updated, so the
disagreement is isolated to one item.

## Omitted files, and the warnings they cause

`pnpm generate` prints six `Warning: File not found, skipping:` lines. These are
expected on a clean checkout, not breakage — the crates still list files too
large to commit:

| Omitted | Why |
|---|---|
| `NT1-001-001A.wav` | 1.5 GB |
| `VKS3-026-A.wav`, `VKS3-026-B.wav` | 1.1 GB and 339 MB |
| `KD1-VU20180811SAN-01.wav`, `-02.wav` | 136 MB and 177 MB |
| `KD1-VU20180811SAN-03.mxf` | 75 MB, and no browser plays MXF |

`KD1-VU20180811SAN-03.wav` is kept as the one WAV with a working player.
`NT1-001-001B.wav` is kept as the one `audio/vnd.wav`.

The generator skipping a `hasPart` entry whose file is missing is real behaviour
worth exercising, so the entries are left in the crates rather than deleted.

## Shrinking

- **MP3** → 32 kbps mono. Where an EAF annotates the recording the **full
  duration is preserved**, because the transcript syncs against it:
  `NT1-001-001B` and all three `KD1-VU20180811SAN` recordings. Where nothing
  annotates it, the file is truncated to 60 s: `NT1-001-001A`, `VKS3-026-A/B`.
- **WAV** → `KD1-VU20180811SAN-03.wav` downsampled to 16 kHz mono, full duration
  intact. `NT1-001-001B.wav` downsampled to 8 kHz mono and truncated to 20 s —
  it exists only to put `audio/vnd.wav` in the catalog.
- **Images** → JPEG scaled to 1200 px, TIFF to 800 px with deflate.
- **EAF and crate JSON** → committed byte-for-byte. Never shrink these; they are
  what the parser is tested against.

Regenerating any of this needs read access to `s3://nabu-catalog-prod` (AWS
profile `nabu-prod`) and ffmpeg.
