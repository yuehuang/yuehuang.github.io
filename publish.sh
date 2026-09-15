#!/bin/bash
# 一键发布到 GitHub Pages（用户主站 <用户名>.github.io）
# 用法：bash publish.sh      （需要先装 gh 并登录一次：brew install gh && gh auth login）
set -e
cd "$(dirname "$0")"

command -v gh >/dev/null || { echo "❌ 没装 gh：brew install gh"; exit 1; }
gh auth status >/dev/null 2>&1 || {
  echo "❌ 还没登录 GitHub。先跑一次（会开浏览器）："; echo "   gh auth login"; exit 1; }

USER_NAME=$(gh api user -q .login)
REPO="$USER_NAME.github.io"
echo "GitHub 用户名：$USER_NAME → 站点 $REPO"

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  git init -q
  git add -A
  git commit -qm "小朋友工具箱 初始版本：看板 + 田字格字帖生成器"
fi
git branch -M main

if gh repo view "$REPO" >/dev/null 2>&1; then
  echo "仓库已存在，直接推送…"
  git remote get-url origin >/dev/null 2>&1 || git remote add origin "https://github.com/$USER_NAME/$REPO.git"
  git push -u origin main
else
  echo "创建仓库并推送…"
  gh repo create "$REPO" --public --source=. --remote=origin --push
fi

echo
echo "✅ 完成。1~2 分钟后访问：https://$USER_NAME.github.io/"
echo "   （若 404：仓库 Settings → Pages → Source 选 Deploy from a branch → main / root）"
