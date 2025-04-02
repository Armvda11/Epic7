#!/bin/bash

API_URL="http://localhost:8080/api"
EMAIL="hermas@example.com"
PASSWORD="toi"
PLAYER_HERO_IDS="[1,2]"
BOSS_HERO_ID=1

login() {
  echo "🔐 Connexion..."
  response=$(curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}")
  token=$(echo "$response" | grep -o '"token":"[^"]*' | cut -d':' -f2 | tr -d '"')
  if [ -z "$token" ]; then
    echo "❌ Échec de l'authentification"
    exit 1
  fi
  echo "✅ Connecté"
}

start_combat() {
  echo "⚔️  Lancement du combat..."
  curl -s -X POST "$API_URL/combat/reset" -H "Authorization: Bearer $token" > /dev/null
  curl -s -X POST "$API_URL/combat/start?bossHeroId=$BOSS_HERO_ID" \
    -H "Authorization: Bearer $token" \
    -H "Content-Type: application/json" \
    -d "$PLAYER_HERO_IDS" > /dev/null
  echo "🚀 Combat lancé !"
}

generate_hp_bar() {
  current=$1
  max=$2
  width=30
  filled=$(( current * width / max ))
  empty=$(( width - filled ))
  bar=$(printf '%*s' "$filled" '' | tr ' ' '█')
  bar+=$(printf '%*s' "$empty" '')
  echo "[$bar] $current/$max"
}

display_healthbars() {
  echo "❤️ État des PV :"
  curl -s "$API_URL/combat/status" -H "Authorization: Bearer $token" |
    jq -c '.participants[]' | while read -r p; do
    name=$(echo "$p" | jq -r '.name')
    side=$(echo "$p" | jq -r '.side')
    hp=$(echo "$p" | jq -r '.currentHp')
    max=6488; [[ "$name" == "Ml Piera" ]] && max=6149
    bar=$(generate_hp_bar "$hp" "$max")
    echo "$side - $name $bar"
  done
}

display_logs() {
  echo "📜 Dernier log :"
  curl -s "$API_URL/combat/status" -H "Authorization: Bearer $token" | jq '.logs[-1]'
}

get_sorted_indexes() {
  curl -s "$API_URL/combat/status" -H "Authorization: Bearer $token" |
    jq '[.participants | to_entries | sort_by(.value.totalSpeed) | reverse | .[].key]'
}

player_turn() {
  actorIndex=$1
  data=$(curl -s "$API_URL/combat/status" -H "Authorization: Bearer $token")
  actor=$(echo "$data" | jq ".participants[$actorIndex]")
  name=$(echo "$actor" | jq -r '.name')
  echo "🎮 Tour de : $name (index $actorIndex)"

  echo "🧠 Compétences disponibles :"
  echo "$actor" | jq -c '.skills[]' | while read -r s; do
    id=$(echo "$s" | jq -r '.id')
    sname=$(echo "$s" | jq -r '.name')
    cd=$(echo "$actor" | jq -r ".cooldowns[\"$id\"] // 0")
    echo "➡️  ID: $id | $sname | Cooldown: $cd"
  done

  read -p "💥 ID de la compétence ? " skillId

  echo "🎯 Cibles disponibles :"
  echo "$data" | jq -c '.participants | to_entries[] | select(.value.side == "BOSS" or .value.side == "ENEMY") | select(.value.currentHp > 0)' |
  while read -r enemy; do
    idx=$(echo "$enemy" | jq -r '.key')
    ename=$(echo "$enemy" | jq -r '.value.name')
    echo "➡️  Index $idx : $ename"
  done

  read -p "🎯 Index de la cible ? " targetIndex

  curl -s -X POST "$API_URL/combat/turn?actorIndex=$actorIndex&skillId=$skillId" \
    -H "Authorization: Bearer $token" \
    -H "Content-Type: application/json" \
    -d "[$targetIndex]" > /dev/null
  display_logs
}

boss_turn() {
  echo "🧠 Le boss joue automatiquement..."
  curl -s -X POST "$API_URL/combat/ai-turn" -H "Authorization: Bearer $token" > /dev/null
  display_logs
}

check_end() {
  result=$(curl -s "$API_URL/combat/status" -H "Authorization: Bearer $token" | jq -r '.logs[-1].targetName')
  if [[ "$result" == "Camp vainqueur : PLAYER" ]]; then
    echo "🏆 Victoire !"
    exit 0
  elif [[ "$result" == "Camp vainqueur : ENEMY" ]]; then
    echo "💀 Défaite..."
    exit 0
  fi
}

# === MAIN ===
login
start_combat
order=($(get_sorted_indexes | jq -r '.[]'))
total=${#order[@]}
turn=0

while true; do
  echo ""
  display_healthbars

  index=${order[$(( turn % total ))]}
  side=$(curl -s "$API_URL/combat/status" -H "Authorization: Bearer $token" | jq -r ".participants[$index].side")

  if [[ "$side" == "PLAYER" ]]; then
    player_turn "$index"
  else
    boss_turn
  fi

  check_end
  ((turn++))
done
