FROM node:22.14.0-bookworm
WORKDIR /opt/borshkit
COPY --chown=node:node . .
RUN node --check bin/borshkit.mjs && git --version
ENV PATH="/opt/borshkit/bin:${PATH}"
USER node
WORKDIR /workspace
ENTRYPOINT ["node", "/opt/borshkit/bin/borshkit.mjs"]
CMD ["help"]
