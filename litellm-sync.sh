#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/backend/.env}"
LITELLM_BASE="${LITELLM_BASE:-https://litellm.lowjungxuan.dpdns.org}"
LITELLM_MASTER_KEY="${LITELLM_MASTER_KEY:-sk-eaf8e0a523a5516ed8ce0698f87a8f9f1ceaf06fc398c2b58a48978e3a5f14bc}"
KEY_ALIAS="${KEY_ALIAS:-grim-centralized-api}"
TEAM_ID="${TEAM_ID:-grim}"
TEAM_ALIAS="${TEAM_ALIAS:-GRIM}"
DEFAULT_MODEL="${DEFAULT_MODEL:-}"

usage() {
  cat <<'EOF'
Usage:
  ./litellm-sync.sh

Options:
  --server-env-keys        Send os.environ/KEY_NAME references to LiteLLM.
                           By default provider API keys from backend/.env are sent inline,
                           which avoids missing env vars inside the LiteLLM proxy container.
  --no-clean-existing      Do not delete existing GRIM model entries before re-registering.
  --skip-tests             Do not run LiteLLM chat completion tests after registration.
  --skip-key-generate      Register models and check model info only.
  --help                   Show this help.

Environment:
  ENV_FILE                 Env file to load. Defaults to backend/.env.
  LITELLM_BASE             LiteLLM API root. Defaults to https://litellm.lowjungxuan.dpdns.org
  LITELLM_MASTER_KEY       LiteLLM master key. Defaults to the hard-coded key in this script.
  KEY_ALIAS                Virtual key alias. Defaults to grim-centralized-api.
  TEAM_ID                  LiteLLM team id. Defaults to grim.
  TEAM_ALIAS               LiteLLM team name. Defaults to GRIM.
  DEFAULT_MODEL            Model hint printed at the end. Defaults to the DeepSeek final model alias.
EOF
}

INLINE_PROVIDER_KEYS=true
GENERATE_KEY=true
CLEAN_EXISTING=true
TEST_CONNECTIONS=true

while [[ $# -gt 0 ]]; do
  case "$1" in
    --server-env-keys)
      INLINE_PROVIDER_KEYS=false
      shift
      ;;
    --no-clean-existing)
      CLEAN_EXISTING=false
      shift
      ;;
    --skip-tests)
      TEST_CONNECTIONS=false
      shift
      ;;
    --skip-key-generate)
      GENERATE_KEY=false
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Env file not found: $ENV_FILE" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

OPENAI_UPSTREAM_API_KEY="${OPENAI_UPSTREAM_API_KEY:-${OPENAI_API_KEY:-}}"
DEEPSEEK_UPSTREAM_API_KEY="${DEEPSEEK_UPSTREAM_API_KEY:-${DEEPSEEK_API_KEY:-}}"
NVIDIA_UPSTREAM_API_KEY="${NVIDIA_UPSTREAM_API_KEY:-${NVIDIA_API_KEY:-}}"
OPENROUTER_UPSTREAM_API_KEY="${OPENROUTER_UPSTREAM_API_KEY:-${OPENROUTER_API_KEY:-}}"

require_var() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required environment variable: $name" >&2
    exit 1
  fi
}

require_var LITELLM_MASTER_KEY

if [[ "$INLINE_PROVIDER_KEYS" == true ]]; then
  require_var OPENAI_UPSTREAM_API_KEY
  require_var DEEPSEEK_UPSTREAM_API_KEY
  require_var NVIDIA_UPSTREAM_API_KEY
  require_var OPENROUTER_UPSTREAM_API_KEY
fi

api_key_value() {
  local env_name="$1"
  if [[ "$INLINE_PROVIDER_KEYS" == true ]]; then
    printf '%s' "${!env_name}"
  else
    printf 'os.environ/%s' "$env_name"
  fi
}

post_json() {
  local path="$1"
  local payload="$2"

  curl --fail-with-body --silent --show-error \
    -X POST "$LITELLM_BASE$path" \
    -H "Authorization: Bearer $LITELLM_MASTER_KEY" \
    -H "Content-Type: application/json" \
    --data "$payload"
}

