#!/bin/bash
# session-laden.sh — laadt bij het opstarten mijn geheugen-bestand in.
# Zo weet de agent meteen waar ik gebleven was, zonder dat ik iets hoef te vragen.

# De projectmap is twee niveaus boven dit script (.claude/hooks/ -> projectmap).
PROJECT="$(cd "$(dirname "$0")/../.." && pwd)"
GEHEUGEN="$PROJECT/sessie.md"

# Geen geheugen-bestand? Dan niets doen.
[ -f "$GEHEUGEN" ] || exit 0

# Lees het bestand en geef het mee als context bij het opstarten van de sessie.
INHOUD="$(cat "$GEHEUGEN")"
cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": $(printf '%s' "$INHOUD" | jq -Rs .)
  }
}
EOF
