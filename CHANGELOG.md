## [2.0.2](https://github.com/paradisec-archive/static-rocrate-viewer/compare/v2.0.1...v2.0.2) (2026-08-19)


### Bug Fixes

* attach release assets again ([6f66f75](https://github.com/paradisec-archive/static-rocrate-viewer/commit/6f66f75a320500b2a46e29f78fe838ec40c0b704))

## [2.0.1](https://github.com/paradisec-archive/static-rocrate-viewer/compare/v2.0.0...v2.0.1) (2026-08-19)


### Bug Fixes

* stop the release tarball from failing to extract ([8b30624](https://github.com/paradisec-archive/static-rocrate-viewer/commit/8b306248c549e0576b2d81f2c6feb744df443a74))

# [2.0.0](https://github.com/paradisec-archive/static-rocrate-viewer/compare/v1.2.0...v2.0.0) (2026-08-19)


* feat!: remove support for pdsc_admin directory ([2460e33](https://github.com/paradisec-archive/static-rocrate-viewer/commit/2460e336f44e7a7e8f5a49129a94f4ae762bccc3))


### Bug Fixes

* correct copy-to-clipboard function name on docs page ([c74b956](https://github.com/paradisec-archive/static-rocrate-viewer/commit/c74b9566793910fb79a4ba056d7f44d9eacead3b))


### Features

* add an ELAN-like timeline view beside the transcript table ([848e7cd](https://github.com/paradisec-archive/static-rocrate-viewer/commit/848e7cdf82b1af634ce497514663ac171be4a82a))
* add committed fixture crates covering the EAF cases ([fc395fb](https://github.com/paradisec-archive/static-rocrate-viewer/commit/fc395fb7fb36bf424bf9e8cd4aec127e4e481e28))
* add detailed step-by-step guide to docs page ([9895e94](https://github.com/paradisec-archive/static-rocrate-viewer/commit/9895e9476128ba71f23827bc641956f0f5a2c02b))
* add GitHub Pages showcase site ([474844c](https://github.com/paradisec-archive/static-rocrate-viewer/commit/474844ce3f4bf5f58b9ce887b92c5df0c81b8784))
* parse ELAN .eaf annotation files at generate time ([2284c87](https://github.com/paradisec-archive/static-rocrate-viewer/commit/2284c87c6f08aca840fda233bbd0b4e3df489660))
* play any format the browser can decode, and add video ([3af61f8](https://github.com/paradisec-archive/static-rocrate-viewer/commit/3af61f8c4f7decbe2fa4b317c699c22322901e2e))
* render ELAN transcripts as a table beside their media ([49a5c97](https://github.com/paradisec-archive/static-rocrate-viewer/commit/49a5c9781ee16ece821b61e6401b5f011cb72ee7))
* resolve which recording each .eaf annotates ([29c63b0](https://github.com/paradisec-archive/static-rocrate-viewer/commit/29c63b02063d1dec2ba565529349dd6b3b022d45))
* separate committed fixtures from the end-user data directory ([7f88da0](https://github.com/paradisec-archive/static-rocrate-viewer/commit/7f88da0be0c884617684d270e64594614f52b2b1))
* ship parsed transcripts to the browser in transcripts.js ([832f344](https://github.com/paradisec-archive/static-rocrate-viewer/commit/832f344a9c9c223d0a4357290190d7cb7552e736))
* support prefixed ro-crate-metadata.json filenames ([890dc7d](https://github.com/paradisec-archive/static-rocrate-viewer/commit/890dc7ddbeed29d605a6c5c8720b76874b87a353))


### BREAKING CHANGES

* metadata is no longer looked up in a pdsc_admin
subdirectory. Move ro-crate-metadata.json up into the item or
collection directory.

# [1.2.0](https://github.com/paradisec-archive/static-rocrate-viewer/compare/v1.1.0...v1.2.0) (2026-03-02)


### Features

* update to Node.js 24 ([67f4ac6](https://github.com/paradisec-archive/static-rocrate-viewer/commit/67f4ac62d49f135fecdc5eb84b6f1abe4361dbf7))

# [1.1.0](https://github.com/paradisec-archive/static-rocrate-viewer/compare/v1.0.1...v1.1.0) (2026-03-02)


### Features

* add lefthook git hooks for conventional commits and linting ([e8a09bc](https://github.com/paradisec-archive/static-rocrate-viewer/commit/e8a09bcf20ba10aab6629bbee8007f8505c40d2b))
* switch to semantic-release with manual workflow trigger ([1304107](https://github.com/paradisec-archive/static-rocrate-viewer/commit/1304107e9d4beada2a2fd2a87386252f250a12e9))
