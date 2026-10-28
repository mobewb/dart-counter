#!/bin/sh
# Fails unless the first line of the commit message file follows Conventional
# Commits: <type>(<scope>)!: <summary>. Used by the commit-msg hook and by CI.
subject=$(head -n 1 "$1")
case "$subject" in
  Merge\ *|Revert\ *|fixup!\ *|squash!\ *) exit 0 ;;
esac
if printf '%s\n' "$subject" | grep -qE '^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([a-z0-9-]+\))?!?: [^ ].*[^.]$'; then
  exit 0
fi
echo "Not a Conventional Commits subject: $subject" >&2
echo "Expected: <type>(<scope>): <summary>, e.g. fix(keypad): give the bull its own button" >&2
exit 1
