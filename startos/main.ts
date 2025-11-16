import { FileHelper } from '@start9labs/start-sdk'
import { bitcoindUrl, config } from './fileModels/config.json'
import { sdk } from './sdk'
import { read } from 'fs'
import { getLatestBlockHeight, parseCookie } from './utils'

export const main = sdk.setupMain(async ({ effects, started }) => {
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
        dependencyId: 'bitcoind-testnet',
        mountpoint: '/root/.bitcoin',
        volumeId: 'main',
        subpath: 'testnet4',
        readonly: true,
      }),
    'main',
  )

  // set watch on bitcoin .cookie file to restart daemon on changes
  const cookie = await FileHelper.string(
    `${subcontainer.rootfs}/root/.bitcoin/.cookie`,
  )
    .read()
    .const(effects)
  const [RPC_USERNAME, RPC_PASSWORD] = parseCookie(cookie)

  return sdk.Daemons.of(effects, started)
    .addDaemon('primary', {
      subcontainer: subcontainer,
      exec: {
        // @todo env vars are overriden by Dockerfile defaults: see: https://github.com/Start9Labs/start-os/issues/3050
        //command: sdk.useEntrypoint(),
        command: ['/opt/frigate/bin/frigate', '-n', 'testnet4'],
        env: {
          NETWORK: 'testnet4',
        },
      },
      ready: {
        display: 'Frigate Electrum Server',
        fn: () =>
          sdk.healthCheck.checkPortListening(effects, 57001, {
            successMessage: 'Frigate is running',
            errorMessage: 'Frigate is syncing...',
          }),
      },
      requires: [],
    })
    .addHealthCheck('sync-progress', {
      ready: {
        display: 'Frigate Sync Progress',
        fn: async () => {
          try {
            // const latestBlockHeight = await getLatestBlockHeight(
            //   bitcoindUrl,
            //   RPC_USERNAME,
            //   RPC_PASSWORD,
            // )
            const res = await subcontainer.exec([
              'sh',
              '-c',
              `tac /root/.frigate/frigate.log | grep -m1 "Indexed .*block height" | sed 's/.*\\(Indexed.*\\)/\\1/'`,
            ])
            if (
              res.exitCode === 0 &&
              typeof res.stdout === 'string' &&
              res.stdout !== ''
            ) {
              return {
                //message: res.stdout.trim() + ` (latest block: ${latestBlockHeight})`,
                message: res.stdout.trim(),
                result: 'success',
              }
            } else {
              return {
                message: 'Frigate has not yet indexed any blocks',
                result: 'loading',
              }
            }
          } catch (err) {
            return {
              message: `Error fetching block height: ${err}`,
              result: 'failure',
            }
          }
        },
      },
      requires: ['primary'],
    })
})
