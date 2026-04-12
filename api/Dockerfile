# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM rust:1.88-slim AS builder

RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy manifests first so dependency layers are cached separately from source
COPY Cargo.toml Cargo.lock ./

# Fetch dependencies with a dummy main to cache the layer
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo fetch

# Now copy real source, migrations, and SQLx offline cache
COPY src ./src
COPY migrations ./migrations
COPY .sqlx ./.sqlx

# Build release binary — SQLX_OFFLINE skips the need for a live database
ENV SQLX_OFFLINE=true
RUN cargo build --release --bin panopticon-api

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM debian:bookworm-slim AS runtime

RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/target/release/panopticon-api ./panopticon-api
# Migrations are run automatically on startup via db::run_migrations
COPY --from=builder /app/migrations ./migrations

EXPOSE 3001

CMD ["./panopticon-api"]
