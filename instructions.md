# Frigate

## Documentation

- [Start9 Bitcoin Guides](https://docs.start9.com/bitcoin-guides/) — what an Electrum server is, pointing a wallet at one, and archival versus pruned Bitcoin nodes.
- [Frigate README](https://github.com/sparrowwallet/frigate/blob/master/README.md) — the upstream project page and the full `config.toml` reference.
- [BIP352](https://github.com/bitcoin/bips/blob/master/bip-0352.mediawiki) — the Silent Payments specification Frigate implements.

## What you get on StartOS

An Electrum server that scans the blockchain for Silent Payments on your wallet's behalf, without learning which payments are yours. Point a Silent Payments wallet at Frigate's Electrum address and it can find its incoming payments without downloading the chain itself.

Frigate answers Silent Payments queries and nothing else. To use it as your wallet's only server, pair it with **Fulcrum** or **Electrs**, which answer ordinary address lookups; Frigate forwards those to whichever one you select.

## Server protections

Frigate 1.6 adds limits that protect a public Electrum server from too many connections, oversized requests, and excessive subscriptions. No configuration is needed on StartOS: it automatically accounts for the TLS proxy in front of Frigate, so the proxy does not make all of your clients appear as one limited IP address.

## Getting set up

1. **Install Bitcoin** and let it finish syncing. Frigate needs a full, unpruned node, and you'll be asked to run Bitcoin's **Auto-Configure** to turn on the settings Frigate depends on.
2. **Install Fulcrum** (recommended) or **Electrs**, and start it. You can skip this, but wallets pointed at Frigate will then only be able to do Silent Payments lookups.
3. **Run Configure Frigate.** Select your Electrum backend, and adjust the indexing settings if you need to. Frigate starts once you save.
4. **Wait for the first index.** This takes hours, sometimes days, depending on your start height and hardware. Frigate's Electrum address does not accept connections until it is done — watch **Sync Progress** for the block it has reached.
5. **Connect your wallet** to Frigate's Electrum address.

If Frigate's **Bitcoin Connection** check asks you to update Bitcoin, install Bitcoin's update; Frigate starts on its own once it is done.

## Choosing a start height

Frigate only finds Silent Payments made at or after the block it starts indexing from. The default here is **840000**, which covers every practical Silent Payments wallet and keeps the first index to a reasonable length.

Change it in **Configure Frigate** if you need to:

- **Faster first sync** — if you know your wallet received nothing before a particular block, start there instead.
- **Full history** — set it to **709632**, the block Taproot activated, to index every Silent Payment there has ever been. This adds a great deal of time to the first index and almost nobody needs it.

Lowering the start height later re-indexes the gap; raising it does not delete anything already indexed.

## Using a GPU

Frigate can scan far faster on a GPU. **Compute Backend** in **Configure Frigate** defaults to **Auto**, which uses a GPU when it finds one and the CPU when it doesn't.

Which GPUs are usable depends on the hardware in your server. NVIDIA and AMD cards each need their own build of this package, which StartOS picks for you at install. Intel integrated graphics use the standard build, but only recent ones (roughly 11th-generation Core and newer) — an older Intel chip is not recognised and Frigate falls back to the CPU.

If you are unsure, start it and read the log: Frigate reports either `Using CPU backend for scanning (no GPU detected)` or the GPU it picked, on every launch. Falling back to CPU costs speed and nothing else.

If scanning stalls on a GPU, lower **Batch Size** in **Configure Frigate**. Older cards can choke on the default.

## Limitations

- Frigate is experimental, and so is wallet support for Silent Payments. Treat it as something to try rather than something to depend on.
- Frigate does not answer ordinary address queries on its own. Without Fulcrum or Electrs selected, a general-purpose wallet cannot use it as its only server.
