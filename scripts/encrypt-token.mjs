#!/usr/bin/env node
// 把 GitHub token 用口令加密，生成 config.js（只含密文，可以放进公开仓库）。
// 用法：node scripts/encrypt-token.mjs
// token 和口令都在终端里隐藏输入，不会写进文件、不会打印出来。

import { webcrypto as crypto } from "node:crypto";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import readline from "node:readline";

const ITERATIONS = 600000;
const DEFAULT_REPO = "chenxianshu5999-lgtm/eriya-ledger-data";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "config.js");

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((res) => rl.question(question, (a) => { rl.close(); res(a.trim()); }));
}

// 隐藏输入：不回显任何字符
function askHidden(question) {
  return new Promise((res, rej) => {
    const { stdin, stdout } = process;
    if (!stdin.isTTY) return rej(new Error("请直接在终端里运行这个脚本（不要用管道输入）。"));
    stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    let buf = "";
    const done = (val, err) => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener("data", onData);
      stdout.write("\n");
      err ? rej(err) : res(val);
    };
    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === "\r" || ch === "\n") return done(buf);
        if (ch === "\u0003") return done(null, new Error("已取消。"));
        if (ch === "\u007f" || ch === "\b") buf = buf.slice(0, -1);
        else if (ch >= " ") buf += ch;
      }
    };
    stdin.on("data", onData);
  });
}

const b64 = (u8) => Buffer.from(u8).toString("base64");

async function main() {
  console.log("== エリオや 账本：加密 token ==\n");
  const repoIn = await ask(`数据仓库（直接回车用 ${DEFAULT_REPO}）：`);
  const repo = repoIn || DEFAULT_REPO;
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) throw new Error("仓库名格式应为 用户名/仓库名");

  const token = (await askHidden("粘贴 GitHub token（输入时不显示，粘贴后回车）：")).trim();
  if (!token) throw new Error("没有输入 token。");
  if (!/^github_pat_/.test(token)) console.log("提醒：这不像 fine-grained token（应以 github_pat_ 开头），请确认没贴错。");

  // 用 token 试一下能不能访问数据仓库（不会打印 token）
  try {
    const r = await fetch(`https://api.github.com/repos/${repo}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
    });
    if (r.ok) {
      const j = await r.json();
      const canPush = j.permissions ? j.permissions.push : undefined;
      console.log(`✓ token 能访问 ${repo}${canPush === false ? "，但没有写入权限！请检查 Contents 权限是否为 Read and write" : ""}`);
    } else if (r.status === 401) {
      throw new Error("token 无效（401），请检查是否复制完整。");
    } else {
      throw new Error(`token 访问不了 ${repo}（HTTP ${r.status}），请检查 token 是否只授权了这个仓库、仓库名是否正确。`);
    }
  } catch (e) {
    if (e instanceof TypeError) console.log("（联网检查失败，跳过验证，继续加密）");
    else throw e;
  }

  const pass = (await askHidden("设置口令（输入时不显示）：")).normalize("NFC").trim();
  if (!pass) throw new Error("口令不能为空。");
  const pass2 = (await askHidden("再输一次口令：")).normalize("NFC").trim();
  if (pass !== pass2) throw new Error("两次口令不一样，请重新运行。");
  if (pass.length < 12) {
    console.log("提醒：口令少于 12 个字符。密文是公开的，口令越长越安全，建议用 3～4 个词加数字，例如 eriya-maru-1023-hoshi。");
    const go = await ask("仍然用这个口令？(y/N) ");
    if (!/^y/i.test(go)) throw new Error("已取消，请重新运行并设一个更长的口令。");
  }

  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const base = await crypto.subtle.importKey("raw", enc.encode(pass), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: ITERATIONS },
    base, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(token)));

  const cfg = {
    v: 1,
    repo,
    path: "data.json",
    kdf: { name: "PBKDF2", hash: "SHA-256", iterations: ITERATIONS, salt: b64(salt) },
    cipher: { name: "AES-GCM", iv: b64(iv), ct: b64(ct) },
  };
  writeFileSync(OUT, `// 由 scripts/encrypt-token.mjs 生成，只含加密后的 token，可以公开。\nwindow.LEDGER_CONFIG=${JSON.stringify(cfg, null, 2)};\n`);
  console.log(`\n✓ 已生成 ${OUT}`);
  console.log("下一步：把这个 config.js 上传到 eriya-ledger 仓库根目录（覆盖旧的）。");
}

main().catch((e) => { console.error("\n✗ " + e.message); process.exit(1); });
