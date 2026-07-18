#!/bin/bash
# session-bijwerken.sh — herinnert me er bij het afsluiten aan om mijn
# geheugen-bestand bij te werken, zodat ik de volgende keer verder kan.

INVOER="$(cat)"

# Niet opnieuw vuren als dit een reactie op de herinnering zelf is.
ACTIEF="$(printf '%s' "$INVOER" | jq -r '.stop_hook_active // false')"
[ "$ACTIEF" = "true" ] && exit 0

# De projectmap is twee niveaus boven dit script.
PROJECT="$(cd "$(dirname "$0")/../.." && pwd)"
GEHEUGEN="$PROJECT/sessie.md"
[ -f "$GEHEUGEN" ] || exit 0

# Geef een korte herinnering terug; de agent werkt het bestand dan even bij.
jq -n '{
  "decision": "block",
  "reason": "Voor je stopt: werk sessie.md even bij. Zet onder \"Laatst gedaan\" kort wat je deze sessie hebt gedaan, en onder \"Volgende stap\" wat de volgende stap is. Houd het kort en in gewone taal."
}'