get_json() {
  local path="$1"

  curl --fail-with-body --silent --show-error \
    "$LITELLM_BASE$path" \
    -H "Authorization: Bearer $LITELLM_MASTER_KEY"
}

delete_json() {
  local path="$1"
  local payload="$2"

  curl --fail-with-body --silent --show-error \
    -X POST "$LITELLM_BASE$path" \
    -H "Authorization: Bearer $LITELLM_MASTER_KEY" \
    -H "Content-Type: application/json" \
    --data "$payload"
}

json_string() {
  local value="$1"
  if command -v jq >/dev/null 2>&1; then
    jq -Rn --arg value "$value" '$value'
  else
    node -e 'process.stdout.write(JSON.stringify(process.argv[1]))' "$value"
  fi
}

clean_existing_models() {
  local models=("$@")
  local filter

  if ! command -v jq >/dev/null 2>&1; then
    echo "Skipping cleanup because jq is not installed."
    return
  fi

  filter="$(printf '%s\n' "${models[@]}" | jq -R . | jq -s .)"
  model_ids=()
  while IFS= read -r model_id; do
    model_ids+=("$model_id")
  done < <(
    get_json "/model/info" |
      jq -r --argjson models "$filter" \
        '.data[]? | select((.model_name | startswith("grim-")) or (.model_name as $name | $models | index($name))) | .model_info.id // empty'
  )

  if [[ "${#model_ids[@]}" -eq 0 ]]; then
    return
  fi

  echo "Cleaning ${#model_ids[@]} existing GRIM model entr$(if [[ "${#model_ids[@]}" -eq 1 ]]; then printf 'y'; else printf 'ies'; fi)"
  for model_id in "${model_ids[@]}"; do
    delete_json "/model/delete" "{\"id\":$(json_string "$model_id")}" >/dev/null
  done
}

sanitize_model_name() {
  printf '%s' "$1" |
    tr '[:upper:]' '[:lower:]' |
    sed -E 's#[^a-z0-9._-]+#-#g; s#-+#-#g; s#^-##; s#-$##'
}

registered_models=()
registered_provider_models=()
registered_api_key_envs=()
registered_api_bases=()
cleanup_models=()
registered_models_count=0

is_registered_model() {
  local model_name="$1"
  local registered_model

  if [[ "$registered_models_count" -eq 0 ]]; then
    return 1
  fi

  for registered_model in "${registered_models[@]}"; do
    if [[ "$registered_model" == "$model_name" ]]; then
      return 0
    fi
  done

  return 1
}

model_payload() {
  local model_name="$1"
  local provider_model="$2"
  local api_key="$3"
  local api_base="$4"

  cat <<EOF
{
  "model_name": $(json_string "$model_name"),
  "litellm_params": {
    "model": $(json_string "$provider_model"),
    "api_key": $(json_string "$api_key"),
    "api_base": $(json_string "$api_base")
  }
}
EOF
}

sync_model() {
  local model_name="$1"
  local provider_model="$2"
  local api_key="$3"
  local api_base="$4"

  echo "Registering $model_name -> $provider_model"
  post_json "/model/new" "$(model_payload "$model_name" "$provider_model" "$api_key" "$api_base")" >/dev/null
}

add_cleanup_model() {
  local model_name="$1"
  local cleanup_model

  if [[ -z "$model_name" ]]; then
    return
  fi

  for cleanup_model in "${cleanup_models[@]:-}"; do
    if [[ "$cleanup_model" == "$model_name" ]]; then
      return
    fi
  done

  cleanup_models+=("$model_name")
}

add_env_model() {
  local provider="$1"
  local purpose="$2"
  local raw_model="$3"
  local litellm_model="$4"
  local api_key_env="$5"
  local api_base="$6"
  local model_name

  if [[ -z "$raw_model" ]]; then
    return
  fi

  model_name="$provider-$purpose"
  add_cleanup_model "$model_name"
  add_cleanup_model "$provider-$(sanitize_model_name "$raw_model")"

  if is_registered_model "$model_name"; then
    return
  fi

  registered_models+=("$model_name")
  registered_provider_models+=("$litellm_model")
  registered_api_key_envs+=("$api_key_env")
  registered_api_bases+=("$api_base")
  registered_models_count=$((registered_models_count + 1))
}

sync_registered_models() {
  local i=0

  while [[ "$i" -lt "$registered_models_count" ]]; do
    sync_model \
      "${registered_models[$i]}" \
      "${registered_provider_models[$i]}" \
      "$(api_key_value "${registered_api_key_envs[$i]}")" \
      "${registered_api_bases[$i]}"
    i=$((i + 1))
  done
}

test_model() {
  local model_name="$1"
  local payload
  local response
  local body
  local status

  payload="$(cat <<EOF
{
  "model": $(json_string "$model_name"),
  "messages": [
    {
      "role": "user",
      "content": "Reply with exactly: ok"
    }
  ],
  "max_tokens": 32
}
EOF
)"

  response="$(
    curl --silent --show-error \
      --write-out $'\n%{http_code}' \
      -X POST "$LITELLM_BASE/v1/chat/completions" \
      -H "Authorization: Bearer $LITELLM_MASTER_KEY" \
      -H "Content-Type: application/json" \
      --data "$payload"
  )"

  status="${response##*$'\n'}"
  body="${response%$'\n'*}"

  if [[ "$status" =~ ^2 ]]; then
    echo "PASS $model_name"
    return 0
  fi

  echo "FAIL $model_name HTTP $status"
  if command -v jq >/dev/null 2>&1; then
    printf '%s\n' "$body" | jq -r '.error.message // .message // .' 2>/dev/null || true
  else
    printf '%s\n' "$body"
  fi
  return 1
}

