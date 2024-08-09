#!/usr/bin/env bash
# wait-for-it.sh

set -e

host="$1"
shift
cmd="$@"

until nc -z "$host" 3306; do
    echo >&2 "MySQL is unavailable - sleeping"
    sleep 1
done

echo >&2 "MySQL is up - executing command"
exec $cmd
