#!/bin/sh
# socat gọi helper riêng cho từng kết nối; không dùng dữ liệu cấu hình làm shell code.
set -eu
exec tailscale --socket="$VIETAN_TS_SOCKET" nc "$TS_SQL_HOST" "$TS_SQL_PORT"
