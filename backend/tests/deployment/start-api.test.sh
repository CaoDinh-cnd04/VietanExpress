#!/bin/sh
# Kiểm tra vòng đời entrypoint bằng tiến trình giả, không gọi Tailscale/SQL thật.
set -eu
repo_root=$(CDPATH='' cd -- "$(dirname "$0")/../.." && pwd)
test_dir=$(mktemp -d)
trap 'rm -rf "$test_dir"' EXIT
mkdir "$test_dir/bin"
export MOCK_TRACE="$test_dir/trace"
export PATH="$test_dir/bin:$PATH"

cat > "$test_dir/bin/tailscaled" <<'EOF'
#!/bin/sh
[ -z "${TS_AUTHKEY:-}" ] || exit 90
echo "daemon $$" >> "$MOCK_TRACE"
case "${MOCK_MODE:-}" in daemon-fail) exit 12 ;; esac
exec sleep 60
EOF
cat > "$test_dir/bin/tailscale" <<'EOF'
#!/bin/sh
[ -z "${TS_AUTHKEY:-}" ] || exit 90
case " $* " in
    *' status '*) exit 0 ;;
    *' up '*)
        for arg in "$@"; do
            case "$arg" in --auth-key=file:*) key_file=${arg#--auth-key=file:} ;; esac
        done
        [ "$(cat "$key_file")" = 'test-only-key' ] || exit 91
        echo "key-file $key_file" >> "$MOCK_TRACE"
        case "${MOCK_MODE:-}" in auth-fail) exit 11 ;; esac
        echo authenticated >> "$MOCK_TRACE"
        ;;
esac
EOF
cat > "$test_dir/bin/socat" <<'EOF'
#!/bin/sh
[ -z "${TS_AUTHKEY:-}" ] || exit 90
echo "relay $$ $*" >> "$MOCK_TRACE"
case "${MOCK_MODE:-}" in
    relay-fail) exit 13 ;;
    relay-dies) exec sleep 2 ;;
esac
exec sleep 60
EOF
cat > "$test_dir/bin/dotnet" <<'EOF'
#!/bin/sh
[ -z "${TS_AUTHKEY:-}" ] || exit 90
echo "api $$ $*" >> "$MOCK_TRACE"
if grep -q '^key-file ' "$MOCK_TRACE"; then
    key_file=$(sed -n 's/^key-file //p' "$MOCK_TRACE")
    [ ! -e "$key_file" ] || exit 92
fi
case "${MOCK_MODE:-}" in relay-dies) exec sleep 60 ;; esac
exit 7
EOF
chmod +x "$test_dir/bin/"*

check_case() {
    case_name=$1
    expected_exit=$2
    expect_api=$3
    shift 3
    : > "$MOCK_TRACE"
    actual_exit=0
    env "$@" /bin/sh "$repo_root/scripts/start-api.sh" '--example=two words' > "$test_dir/output" 2>&1 || actual_exit=$?
    if [ "$actual_exit" -ne "$expected_exit" ]; then
        cat "$test_dir/output"
        echo "FAIL $case_name: expected exit $expected_exit, received $actual_exit" >&2
        exit 1
    fi
    if [ "$expect_api" = yes ]; then
        grep -q 'api .* VietAnExpress.API.dll --example=two words' "$MOCK_TRACE"
    elif grep -q '^api ' "$MOCK_TRACE"; then
        echo "FAIL $case_name: API started before tunnel was ready" >&2
        exit 1
    fi
    # Các tiến trình phụ đều phải được dừng, file khóa phải được xóa.
    while read -r kind value rest; do
        case "$kind" in
            daemon|relay|api)
                if kill -0 "$value" 2>/dev/null; then
                    echo "FAIL $case_name: process $kind survived" >&2
                    kill "$value" 2>/dev/null || true
                    exit 1
                fi
                ;;
            key-file) [ ! -e "$value" ] ;;
        esac
    done < "$MOCK_TRACE"
    echo "PASS $case_name"
}

unset TS_AUTHKEY TS_SQL_HOST TS_SQL_PORT MOCK_MODE
check_case 'direct API preserves exit code and arguments' 7 yes
check_case 'missing auth key stops startup' 1 no TS_SQL_HOST=100.112.14.17
check_case 'missing SQL host stops startup' 1 no TS_AUTHKEY=test-only-key
check_case 'public address rejected' 1 no TS_AUTHKEY=test-only-key TS_SQL_HOST=8.8.8.8
check_case 'configuration cannot inject a command' 1 no TS_AUTHKEY=test-only-key 'TS_SQL_HOST=100.112.14.17;echo unsafe'
check_case 'invalid octet rejected' 1 no TS_AUTHKEY=test-only-key TS_SQL_HOST=100.112.14.256
check_case 'invalid port rejected' 1 no TS_AUTHKEY=test-only-key TS_SQL_HOST=100.112.14.17 TS_SQL_PORT=65536
check_case 'authentication failure stops startup and removes key' 11 no TS_AUTHKEY=test-only-key TS_SQL_HOST=100.112.14.17 MOCK_MODE=auth-fail
check_case 'daemon failure stops startup' 1 no TS_AUTHKEY=test-only-key TS_SQL_HOST=100.112.14.17 MOCK_MODE=daemon-fail
check_case 'relay failure stops startup' 1 no TS_AUTHKEY=test-only-key TS_SQL_HOST=100.112.14.17 MOCK_MODE=relay-fail
check_case 'private relay starts API without auth key and cleans up' 7 yes TS_AUTHKEY=test-only-key TS_SQL_HOST=100.112.14.17
grep -q 'TCP4-LISTEN:14330,bind=127.0.0.1,reuseaddr,fork' "$MOCK_TRACE"
check_case 'relay death stops running API' 1 yes TS_AUTHKEY=test-only-key TS_SQL_HOST=100.112.14.17 MOCK_MODE=relay-dies
