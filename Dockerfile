# Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
# All rights reserved.
# This file is a part of Logibooks frontend application
#
# Redistribution and use in source and binary forms, with or without
# modification, are permitted provided that the following conditions
# are met:
# 1. Redistributions of source code must retain the above copyright
#    notice, this list of conditions and the following disclaimer.
# 2. Redistributions in binary form must reproduce the above copyright
#    notice, this list of conditions and the following disclaimer in the
#    documentation and/or other materials provided with the distribution.
#
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
# ``AS IS'' AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
# TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
# PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDERS OR CONTRIBUTORS
# BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
# CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
# SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
# INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
# CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
# ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
# POSSIBILITY OF SUCH DAMAGE.

# Stage for building the frontend
FROM node:18.18.2 AS build
WORKDIR /app

# Add build arguments with default values
ARG API_URL=https://logibooks.sw.consulting:8085/api
ARG ENABLE_LOG=true
ENV VITE_API_URL=$API_URL
ENV VITE_ENABLE_LOG=$ENABLE_LOG

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage for running nginx with static files
FROM nginx:1.27-alpine AS final
COPY --from=build /app/dist /var/www/logibooks
COPY config/public /var/www
COPY config/nginx.conf /etc/nginx/conf.d/default.conf
COPY config/update-config.sh /docker-entrypoint.d/40-update-config.sh

# Make the script executable
RUN chmod +x /docker-entrypoint.d/40-update-config.sh

EXPOSE 8082
EXPOSE 8083
CMD ["nginx", "-g", "daemon off;"]
