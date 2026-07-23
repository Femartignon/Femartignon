#!/bin/bash
set -euo pipefail

# Restaura os comandos, skill e perfil de trabalho pessoais do Felipe a partir
# do repositório privado femartignon/claude-templates-eventos, já que ~/.claude
# não é versionado e não sobrevive ao reciclo do container efêmero.

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

SYNC_DIR="/tmp/claude-templates-eventos-sync"
rm -rf "$SYNC_DIR"

if git clone --depth 1 https://github.com/femartignon/claude-templates-eventos "$SYNC_DIR" >/tmp/claude-templates-eventos-sync.log 2>&1; then
  mkdir -p ~/.claude/commands ~/.claude/skills
  cp "$SYNC_DIR"/commands/*.md ~/.claude/commands/
  cp -r "$SYNC_DIR"/skills/. ~/.claude/skills/
  cp "$SYNC_DIR"/CLAUDE.md ~/.claude/CLAUDE.md
  echo "claude-templates-eventos restaurado em ~/.claude"
else
  echo "aviso: não foi possível restaurar claude-templates-eventos (ver $SYNC_DIR ou o log acima)" >&2
fi