test_models() {
  local failed=0
  local model_name

  echo "Testing LiteLLM model connections"
  if [[ "$registered_models_count" -eq 0 ]]; then
    echo "No GRIM team models were registered; nothing to test." >&2
    exit 1
  fi

  for model_name in "${registered_models[@]}"; do
    test_model "$model_name" || failed=1
  done

  if [[ "$failed" -ne 0 ]]; then
    echo "One or more LiteLLM connection tests failed." >&2
    exit 1
  fi
}

ensure_team() {
  local models_json
  local payload

  models_json="$(json_array "${registered_models[@]}")"
  payload="$(cat <<EOF
{
  "team_id": $(json_string "$TEAM_ID"),
  "team_alias": $(json_string "$TEAM_ALIAS"),
  "models": $models_json
}
EOF
)"

  echo "Ensuring LiteLLM team $TEAM_ALIAS ($TEAM_ID)"
  if post_json "/team/new" "$payload" >/dev/null 2>&1; then
    return
  fi

  post_json "/team/update" "$payload" >/dev/null
}

add_models_to_team() {
  local payload

  payload="$(cat <<EOF
{
  "team_id": $(json_string "$TEAM_ID"),
  "models": $(json_array "${registered_models[@]}")
}
EOF
)"

  echo "Adding models to LiteLLM team $TEAM_ALIAS ($TEAM_ID)"
  post_json "/team/model/add" "$payload" >/dev/null
}

delete_existing_key_alias() {
  local key_hashes=()
  local key_hash
  local key_info

  if ! command -v jq >/dev/null 2>&1; then
    return
  fi

  while IFS= read -r key_hash; do
    key_hashes+=("$key_hash")
  done < <(get_json "/key/list" | jq -r '.keys[]? // empty')

  for key_hash in "${key_hashes[@]}"; do
    key_info="$(get_json "/key/info?key=$key_hash")"
    if [[ "$(printf '%s\n' "$key_info" | jq -r '.info.key_alias // empty')" == "$KEY_ALIAS" ]]; then
      echo "Deleting existing LiteLLM virtual key alias: $KEY_ALIAS"
      post_json "/key/delete" "{\"key_aliases\":[$(json_string "$KEY_ALIAS")]}" >/dev/null
      return
    fi
  done
}

