<p align="center">
  <img src="icon.png" alt="Frigate Logo" width="21%">
</p>

# Frigate Electrum Server on StartOS

> Everything not listed in this document should behave the same as upstream
> Frigate. If a feature, setting, or behavior is not mentioned here, the
> upstream documentation is accurate and fully applicable — see the
> Documentation section of `instructions.md` for links.

[Frigate](https://github.com/sparrowwallet/frigate) is an experimental Electrum server from the Sparrow Wallet team. It scans the chain for Silent Payments (BIP352) on a wallet's behalf using ephemeral client keys, keeps the resulting tweak index in DuckDB, and can offload the scan to a GPU. It is not the Frigate NVR project.

- **Upstream repo:** <https://github.com/sparrowwallet/frigate>
- **Wrapper repo:** <https://github.com/Start9-Community/frigate-startos>

---

## Table of Contents

- [Image and Container Runtime](#image-and-container-runtime)
- [Volume and Data Layout](#volume-and-data-layout)
- [File Models](#file-models)
- [Dependencies](#dependencies)
- [Network Access and Interfaces](#network-access-and-interfaces)
- [Installation and First-Run Flow](#installation-and-first-run-flow)
- [Actions](#actions)
- [Tasks](#tasks)
- [Health Checks](#health-checks)
- [Backups and Restore](#backups-and-restore)
- [Limitations and Differences](#limitations-and-differences)
- [Quick Reference for AI Consumers](#quick-reference-for-ai-consumers)

---

## Image and Container Runtime

Upstream publishes no container image, so this package wraps a third-party one that installs the upstream `.deb` after verifying its PGP signature and sha256 manifest.

| Property      | Value                                                                |
| ------------- | -------------------------------------------------------------------- |
| Image         | `ghcr.io/remcoros/frigate-docker`                                    |
| Architectures | x86_64 and aarch64 for `generic`; x86_64 only for `nvidia` and `amd` |
| Entrypoint    | The image's own, unmodified — it execs `frigate -n "$NETWORK"`       |

| Subcontainer | Purpose                                       |
| ------------ | --------------------------------------------- |
| `main`       | The `primary` daemon — the one to `attach` to |

The package declares `hardwareAcceleration`, which is what gets `/dev/dri`, `/dev/nvidia*`, and `/dev/kfd` into the container. It ships as three build variants under one package id, and StartOS installs the most hardware-specific one a given server qualifies for:

| Variant   | Image   | Hardware requirement | GPU path                                           |
| --------- | ------- | -------------------- | -------------------------------------------------- |
| `generic` | default | none                 | CPU, or a **recent** Intel iGPU via bundled OpenCL |
| `nvidia`  | default | an `nvidia` GPU      | CUDA, via the NVIDIA container runtime             |
| `amd`     | `-rocm` | an `amdgpu` GPU      | ROCm OpenCL                                        |

`generic` carries no hardware requirement deliberately: it is the variant every server can install, and Frigate falls back to CPU when it finds no usable OpenCL device.

**The Intel path is narrower than "has an Intel iGPU".** The image bundles a current `intel-compute-runtime`, which supports Gen12 (Tiger Lake / Arc / Xe) and newer only — Intel moved Gen8–Gen11 to a separate legacy runtime that this image does not carry. On an older iGPU the runtime refuses the device outright (`FATAL: Unknown device: deviceId: <id>`), `clinfo` reports zero platforms, and Frigate logs `Using CPU backend for scanning (no GPU detected)` and proceeds on CPU. Verified on a Comet Lake UHD (Gen9.5, PCI `8086:9bca`), which does **not** work. Nothing breaks; it is simply slower than the hardware suggests.

## Volume and Data Layout

One volume, holding the config, the index, and the package's own record of which Electrum backend the user picked.

| Volume | Mount Point      | Purpose                                     |
| ------ | ---------------- | ------------------------------------------- |
| `main` | `/root/.frigate` | Frigate's home directory — config and index |

| Path                | What                                                               |
| ------------------- | ------------------------------------------------------------------ |
| `config.toml`       | Frigate's configuration (see File Models)                          |
| `db/frigate.duckdb` | The Silent Payments tweak index; rebuildable, excluded from backup |
| `store.json`        | StartOS-side state: the selected Electrum backend                  |

Bitcoin's data directory is also mounted, read-only, at `/root/.bitcoin`. Frigate reads only `.cookie` from it, for RPC authentication.

## File Models

One model, `config.toml`, and the package owns roughly half of it. The other half is yours to set through an action.

`config.toml` is seeded with the package's defaults on install, then partially rewritten on every start. The keys the package re-asserts each time are the ones that describe where Bitcoin is, and a hand edit to any of them will not survive a restart:

| Key                            | Value the package writes                                            |
| ------------------------------ | ------------------------------------------------------------------- |
| `core.connect`                 | always `true`                                                       |
| `core.server`                  | Bitcoin's RPC address, resolved live over the container bridge      |
| `core.authType`                | always `COOKIE`                                                     |
| `core.dataDir`                 | `/root/.bitcoin`, where Bitcoin's volume is mounted                 |
| `core.zmqSequenceEndpoint`     | Bitcoin's ZMQ sequence address, resolved live                       |
| `server.tcp`                   | always `tcp://[::]:50001`, so the listener accepts IPv4 and IPv6    |
| `server.backendElectrumServer` | the selected backend's address, or empty when none is selected      |
| `limits.excludedSubnets`       | upstream loopback defaults plus StartOS's current TLS-proxy address |

`index.startHeight`, `index.cacheSize`, `scan.computeBackend`, and `scan.batchSize` are seeded once and thereafter belong to the **Configure Frigate** action. Those four are watched rather than rewritten: a hand edit survives, and changing any of them — by hand or through the action — restarts Frigate so the new value takes effect, since Frigate never re-reads its config while running.

Any key the package does not name is left alone entirely, including the upstream keys this package exposes no control for. The `limits.excludedSubnets` exception is necessary because StartOS terminates TLS and opens the upstream connection from its `lxcbr0` bridge address, which the package reads with `sdk.getOsIp()` whenever Frigate starts. Without it, Frigate 1.6 would treat every StartOS client as one IP for its new per-IP limits and request pacing.

`store.json` records which Electrum backend the user selected. It is deliberately separate from `config.toml`: the backend's actual address is assigned by StartOS and can change, so the selection has to outlive any particular address.

## Dependencies

Bitcoin is required; an Electrum backend is optional but strongly recommended.

| Dependency | Required | Gated on health checks      | Why                                                                                                                                                                                                                       |
| ---------- | -------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bitcoind` | Yes      | `bitcoind`, `sync-progress` | Supplies blocks over RPC and new-block events over ZMQ. Its data directory is mounted read-only at `/root/.bitcoin` for cookie authentication. Frigate needs an archival node with `txindex` and ZMQ enabled — see Tasks. |
| `fulcrum`  | No       | `primary`, `sync-progress`  | Answers ordinary address lookups, which Frigate does not implement. Required only while it is the selected backend.                                                                                                       |
| `electrs`  | No       | `electrs`, `sync`           | The same role as Fulcrum. Required only while it is the selected backend.                                                                                                                                                 |

Only one backend is used at a time, and only the selected one becomes a dependency — selecting Fulcrum does not oblige a user who also has Electrs installed to keep it running. The backend's address is resolved from the running service on each start rather than hard-coded, so a reinstall or a reassigned port heals on the next restart.

Selecting `None` is allowed and leaves Frigate answering Silent Payments queries alone, with nothing behind it to proxy to — a wallet connected to it will fail every ordinary address lookup. That is the shape of the complaint when a user reports the server "works but can't find my transactions".

## Network Access and Interfaces

One interface, serving the Electrum protocol.

| Interface | Id         | Type | Container port | Description                             |
| --------- | ---------- | ---- | -------------- | --------------------------------------- |
| Electrum  | `electrum` | api  | 50001          | The Electrum protocol endpoint over SSL |

The binding is exported with SSL added, so StartOS terminates TLS on its own certificate and forwards to Frigate's plaintext listener. Addresses render with an `ssl://` or `tcp://` scheme so they can be pasted straight into a wallet. The plaintext port is reachable over the container bridge — that is the address a co-located service resolves — and from nowhere else.

## Installation and First-Run Flow

Frigate cannot start until Bitcoin is configured for it and the user has confirmed the indexing settings, so the install ends in two prompts rather than a running service.

1. A `config.toml` is written with this package's defaults.
2. A critical **Configure Frigate** task is raised. Nothing starts until it is answered.
3. A critical **Auto-Configure** task is raised on Bitcoin, to turn on `txindex` and ZMQ and turn off pruning.
4. Once both are satisfied and Bitcoin is synced, Frigate starts and begins indexing from the configured start height.

The initial index is long — hours to days depending on the start height, the compute backend, and the hardware. The Electrum port stays closed until it finishes.

## Actions

One action, and the service is unusable until it has been run once.

**Configure Frigate** picks the Electrum backend and the indexing settings. Run it at install (a task requires it), and again to change backends, to re-index from a different height, or to move the scan between CPU and GPU.

- **What it changes:** `store.json`'s backend selection, and the `index` and `scan` sections of `config.toml`.
- **Cost:** the write is instant, but saving restarts Frigate. Lowering **Index Start Height** discards nothing, but Frigate will re-index the gap, which can take hours.
- **Repeat safety:** idempotent. Saving unchanged values rewrites the same file and does not restart the service.
- **What happens next:** Frigate restarts and picks up the new settings. Watch the **Sync Progress** health check for the current block.

## Tasks

Two, both `critical`, both raised at install. A critical task blocks the service from starting and replaces the ordinary controls until it is cleared.

**Configure Frigate** (on Frigate) — raised once, on install. Cleared by running the **Configure Frigate** action. It does not come back.

**Auto-Configure** (on **Bitcoin**, not on Frigate) — raised whenever Bitcoin's configuration does not have `txindex` on, pruning off, and ZMQ on. Cleared by running Bitcoin's **Auto-Configure** action, which sets all three. It returns if any of them is later turned off. The user sees this prompt on Bitcoin's page, where nothing identifies Frigate as the service that asked for it.

## Health Checks

Two checks, both keyed on whether the Electrum port has opened, which happens only once the index is complete.

| Check           | Displayed         | Probe                                                  |
| --------------- | ----------------- | ------------------------------------------------------ |
| `primary`       | "Electrum Server" | Port 50001 is listening                                |
| `sync-progress` | "Sync Progress"   | Port 50001, falling back to the last indexing log line |

A **failing** `primary` — as opposed to a loading one — means Frigate started but never got as far as announcing an index. Check the service logs for a connection refused against Bitcoin's RPC or ZMQ port, and check that Bitcoin's **Auto-Configure** task is clear; ZMQ turned off is the usual cause. Readiness deliberately keys off that announcement, which Frigate emits within a few seconds of launch, rather than off its progress lines, which it emits only every 30 seconds: keying off progress would leave a perfectly healthy service reporting failure for the first half-minute of every start. Once indexing has begun, both checks report _loading_, and `sync-progress` shows the block it has reached; that state is normal and can persist for days on a first index. Both go green together when the port opens.

Two behaviors around those checks look like faults and are not. **Frigate restarts several times whenever Bitcoin restarts**: it exits rather than reconnecting when Bitcoin's RPC goes away — first on the missing `.cookie`, then on `Loading block index…` while Bitcoin comes back — so StartOS restarts it a handful of times over ten to fifteen seconds, backing off between attempts, until Bitcoin is answering. The index survives; Frigate resumes from the last block it wrote. A loop that does _not_ settle means Bitcoin itself is looping, so read Bitcoin's logs rather than Frigate's. And **`sync-progress` that has not moved in hours** on a GPU backend is usually a batch too large for the card: lower **Batch Size** through Configure Frigate, and set **Compute Backend** to `CPU` to confirm the GPU is the cause if it still hangs.

## Backups and Restore

The volume is copied wholesale — `sdk.Backups.ofVolumes('main')` — minus the index.

`db/` is excluded. The DuckDB tweak index is derived data: it is large, it changes constantly, and it can be rebuilt from the chain. What the backup does keep is `config.toml` and `store.json`, so a restored instance comes back with the same settings and the same backend selection.

A restored instance therefore has to re-index from the configured start height before it will serve. Bitcoin must be present and synced first, exactly as on a fresh install.

## Limitations and Differences

Most of these come from the package taking ownership of the Bitcoin connection and the TLS listener, so that neither has to be configured by hand.

1. **No SSL configuration.** Upstream's `server.sslCert` / `server.sslKey` are not exposed; StartOS terminates TLS on its own certificate instead.
2. **The Bitcoin connection is not yours to set.** `core.server`, `core.dataDir`, `core.authType` and `core.zmqSequenceEndpoint` are rewritten on every start to point at the Bitcoin service on this server. Cookie authentication is the only mode; `USERPASS` is not exposed.
3. **One backend at a time.** Upstream takes a single `backendElectrumServer`, so Fulcrum and Electrs are alternatives, not both.
4. **A different default start height.** This package indexes from a more recent block than upstream does, to keep the first sync tolerable. The trade-off and how to change it are covered in the Instructions tab.
5. **The AMD variant is built on ROCm nightlies.** The image pins a nightly ROCm release; it has not been tested by the packager on real AMD hardware.
6. **Upstream is experimental.** Silent Payments support is still moving, and so is the wallet support for it.
7. **StartOS manages the Frigate 1.6 proxy exception.** The platform terminates TLS before it reaches Frigate, so the package reads the current bridge address with `sdk.getOsIp()` and includes it in `limits.excludedSubnets`. Do not remove it: otherwise every client through StartOS is treated as the same IP and can hit Frigate's per-IP limits.

---

## Quick Reference for AI Consumers

```yaml
package_id: frigate
image: ghcr.io/remcoros/frigate-docker
architectures:
  - x86_64
  - aarch64 # generic variant only; nvidia and amd are x86_64
subcontainers:
  - main # the only container
volumes:
  main: /root/.frigate
file_models:
  - config.toml
  - store.json
startos_managed_env_vars:
  - NETWORK
dependencies:
  - bitcoind # required; its volume is mounted read-only at /root/.bitcoin
  - fulcrum # optional, recommended
  - electrs # optional
interfaces:
  electrum: { type: api, port: 50001 }
actions:
  - config
tasks:
  - { action: config, severity: critical }
  - { action: bitcoind/autoconfig, severity: critical }
health_checks:
  - primary # displayed "Electrum Server"
  - sync-progress # displayed "Sync Progress"
```
