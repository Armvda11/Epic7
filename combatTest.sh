#!/bin/bash

API_URL="http://localhost:8080/api"
EMAIL="hermas@example.com"
PASSWORD="toi"
PLAYER_HERO_IDS="[1,2]"
BOSS_HERO_ID=1
STATE_FILE="state.json"

token=""

function login() {
  echo "🔐 Connexion..."
  token=$(curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}" | jq -r .token)

  if [[ "$token" == "null" || -z "$token" ]]; then
    echo "❌ Erreur d'authentification"
    exit 1
  fi
  echo "✅ Connecté"
}

function start_combat() {
  echo "⚔️  Lancement du combat..."
  curl -s -X POST "$API_URL/combat/start?bossHeroId=$BOSS_HERO_ID" \
    -H "Authorization: Bearer $token" \
    -H "Content-Type: application/json" \
    -d "$PLAYER_HERO_IDS" > "$STATE_FILE"

  if ! jq empty "$STATE_FILE" 2>/dev/null; then
    echo "❌ Problème au lancement du combat"
    exit 1
  fi
  echo "🚀 Combat lancé !"
}

function get_ordered_indexes() {
  jq -r '.participants | to_entries | sort_by(.value.totalSpeed) | reverse | .[].key' "$STATE_FILE"
}

function print_health_bar() {
  current=$1
  max=$2
  total=30
  [ -z "$current" ] || [ -z "$max" ] || [ "$max" -eq 0 ] && echo "[?/?]" && return
  filled=$((current * total / max))
  empty=$((total - filled))
  bar=$(printf "%-${filled}s" "" | tr ' ' '█')
  bar+=$(printf "%-${empty}s" "" | tr ' ' ' ')
  echo "[$bar] $current/$max"
}

function print_status() {
  echo "❤️ État des PV :"
  jq -c '.participants[]' "$STATE_FILE" | while read -r p; do
    name=$(echo "$p" | jq -r .name)
    side=$(echo "$p" | jq -r .side)
    hp=$(echo "$p" | jq .currentHp)
    maxhp=$(echo "$p" | jq '.maxHp // .currentHp')
    echo -n "$side - $name "
    print_health_bar "$hp" "$maxhp"
  done
}

function is_alive() {
  idx=$1
  jq ".participants[$idx].currentHp > 0" "$STATE_FILE"
}

function is_player() {
  idx=$1
  jq -r ".participants[$idx].side" "$STATE_FILE"
}

function get_name() {
  idx=$1
  jq -r ".participants[$idx].name" "$STATE_FILE"
}

function get_target_index_for() {
  side=$1
  if [ "$side" = "PLAYER" ]; then
    jq '.participants | to_entries | map(select(.value.side=="BOSS" and .value.currentHp > 0)) | .[0].key' "$STATE_FILE"
  else
    jq '.participants | to_entries | map(select(.value.side=="PLAYER" and .value.currentHp > 0)) | .[0].key' "$STATE_FILE"
  fi
}

function get_available_skill() {
  idx=$1
  jq -c ".participants[$idx].skills[] | select(.category==\"ACTIVE\")" "$STATE_FILE" | while read -r s; do
    id=$(echo "$s" | jq .id)
    name=$(echo "$s" | jq -r .name)
    cooldown=$(jq ".participants[$idx].cooldowns[\"$id\"] // 0" "$STATE_FILE")
    if [[ "$cooldown" =~ ^[0-9]+$ && "$cooldown" -eq 0 ]]; then
      echo "$id|$name"
    fi
  done
}

function check_end() {
  playerAlive=$(jq '[.participants[] | select(.side == "PLAYER" and .currentHp > 0)] | length' "$STATE_FILE")
  bossAlive=$(jq '[.participants[] | select(.side == "BOSS" and .currentHp > 0)] | length' "$STATE_FILE")

  if [ "$playerAlive" -eq 0 ]; then echo "💀 Défaite !" && exit 0; fi
  if [ "$bossAlive" -eq 0 ]; then echo "🏆 Victoire !" && exit 0; fi
}

### --- Lancement du combat ---
login
start_combat

order=($(get_ordered_indexes))
indexCount=${#order[@]}
currentTurn=0

while true; do
  idx=${order[$((currentTurn % indexCount))]}
  alive=$(is_alive "$idx")
  side=$(is_player "$idx")
  name=$(get_name "$idx")

  print_status
  check_end

  if [ "$alive" = "true" ]; then
    echo "🎮 Tour de $name (index $idx)"
    if [ "$side" = "PLAYER" ]; then
      echo "🧠 Compétences disponibles :"
      get_available_skill "$idx"
      echo -n "💥 ID de la compétence ? "
      read skillId

      cd=$(jq ".participants[$idx].cooldowns[\"$skillId\"] // 0" "$STATE_FILE")
      [[ "$cd" =~ ^[0-9]+$ ]] || cd=0
      if [ "$cd" -gt 0 ]; then
        echo "❌ Compétence en cooldown ($cd tour restant)"
        continue
      fi

      target=$(get_target_index_for "$side")
    else
      echo "🤖 Le boss réfléchit..."
      skillLine=$(get_available_skill "$idx" | head -n1)
      if [ -z "$skillLine" ]; then
        echo "⏳ Aucune compétence dispo pour $name. Skip."
        currentTurn=$((currentTurn + 1))
        continue
      fi
      skillId=$(echo "$skillLine" | cut -d "|" -f1)
      target=$(get_target_index_for "$side")
    fi

    curl -s -X POST "$API_URL/combat/turn?actorIndex=$idx&skillId=$skillId" \
      -H "Authorization: Bearer $token" \
      -H "Content-Type: application/json" \
      -d "[$target]" > "$STATE_FILE"

    echo "📜 Logs du tour :"
    jq -c '.logs[]' "$STATE_FILE"
  fi

  currentTurn=$((currentTurn + 1))
done