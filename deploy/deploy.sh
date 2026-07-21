#!/usr/bin/env bash
set -Eeuo pipefail

readonly APP_USER="piaobozhe"
readonly APP_HOME="/srv/wuwa"
readonly APP_ROOT="/srv/wuwa/app"
readonly BACKEND_DIR="${APP_ROOT}/Wuwa"
readonly FRONTEND_DIR="${APP_ROOT}/WuwaFrontend"
readonly VENV_DIR="${APP_ROOT}/.venv"
readonly ENV_FILE="/etc/wuwa/wuwa.env"
readonly WEB_ROOT="/var/www/wuwa"
readonly LOCK_FILE="/var/lock/wuwa-deploy.lock"
readonly SERVICE_NAME="wuwa.service"
readonly APP_PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

CURRENT_STEP="initialization"

on_error() {
    local exit_code=$?
    trap - ERR
    printf 'Deployment failed during: %s\n' "$CURRENT_STEP" >&2
    if command -v systemctl >/dev/null 2>&1; then
        systemctl --no-pager --full status "$SERVICE_NAME" >&2 || true
        journalctl -u "$SERVICE_NAME" -n 80 --no-pager >&2 || true
    fi
    exit "$exit_code"
}

fail() {
    printf '%s\n' "$1" >&2
    exit 1
}

require_command() {
    command -v "$1" >/dev/null 2>&1 || fail "Required command is missing: $1"
}

run_as_app() {
    runuser -u "$APP_USER" -- /usr/bin/env -i \
        HOME="$APP_HOME" \
        LANG="C.UTF-8" \
        PATH="$APP_PATH" \
        "$@"
}

run_as_app_with_environment() {
    runuser --preserve-environment -u "$APP_USER" -- /usr/bin/env \
        HOME="$APP_HOME" \
        "$@"
}

check_health() {
    local attempt
    for ((attempt = 1; attempt <= 12; attempt++)); do
        if curl --fail --silent --show-error --max-time 10 \
            "$WUWA_HEALTHCHECK_URL" >/dev/null; then
            return 0
        fi
        if ((attempt < 12)); then
            sleep 5
        fi
    done
    return 1
}

trap on_error ERR

if ((EUID != 0)); then
    fail "Run this deployment script as root or with sudo."
fi

for command_name in \
    chown curl find flock git id install journalctl npm python3 \
    rsync runuser systemctl; do
    require_command "$command_name"
done

id -u "$APP_USER" >/dev/null 2>&1 \
    || fail "Application user does not exist: $APP_USER"
[[ -d "$APP_ROOT/.git" ]] \
    || fail "Application repository is missing: $APP_ROOT"
[[ -r "$ENV_FILE" ]] \
    || fail "Production environment file is not readable: $ENV_FILE"

exec 9>"$LOCK_FILE"
flock -n 9 || fail "Another Wuwa deployment is already running."

cd "$APP_ROOT"

CURRENT_STEP="repository preflight"
current_branch="$(run_as_app git branch --show-current)"
[[ "$current_branch" == "main" ]] \
    || fail "Deployment checkout must be on main, found: $current_branch"
[[ -z "$(run_as_app git status --porcelain)" ]] \
    || fail "Deployment checkout has uncommitted changes."

CURRENT_STEP="fast-forward source update"
run_as_app git fetch origin main
run_as_app git merge --ff-only origin/main

CURRENT_STEP="production environment validation"
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

for variable_name in \
    WUWA_ENV DJANGO_SECRET_KEY DJANGO_ALLOWED_HOSTS DB_NAME DB_USER \
    DB_PASSWORD DB_HOST DB_PORT WUWA_HEALTHCHECK_URL; do
    [[ -n "${!variable_name:-}" ]] \
        || fail "Required production value is empty: $variable_name"
done
[[ "$WUWA_ENV" == "production" ]] \
    || fail "WUWA_ENV must be production."
[[ "$WUWA_HEALTHCHECK_URL" == https://* ]] \
    || fail "WUWA_HEALTHCHECK_URL must use HTTPS."
[[ "$DJANGO_SECRET_KEY" != CHANGE_ME* ]] \
    || fail "DJANGO_SECRET_KEY still contains the example placeholder."
[[ "$DB_PASSWORD" != CHANGE_ME* ]] \
    || fail "DB_PASSWORD still contains the example placeholder."
[[ "$DJANGO_ALLOWED_HOSTS" != *example.com* ]] \
    || fail "DJANGO_ALLOWED_HOSTS still contains example.com."
[[ "$WUWA_HEALTHCHECK_URL" != *example.com* ]] \
    || fail "WUWA_HEALTHCHECK_URL still contains example.com."

CURRENT_STEP="Python virtual environment"
if [[ ! -x "$VENV_DIR/bin/python" ]]; then
    run_as_app python3 -m venv "$VENV_DIR"
fi
run_as_app "$VENV_DIR/bin/python" -m pip install \
    --disable-pip-version-check \
    --requirement Wuwa/requirements.txt

CURRENT_STEP="Django deployment check"
run_as_app_with_environment "$VENV_DIR/bin/python" \
    Wuwa/manage.py check --deploy

CURRENT_STEP="frontend dependency install"
(
    cd "$FRONTEND_DIR"
    run_as_app npm ci --no-audit --no-fund
)

CURRENT_STEP="frontend production build"
(
    cd "$FRONTEND_DIR"
    run_as_app npm run build
)

CURRENT_STEP="database migrations"
run_as_app_with_environment "$VENV_DIR/bin/python" \
    Wuwa/manage.py migrate --noinput

CURRENT_STEP="Django static collection"
run_as_app_with_environment "$VENV_DIR/bin/python" \
    Wuwa/manage.py collectstatic --noinput

CURRENT_STEP="frontend publish"
install -d -o root -g www-data -m 0755 "$WEB_ROOT"
rsync -a --delete "$FRONTEND_DIR/dist/" "$WEB_ROOT/"
chown -R root:www-data "$WEB_ROOT"
find "$WEB_ROOT" -type d -exec chmod 0755 {} +
find "$WEB_ROOT" -type f -exec chmod 0644 {} +

CURRENT_STEP="application restart"
systemctl restart "$SERVICE_NAME"
systemctl is-active --quiet "$SERVICE_NAME"

CURRENT_STEP="external health check"
check_health

deployed_revision="$(run_as_app git rev-parse --short HEAD)"
printf 'Wuwa deployment completed at revision %s.\n' "$deployed_revision"