json_array() {
  if command -v jq >/dev/null 2>&1; then
    printf '%s\n' "$@" | jq -R . | jq -s .
    return
  fi

  local first=true
  local value
  printf '['
  for value in "$@"; do
    if [[ "$first" == true ]]; then
      first=false
    else
      printf ','
    fi
    json_string "$value"
  done
  printf ']'
}

OPENAI_API_BASE="${OPENAI_BASE_URL:-https://api.openai.com/v1}"
DEEPSEEK_API_BASE="${DEEPSEEK_BASE_URL:-https://api.deepseek.com}"
NVIDIA_API_BASE="${NVIDIA_BASE_URL:-https://integrate.api.nvidia.com/v1}"
OPENROUTER_API_BASE="${OPENROUTER_BASE_URL:-https://openrouter.ai/api/v1}"
OPENAI_UPSTREAM_API_BASE="${OPENAI_UPSTREAM_BASE_URL:-${OPENAI_BASE_URL:-https://api.openai.com/v1}}"
DEEPSEEK_UPSTREAM_API_BASE="${DEEPSEEK_UPSTREAM_BASE_URL:-${DEEPSEEK_BASE_URL:-https://api.deepseek.com}}"
NVIDIA_UPSTREAM_API_BASE="${NVIDIA_UPSTREAM_BASE_URL:-${NVIDIA_BASE_URL:-https://integrate.api.nvidia.com/v1}}"
OPENROUTER_UPSTREAM_API_BASE="${OPENROUTER_UPSTREAM_BASE_URL:-${OPENROUTER_BASE_URL:-https://openrouter.ai/api/v1}}"

OPENAI_UPSTREAM_EXTRACT_MODEL="${OPENAI_UPSTREAM_EXTRACT_MODEL:-${OPENAI_EXTRACT_MODEL:-}}"
OPENAI_UPSTREAM_FINAL_MODEL="${OPENAI_UPSTREAM_FINAL_MODEL:-${OPENAI_FINAL_MODEL:-}}"
DEEPSEEK_UPSTREAM_EXTRACT_MODEL="${DEEPSEEK_UPSTREAM_EXTRACT_MODEL:-${DEEPSEEK_EXTRACT_MODEL:-}}"
DEEPSEEK_UPSTREAM_FINAL_MODEL="${DEEPSEEK_UPSTREAM_FINAL_MODEL:-${DEEPSEEK_FINAL_MODEL:-}}"
NVIDIA_UPSTREAM_EXTRACT_MODEL="${NVIDIA_UPSTREAM_EXTRACT_MODEL:-${NVIDIA_EXTRACT_MODEL:-}}"
NVIDIA_UPSTREAM_FINAL_MODEL="${NVIDIA_UPSTREAM_FINAL_MODEL:-${NVIDIA_FINAL_MODEL:-}}"
OPENROUTER_UPSTREAM_EXTRACT_MODEL="${OPENROUTER_UPSTREAM_EXTRACT_MODEL:-${OPENROUTER_EXTRACT_MODEL:-}}"
OPENROUTER_UPSTREAM_FINAL_MODEL="${OPENROUTER_UPSTREAM_FINAL_MODEL:-${OPENROUTER_FINAL_MODEL:-}}"

DEFAULT_MODEL="${DEFAULT_MODEL:-deepseek-reasoning}"

