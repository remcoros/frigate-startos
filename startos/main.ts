import { manifest as bitcoinManifest } from 'bitcoin-core-startos/startos/manifest'
import {
  rpcHostId,
  rpcPort,
  zmqHostId,
  zmqPortTransaction,
} from 'bitcoin-core-startos/startos/utils'
import {
  electrumHostId as electrsHostId,
  port as electrsPort,
} from 'electrs-startos/startos/utils'
import {
  electrumPort as fulcrumPort,
  mainHostId as fulcrumHostId,
} from 'fulcrum-startos/startos/utils'
import {
  config,
  excludedSubnetsForStartosProxy,
} from './fileModels/config.toml'
import { store } from './fileModels/store.json'
import { sdk } from './sdk'
import { i18n } from './i18n'
import { electrumPort, stdoutLines } from './utils'

export const main = sdk.setupMain(async ({ effects }) => {
  console.info(i18n('Starting Frigate...'))

  // Watch only user-controlled settings. Address rewrites below do not restart
  // main unless the selected provider or its assigned bridge port changes.
  await config.read(({ index, scan }) => ({ index, scan })).const(effects)

  const selection =
    (await store.read((value) => value.electrumServer).const(effects)) ?? 'none'
  const startosProxyIp = await sdk.getOsIp(effects)
  const rpcAddress = await sdk.host
    .getBridgeAddress(effects, {
      packageId: 'bitcoind',
      hostId: rpcHostId,
      internalPort: rpcPort,
      ssl: false,
    })
    .const()
  const zmqAddress = await sdk.host
    .getBridgeAddress(effects, {
      packageId: 'bitcoind',
      hostId: zmqHostId,
      internalPort: zmqPortTransaction,
    })
    .const()
  const backendAddress =
    selection === 'fulcrum'
      ? await sdk.host
          .getBridgeAddress(effects, {
            packageId: 'fulcrum',
            hostId: fulcrumHostId,
            internalPort: fulcrumPort,
          })
          .const()
      : selection === 'electrs'
        ? await sdk.host
            .getBridgeAddress(effects, {
              packageId: 'electrs',
              hostId: electrsHostId,
              internalPort: electrsPort,
            })
            .const()
        : null

  await config.merge(
    effects,
    {
      core: {
        connect: true,
        server: rpcAddress ? `http://${rpcAddress}` : undefined,
        authType: 'COOKIE',
        auth: '',
        dataDir: '/root/.bitcoin',
        zmqSequenceEndpoint: zmqAddress ? `tcp://${zmqAddress}` : undefined,
      },
      server: {
        backendElectrumServer: backendAddress ? `tcp://${backendAddress}` : '',
      },
      // Frigate 1.6 applies per-IP limits to incoming clients. StartOS
      // terminates TLS and makes this connection from its lxcbr0 gateway, so
      // preserve upstream's loopback exceptions and exempt that proxy too.
      limits: {
        excludedSubnets: excludedSubnetsForStartosProxy(startosProxyIp),
      },
    },
    { allowWriteAfterConst: true },
  )

  const subcontainer = await sdk.SubContainer.eager(
    effects,
    {
      imageId: 'main',
    },
    sdk.Mounts.of()
      .mountVolume({
        volumeId: 'main',
        subpath: null,
        mountpoint: '/root/.frigate',
        readonly: false,
      })
      .mountDependency<typeof bitcoinManifest>({
        dependencyId: 'bitcoind',
        mountpoint: '/root/.bitcoin',
        volumeId: 'main',
        subpath: null,
        readonly: true,
      }),
    'main',
  )

  // Frigate announces the index it is about to build a few seconds after
  // launch, then reports progress only every 30s. Readiness keys off the
  // announcement: keying off progress alone leaves a healthy service reporting
  // failure for the first half-minute of every start.
  let indexing = false
  let lastSyncLog: string | null = null

  return sdk.Daemons.of(effects)
    .addDaemon('primary', {
      subcontainer,
      exec: {
        // The SDK calls fn on every respawn, so a restarted Frigate reports nothing until it logs again.
        fn: async () => {
          indexing = false
          lastSyncLog = null
          return {
            command: sdk.useEntrypoint(),
            env: {
              NETWORK: 'mainnet',
            },
            onStdout: stdoutLines((line) => {
              if (/Indexing \d+ blocks|Block index is up to date/.test(line)) {
                indexing = true
              }

              const match = line.match(/Indexing progress: (.+)/)
              if (match) {
                indexing = true
                lastSyncLog = match[1].trim()
              }
            }),
          }
        },
      },
      ready: {
        display: i18n('Electrum Server'),
        fn: async () => {
          const result = await sdk.healthCheck.checkPortListening(
            effects,
            electrumPort,
            {
              successMessage: i18n('Frigate is running'),
              errorMessage: i18n('Frigate is syncing...'),
            },
          )

          if (result.result === 'success') return result

          if (indexing) {
            return {
              result: 'loading',
              message: i18n('Frigate is syncing...'),
            }
          }

          return result
        },
      },
      requires: [],
    })
    .addHealthCheck('sync-progress', {
      ready: {
        display: i18n('Sync Progress'),
        fn: async () => {
          // If the port is open, Frigate is fully synced.
          const portCheck = await sdk.healthCheck.checkPortListening(
            effects,
            electrumPort,
            {
              successMessage: i18n('Fully synced'),
              errorMessage: '',
            },
          )
          if (portCheck.result === 'success') return portCheck

          if (!lastSyncLog) {
            return {
              message: i18n('Frigate is syncing...'),
              result: 'loading',
            }
          }

          return {
            message: lastSyncLog,
            result: 'loading',
          }
        },
      },
      requires: [],
    })
})
