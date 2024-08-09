#!/bin/bash
set -e

# Start MySQL server in the background
/docker-entrypoint.sh mysqld &

# Wait for MySQL to be ready
until mysqladmin ping -h "localhost" --silent; do
    echo 'waiting for mysqld to be connectable...'
    sleep 2
done

# Create the database if it doesn't exist
mysql -u root -prootpassword -e "CREATE DATABASE IF NOT EXISTS binkjs;"

# Execute the SQL script
mysql -u root -prootpassword binkjs </docker-entrypoint-initdb.d/binkjs.sql

# Grant privileges to the user
mysql -u root -prootpassword -e "GRANT ALL PRIVILEGES ON binkjs.* TO 'binkjsuser'@'%'; FLUSH PRIVILEGES;"

# Keep the container running
tail -f /dev/null