add_env_model "openai" "image" "$OPENAI_UPSTREAM_EXTRACT_MODEL" "openai/$OPENAI_UPSTREAM_EXTRACT_MODEL" "OPENAI_UPSTREAM_API_KEY" "$OPENAI_UPSTREAM_API_BASE"
add_env_model "openai" "reasoning" "$OPENAI_UPSTREAM_FINAL_MODEL" "openai/$OPENAI_UPSTREAM_FINAL_MODEL" "OPENAI_UPSTREAM_API_KEY" "$OPENAI_UPSTREAM_API_BASE"
add_env_model "deepseek" "image" "$DEEPSEEK_UPSTREAM_EXTRACT_MODEL" "deepseek/$DEEPSEEK_UPSTREAM_EXTRACT_MODEL" "DEEPSEEK_UPSTREAM_API_KEY" "$DEEPSEEK_UPSTREAM_API_BASE"
add_env_model "deepseek" "reasoning" "$DEEPSEEK_UPSTREAM_FINAL_MODEL" "deepseek/$DEEPSEEK_UPSTREAM_FINAL_MODEL" "DEEPSEEK_UPSTREAM_API_KEY" "$DEEPSEEK_UPSTREAM_API_BASE"
add_env_model "nvidia" "image" "$NVIDIA_UPSTREAM_EXTRACT_MODEL" "nvidia_nim/$NVIDIA_UPSTREAM_EXTRACT_MODEL" "NVIDIA_UPSTREAM_API_KEY" "$NVIDIA_UPSTREAM_API_BASE"
add_env_model "nvidia" "reasoning" "$NVIDIA_UPSTREAM_FINAL_MODEL" "nvidia_nim/$NVIDIA_UPSTREAM_FINAL_MODEL" "NVIDIA_UPSTREAM_API_KEY" "$NVIDIA_UPSTREAM_API_BASE"
add_env_model "openrouter" "image" "$OPENROUTER_UPSTREAM_EXTRACT_MODEL" "openrouter/$OPENROUTER_UPSTREAM_EXTRACT_MODEL" "OPENROUTER_UPSTREAM_API_KEY" "$OPENROUTER_UPSTREAM_API_BASE"
add_env_model "openrouter" "reasoning" "$OPENROUTER_UPSTREAM_FINAL_MODEL" "openrouter/$OPENROUTER_UPSTREAM_FINAL_MODEL" "OPENROUTER_UPSTREAM_API_KEY" "$OPENROUTER_UPSTREAM_API_BASE"

if [[ "$CLEAN_EXISTING" == true ]]; then
  clean_existing_models "${cleanup_models[@]}"
fi

ensure_team

sync_registered_models

ensure_team
add_models_to_team

echo "Checking registered models"
MODEL_INFO="$(get_json "/model/info")"
if command -v jq >/dev/null 2>&1; then
  printf '%s\n' "$MODEL_INFO" | jq -r '.data[]?.model_name // .model_name? // empty' | sort
else
  printf '%s\n' "$MODEL_INFO"
fi

if [[ "$TEST_CONNECTIONS" == true ]]; then
  test_models
fi

if [[ "$GENERATE_KEY" == true ]]; then
  echo "Generating LiteLLM virtual key alias: $KEY_ALIAS"
  delete_existing_key_alias
KEY_RESPONSE="$(post_json "/key/generate" "$(cat <<EOF
{
  "models": $(json_array "${registered_models[@]}"),
  "team_id": $(json_string "$TEAM_ID"),
  "key_alias": $(json_string "$KEY_ALIAS")
}
EOF
)")"

  if command -v jq >/dev/null 2>&1; then
    VIRTUAL_KEY="$(printf '%s\n' "$KEY_RESPONSE" | jq -r '.key // .token // .generated_key // empty')"
    if [[ -n "$VIRTUAL_KEY" ]]; then
      cat <<EOF

LiteLLM virtual key:
$VIRTUAL_KEY

Use in GRIM:
BASE_URL=$LITELLM_BASE/v1
API_KEY=$VIRTUAL_KEY
MODEL=$DEFAULT_MODEL
EOF
    else
      printf '%s\n' "$KEY_RESPONSE" | jq .
    fi
  else
    printf '%s\n' "$KEY_RESPONSE"
  fi
else
  cat <<EOF

Key generation skipped.
Use in GRIM after creating a virtual key:
BASE_URL=$LITELLM_BASE/v1
API_KEY=<LiteLLM virtual key>
MODEL=$DEFAULT_MODEL
EOF
fi
