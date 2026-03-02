/**
 * @type {import('semantic-release').GlobalConfig}
 */
export default {
  branches: ["main"],
  plugins: [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/changelog",
    ["@semantic-release/npm", { npmPublish: false }],
    [
      "@semantic-release/git",
      {
        assets: ["package.json", "CHANGELOG.md"],
      },
    ],
    [
      "@semantic-release/github",
      {
        assets: [
          { path: "static-rocrate-viewer.tar.gz", label: "Release tarball" },
          { path: "install.sh", label: "Install script" },
        ],
      },
    ],
  ],
};
