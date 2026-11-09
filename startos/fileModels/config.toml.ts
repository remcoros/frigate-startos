import { z, FileHelper, T } from '@start9labs/start-sdk'
import { sdk } from '../sdk'
import { electrumPort } from '../utils'

// Upstream's default is 709632, Taproot activation on mainnet.
export const indexStartHeightDefault = 840000

// StartOS terminates the public TLS listener and connects to Frigate through
// its lxcbr0 gateway. Frigate 1.6's per-IP limits would otherwise treat every
// proxied client as this one address.
export const excludedSubnetsForStartosProxy = (proxyIp: string): string[] => [
  '127.0.0.1/32',
  '::1/128',
  `${proxyIp}/32`,
]

const cacheSizes = ['1M', '5M', '10M', '20M', '50M'] as const
export const isCacheSize = (
  value: string,
): value is (typeof cacheSizes)[number] =>
  (cacheSizes as readonly string[]).includes(value)

export type ElectrumServerType = 'fulcrum' | 'electrs' | 'none'

// Backend addresses this package hard-coded before it kept the selection in
// store.json. Recognised so an install predating the store keeps its choice.
export const legacyElectrumServerByUrl: Record<string, ElectrumServerType> = {
  'tcp://fulcrum.startos:50001': 'fulcrum',
  'tcp://electrs.startos:50001': 'electrs',
}

const tcpListener = `tcp://[::]:${electrumPort}`

// Matches Frigate's native config.toml structure
const shape = z.looseObject({
  core: z
    .looseObject({
      connect: z.boolean().catch(true),
      server: z.string().optional().catch(undefined),
      authType: z
        .union([z.literal('USERPASS'), z.literal('COOKIE')])
        .catch('COOKIE' as const),
      auth: z.string().catch(''),
      dataDir: z.string().catch('/root/.bitcoin'),
      zmqSequenceEndpoint: z.string().optional().catch(undefined),
    })
    .catch({
      connect: true,
      authType: 'COOKIE' as const,
      auth: '',
      dataDir: '/root/.bitcoin',
    }),
  index: z
    .looseObject({
      startHeight: z.number().catch(indexStartHeightDefault),
      cacheSize: z.string().catch('10M'),
    })
    .catch({
      startHeight: indexStartHeightDefault,
      cacheSize: '10M',
    }),
  scan: z
    .looseObject({
      computeBackend: z
        .union([z.literal('AUTO'), z.literal('GPU'), z.literal('CPU')])
        .catch('AUTO' as const),
      batchSize: z.number().catch(300000),
    })
    .catch({
      computeBackend: 'AUTO' as const,
      batchSize: 300000,
    }),
  limits: z
    .looseObject({
      excludedSubnets: z.array(z.string()).catch(['127.0.0.1/32', '::1/128']),
    })
    .catch({
      excludedSubnets: ['127.0.0.1/32', '::1/128'],
    }),
  server: z
    .looseObject({
      tcp: z.literal(tcpListener).catch(tcpListener),
      backendElectrumServer: z.string().catch(''),
    })
    .catch({
      tcp: tcpListener,
      backendElectrumServer: '',
    }),
})

export const config = FileHelper.toml(
  {
    base: sdk.volumes.main,
    subpath: '/config.toml',
  },
  shape,
)

export const createDefaultConfig = async (effects: T.Effects) => {
  const conf = await config.read().once()
  if (!conf) {
    const startosProxyIp = await sdk.getOsIp(effects)
    await config.write(effects, {
      core: {
        connect: true,
        authType: 'COOKIE',
        auth: '',
        dataDir: '/root/.bitcoin',
      },
      index: {
        startHeight: indexStartHeightDefault,
        cacheSize: '10M',
      },
      scan: {
        computeBackend: 'AUTO',
        batchSize: 300000,
      },
      limits: {
        excludedSubnets: excludedSubnetsForStartosProxy(startosProxyIp),
      },
      server: {
        tcp: tcpListener,
        backendElectrumServer: '',
      },
    })
  }
}
