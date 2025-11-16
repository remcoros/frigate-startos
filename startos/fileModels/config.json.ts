import { matches, FileHelper, T } from '@start9labs/start-sdk'
const { object, string, boolean, oneOf, literal, number } = matches

export const indexStartHeightDefault = 0 // taproot activation height on testnet4
export const bitcoindUrl = 'http://bitcoind.startos:8332'
export type ElectrumServerTypes = 'fulcrum' | 'electrs' | 'none'
export const electrumServers: Record<ElectrumServerTypes, string> = {
  fulcrum: 'tcp://fulcrum.startos:50001',
  electrs: 'tcp://electrs.startos:50001',
  none: '',
}
export const electrumServerByUrl = Object.fromEntries(
  Object.entries(electrumServers).map(([key, value]) => [value, key]),
) as Record<string, ElectrumServerTypes>

const shape = object({
  coreServer: string.onMismatch(bitcoindUrl),
  coreAuthType: oneOf(literal('USERPASS'), literal('COOKIE')).onMismatch(
    'COOKIE',
  ),
  coreAuth: string.onMismatch(''),
  coreDataDir: string.onMismatch('/root/.bitcoin'),
  startIndexing: boolean.onMismatch(true),
  indexStartHeight: number.onMismatch(indexStartHeightDefault),
  scriptPubKeyCacheSize: number.onMismatch(10000000),
  useCuda: boolean.onMismatch(false),
  cudaBatchSize: number.onMismatch(300000),
  backendElectrumServer: string.onMismatch(''),
})

export type FrigateConfigType = typeof shape._TYPE

export const config = FileHelper.json(
  {
    volumeId: 'main',
    subpath: 'config', // note: no .json extension!
  },
  shape,
)

export const createDefaultConfig = async (effects: T.Effects) => {
  // check if the file exists (from previous installs or upgrades)
  const conf = await config.read().once()
  if (!conf) {
    await config.write(effects, {
      coreServer: bitcoindUrl,
      coreAuthType: 'COOKIE',
      coreAuth: '',
      coreDataDir: '/root/.bitcoin',
      startIndexing: true,
      indexStartHeight: 0,
      scriptPubKeyCacheSize: 10000000,
      useCuda: false,
      cudaBatchSize: 300000,
      backendElectrumServer: '',
    })
  }
}
