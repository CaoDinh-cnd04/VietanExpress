#!/bin/sh
# Không cấu hình Tailscale: chạy API trực tiếp như trước.
set -eu

fail() { printf '%s\n' "$1" >&2; exit 1; }
if [ -z "${TS_AUTHKEY:-}" ] && [ -z "${TS_SQL_HOST:-}" ]; then
    exec dotnet VietAnExpress.API.dll "$@"
fi
[ -n "${TS_AUTHKEY:-}" ] || fail 'Tailscale: missing TS_AUTHKEY in Render Environment.'
[ -n "${TS_SQL_HOST:-}" ] || fail 'Tailscale: missing TS_SQL_HOST in Render Environment.'

# Chỉ cho phép IP IPv4 Tailscale trong 100.64.0.0/10, tránh chuyển tiếp ra Internet/LAN.
octet='(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])'
printf '%s\n' "$TS_SQL_HOST" | grep -Eq "^100\.(6[4-9]|[7-9][0-9]|1[01][0-9]|12[0-7])\.$octet\.$octet$" \
    || fail 'Tailscale: TS_SQL_HOST must be a Tailscale IPv4 address (100.64.0.0/10).'
TS_SQL_PORT=${TS_SQL_PORT:-1433}
case "$TS_SQL_PORT" in ''|*[!0-9]*) fail 'Tailscale: TS_SQL_PORT must be a TCP port.' ;; esac
[ "$TS_SQL_PORT" -ge 1 ] && [ "$TS_SQL_PORT" -le 65535 ] \
    || fail 'Tailscale: TS_SQL_PORT must be between 1 and 65535.'
export TS_SQL_HOST TS_SQL_PORT

umask 077
state_dir=$(mktemp -d /tmp/vietan-tailscale.XXXXXX)
VIETAN_TS_SOCKET="$state_dir/tailscaled.sock"
export VIETAN_TS_SOCKET
daemon_pid=''
relay_pid=''
api_pid=''
cleanup() {
    trap - EXIT INT TERM
    # Dừng API và các helper khi Render dừng/redeploy container.
    for child_pid in "$api_pid" "$relay_pid" "$daemon_pid"; do
        if [ -n "$child_pid" ]; then kill "$child_pid" 2>/dev/null || true; fi
    done
    for child_pid in "$api_pid" "$relay_pid" "$daemon_pid"; do
        if [ -n "$child_pid" ]; then wait "$child_pid" 2>/dev/null || true; fi
    done
    rm -f "$state_dir/authkey" "$VIETAN_TS_SOCKET"
    rmdir "$state_dir" 2>/dev/null || true
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

# Khóa không xuất hiện trong dòng lệnh hoặc môi trường của API/các helper.
printf '%s' "$TS_AUTHKEY" > "$state_dir/authkey"
unset TS_AUTHKEY
tailscaled --tun=userspace-networking --state=mem: --statedir="$state_dir" --socket="$VIETAN_TS_SOCKET" &
daemon_pid=$!
attempt=0
until tailscale --socket="$VIETAN_TS_SOCKET" status --json >/dev/null 2>&1; do
    kill -0 "$daemon_pid" 2>/dev/null || fail 'Tailscale: daemon exited during startup.'
    attempt=$((attempt + 1))
    [ "$attempt" -lt 30 ] || fail 'Tailscale: daemon startup timed out.'
    sleep 1
done
tailscale --socket="$VIETAN_TS_SOCKET" up \
    --auth-key="file:$state_dir/authkey" --timeout=60s \
    --hostname=vietan-render --accept-dns=false --accept-routes=false --shields-up
rm -f "$state_dir/authkey"

# SQL client .NET không dùng SOCKS qua ALL_PROXY. Đưa TCP vào loopback để giữ nguyên module.
# Cổng 14330 chỉ nghe 127.0.0.1, không publish ra Render/Tailscale.
socat TCP4-LISTEN:14330,bind=127.0.0.1,reuseaddr,fork \
    'EXEC:/bin/sh /app/scripts/tailscale-sql.sh' &
relay_pid=$!
sleep 1
kill -0 "$daemon_pid" 2>/dev/null || fail 'Tailscale: daemon exited before API startup.'
kill -0 "$relay_pid" 2>/dev/null || fail 'Tailscale: SQL relay failed to start.'
printf 'Tailscale SQL relay ready: 127.0.0.1:14330 -> %s:%s\n' "$TS_SQL_HOST" "$TS_SQL_PORT"

dotnet VietAnExpress.API.dll "$@" &
api_pid=$!
while kill -0 "$api_pid" 2>/dev/null; do
    kill -0 "$daemon_pid" 2>/dev/null || fail 'Tailscale: daemon exited; stopping API.'
    kill -0 "$relay_pid" 2>/dev/null || fail 'Tailscale: SQL relay exited; stopping API.'
    sleep 1
done
api_exit=0
wait "$api_pid" || api_exit=$?
exit "$api_exit"
