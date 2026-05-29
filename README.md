<p align="center">
  <img src="icon.png" alt="Frigate Logo" width="21%">
</p>

# Frigate Electrum Server on StartOS

> **Upstream docs:** <https://github.com/sparrowwallet/frigate>
>
> Everything not listed in this document should behave the same as upstream
> Frigate. If a feature, setting, or behavior is not mentioned here,
> the upstream documentation is accurate and fully applicable.

[Frigate](https://github.com/sparrowwallet/frigate) is an experimental Electrum server with Silent Payments scanning support, built by the Sparrow Wallet team.

---

## Table of Contents

- [Image and Container Runtime](#image-and-container-runtime)
- [Volume and Data Layout](#volume-and-data-layout)
- [Installation and First-Run Flow](#installation-and-first-run-flow)
- [Configuration Management](#configuration-management)
- [Network Access and Interfaces](#network-access-and-interfaces)
- [Actions (StartOS UI)](#actions-startos-ui)
- [Backups and Restore](#backups-and-restore)
- [Health Checks](#health-checks)
- [Dependencies](#dependencies)
- [Limitations and Differences](#limitations-and-differences)
- [What Is Unchanged from Upstream](#what-is-unchanged-from-upstream)
- [Contributing](#contributing)
- [Quick Reference for AI Consumers](#quick-reference-for-ai-consumers)

---

## Image and Container Runtime

| Property      | Value                                                                    |
| ------------- | ------------------------------------------------------------------------ |
| Image         | `ghcr.io/remcoros/frigate-docker` (custom image, see frigate-docker repo) |
| Architectures | x86_64, aarch64 for generic; x86_64 for nvidia and amd                   |
| Entrypoint    | Upstream entrypoint (unmodified)                                         |
| GPU runtime   | NVIDIA runtime for the NVIDIA variant; OpenCL runtimes in the image      |

Hardware acceleration is declared (`hardwareAcceleration: true`). StartOS variants with hardware requirements select the right runtime:

| StartOS variant | Docker tag suffix | Hardware requirement |
| --------------- | ----------------- | -------------------- |
| `generic`       | none              | none                 |
| `nvidia`        | none              | NVIDIA GPU           |
| `amd`           | `-amd`            | AMD GPU (amdgpu)     |

The default Docker image bundles Intel OpenCL on x86_64 and supports CPU, NVIDIA (via nvidia variant), and Intel GPUs. The AMD variant uses the `-amd` Docker tag with Mesa Rusticl/radeonsi OpenCL bundled; no ROCm or host driver stack required beyond `amdgpu` and `/dev/dri`.

---

## Volume and Data Layout

| Volume | Mount Point      | Purpose                        |
| ------ | ---------------- | ------------------------------ |
| `main` | `/root/.frigate` | Frigate data (config, indexes) |

**Bitcoin dependency mount:**

- `/root/.bitcoin` — Bitcoin Core volume (read-only, for cookie auth and blockchain access)

**Key paths on the `main` volume:**

- `config.toml` — main configuration file (managed by StartOS)
- `frigate.duckdb` — DuckDB index (excluded from backup)

---

## Installation and First-Run Flow

1. On install, a default `config.toml` is written with the StartOS-specific defaults listed below.
2. A critical **Configure Frigate** task is created, prompting the user to confirm or adjust settings before the service starts.
3. Bitcoin Core dependency auto-configuration runs: `txindex`, pruning disabled, and ZMQ are required and set automatically.
4. Frigate starts indexing from the configured start height (default: 840000).

---

## Configuration Management

Frigate is configured through the **Configure Frigate** action, which writes `config.toml` on the `main` volume.

### StartOS-Managed (hardcoded)

| Setting                    | Value                           | Reason                                |
| -------------------------- | ------------------------------- | ------------------------------------- |
| `core.connect`             | `true`                          | Required for Bitcoin Core integration |
| `core.server`              | `http://bitcoind.startos:8332`  | StartOS internal Bitcoin Core address |
| `core.authType`            | `COOKIE`                        | Cookie-based auth via mounted volume  |
| `core.dataDir`             | `/root/.bitcoin`                | Mounted Bitcoin Core volume           |
| `core.zmqSequenceEndpoint` | `tcp://bitcoind.startos:28333`  | ZMQ sequence endpoint                 |

### Configurable via Action

| Setting                        | Default                    | Notes                                                                     |
| ------------------------------ | -------------------------- | ------------------------------------------------------------------------- |
| Electrum backend server        | None (not recommended)     | Fulcrum recommended; Electrs also supported                               |
| Index start height             | 840000                     | Upstream default is 709632 (Taproot activation); use lower for full history |
| Script PubKey cache size       | 10M (~4 GB RAM)            | Reduce on low-RAM systems                                                 |
| Compute backend                | AUTO (prefer GPU)          | AUTO, GPU, or CPU                                                         |
| Batch size                     | 300000                     | Rows per GPU dispatch; reduce if scanning hangs                           |

---

## Network Access and Interfaces

| Interface | Port  | Protocol   | Purpose                               |
| --------- | ----- | ---------- | ------------------------------------- |
| `electrum`| 50001 | TCP (plain) | Electrum protocol (wallets connect here) |
| `electrum`| 50002 | SSL        | Electrum protocol with TLS            |

---

## Actions (StartOS UI)

| Action             | Purpose                                        | Availability | Inputs                                         |
| ------------------ | ---------------------------------------------- | ------------ | ---------------------------------------------- |
| Configure Frigate  | Set Electrum backend, start height, GPU config | Any status   | Electrum server, advanced settings (see above) |

---

## Backups and Restore

The `main` volume is backed up. The DuckDB index (`/db`) is **excluded** from backups because it can be rebuilt by re-syncing from the configured start height.

Restore: the service will re-index from the configured start height after restore.

---

## Health Checks

| Check           | Method                                | Success message    |
| --------------- | ------------------------------------- | ------------------ |
| Electrum Server | Port 50001 listening                  | Frigate is running |
| Sync Progress   | Port check + log file scan            | Fully synced / current block progress |

The sync-progress check reads `frigate.log` for `Indexing progress:` lines and reports the current block position until the port opens.

---

## Dependencies

| Dependency | Required | Purpose                                                      |
| ---------- | -------- | ------------------------------------------------------------ |
| bitcoind   | Yes      | Block data, ZMQ sequence events, RPC; requires txindex, no pruning, ZMQ enabled |
| fulcrum    | No       | Backend Electrum server (recommended); must be synced        |
| electrs    | No       | Alternative backend Electrum server; must be synced          |

Only one backend Electrum server (Fulcrum or Electrs) is used at a time, based on the Configure action selection.

---

## Limitations and Differences

1. **No SSL certificate configuration.** SSL termination uses the StartOS-managed certificate; manual SSL cert/key configuration from upstream is not exposed.
2. **Config file not directly editable.** `config.toml` is managed by StartOS. Use the Configure action to change settings.
3. **Single backend Electrum server.** Only one backend (Fulcrum or Electrs) can be active at a time.
4. **Experimental upstream.** Frigate is an experimental project. Silent Payments support is still evolving upstream.

---

## What Is Unchanged from Upstream

- Silent Payments scanning behavior and protocol
- Electrum server protocol (TCP and SSL)
- DuckDB index format and query logic
- GPU/CPU compute backend selection and batch size tuning
- All config.toml settings that are not listed as StartOS-managed above

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for build instructions.

---

## Quick Reference for AI Consumers

```yaml
package_id: frigate
architectures:
  - x86_64
  - aarch64
hardware_acceleration: true
variants:
  generic:
    docker_tag_suffix: null
    gpu_driver: null
  nvidia:
    docker_tag_suffix: null
    gpu_driver: nvidia
  amd:
    docker_tag_suffix: -amd
    gpu_driver: amdgpu
volumes:
  main: /root/.frigate
ports:
  electrum: 50001
  electrum_ssl: 50002
dependencies:
  - bitcoind (required)
  - fulcrum (optional, recommended)
  - electrs (optional)
startos_managed_env_vars: []
actions:
  - config
```
