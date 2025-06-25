#!/bin/sh

# This script updates the runtime configuration with environment variables

# Default API URL if not provided
API_URL=${API_URL:-https://logibooks.sw.consulting:8085/api}
ENABLE_LOG=${ENABLE_LOG:-false}

# Create the config file with the provided API URL and enableLog setting
echo "{" > /var/www/logibooks/config.json
echo "  \"apiUrl\": \"${API_URL}\"," >> /var/www/logibooks/config.json
echo "  \"enableLog\": ${ENABLE_LOG}" >> /var/www/logibooks/config.json
echo "}" >> /var/www/logibooks/config.json

echo "Runtime configuration updated:"
echo "API URL: ${API_URL}"
echo "Enable Log: ${ENABLE_LOG}"

# Execute the command passed to docker run
exec "$@"
