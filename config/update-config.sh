#!/bin/sh

# This script updates the runtime configuration with environment variables

# Default API URL if not provided
API_URL=${API_URL:-http://api:8080/api}

# Create the config file with the provided API URL
echo "window.RUNTIME_CONFIG = {" > /usr/share/nginx/html/config.js
echo "  apiUrl: '${API_URL}'" >> /usr/share/nginx/html/config.js
echo "};" >> /usr/share/nginx/html/config.js

echo "Runtime configuration updated:"
echo "API URL: ${API_URL}"

# Execute the command passed to docker run
exec "$@"
