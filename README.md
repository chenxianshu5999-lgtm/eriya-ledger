# eriya-ledger
エリオや 艺祭账本（2026 武藏美艺术祭）。

- `index.html`：账本页面，输入口令后解密 token，读写私有仓库 `eriya-ledger-data` 里的 `data.json`。
- `config.js`：由 `node scripts/encrypt-token.mjs` 生成，只含加密后的 token。
- 明文 token 不要放进这个仓库。
