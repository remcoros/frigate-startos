import { FileHelper } from '@start9labs/start-sdk'
import { config } from './fileModels/config.toml'
import { sdk } from './sdk'
import { i18n } from './i18n'

export const main = sdk.setupMain(async ({ effects }) => {
  console.info('Starting Frigate...')

  const conf = (await config.read().const(effects))!

  const subcontainer = await sdk.SubContainer.of(
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
      .mountDependency({
        dependencyId: 'bitcoind',
        mountpoint: '/root/.bitcoin',
        volumeId: 'main',
        subpath: null,
        readonly: true,
      }),
    'main',
  )

  // watch bitcoin .cookie file to restart daemon on changes
  await FileHelper.string(
    `${subcontainer.rootfs}/root/.bitcoin/.cookie`,
  )
    .read()
    .const(effects)  

  // Keep track of the latest sync-progress line from stdout.
  // Captured by onStdout on the primary daemon; read by the sync-progress health check.
  let lastSyncLog: string | null = null

  return sdk.Daemons.of(effects)
    .addDaemon('primary', {
      subcontainer: subcontainer,
      exec: {
        command: sdk.useEntrypoint(),
        env: {
          NETWORK: 'mainnet',
          ...(conf.gpu?.hsaOverrideGfxVersion
            ? { HSA_OVERRIDE_GFX_VERSION: conf.gpu.hsaOverrideGfxVersion }
            : {}),
        },
        onStdout: (chunk) => {
          const text = Buffer.isBuffer(chunk)
            ? chunk.toString('utf8')
            : String(chunk)

          console.log(text)
          
          const match = text.match(/Indexing progress: (.+)/)
          if (match) {
            lastSyncLog = match[1].trim()
          }
        },
      },
      ready: {
        display: i18n('Electrum Server'),
        fn: async () => {
          const result = await sdk.healthCheck.checkPortListening(
            effects,
            50001,
            {
              successMessage: i18n('Frigate is running'),
              errorMessage: i18n('Frigate is syncing...'),
            },
          )

          if (result.result === 'success') return result

          return {
            result: 'loading',
            message: i18n('Frigate is syncing...'),
          }
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
            50001,
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
