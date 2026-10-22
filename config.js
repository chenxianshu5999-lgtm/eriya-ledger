// 由 scripts/encrypt-token.mjs 生成，只含加密后的 token，可以公开。
window.LEDGER_CONFIG={
  "v": 1,
  "repo": "chenxianshu5999-lgtm/eriya-ledger-data",
  "path": "data.json",
  "kdf": {
    "name": "PBKDF2",
    "hash": "SHA-256",
    "iterations": 600000,
    "salt": "1cwLZpNBhCNTZzjijfi6ew=="
  },
  "cipher": {
    "name": "AES-GCM",
    "iv": "LHxKWT8XUTjAqycZ",
    "ct": "V69pxlt+gEUIyusrbIrloq4/gS6EAmBkJApEm5ty6H5QcAojOn5yjs5soJlyzp5R+772d0/w3GPnDlrPbR3b8V9x875Xj9h1njYbRgBzgxnJlJBXdNP6RTGeoVQhBVtmqezqOMtJp3YK75K/og=="
  }
};
