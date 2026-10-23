# Live collaboration relay for on-premise installs (server/relay.ts). Build from the repository
# root: docker build -f deploy/relay.Dockerfile -t grafcetmaker-relay .
# deploy/docker-compose.yml runs it next to the app.
FROM node:24-alpine
WORKDIR /relay
RUN npm init -y >/dev/null \
    && npm pkg set type=module \
    && npm install --no-audit --no-fund ws@8.22.0
COPY worker/room.ts worker/room.ts
COPY server/relay.ts server/relay.ts
RUN mkdir -p /data && chown node:node /data
USER node
ENV PORT=8081 RELAY_DATA_DIR=/data
EXPOSE 8081
CMD ["node", "server/relay.ts"]
