import { sdk } from '../sdk'
import { i18n } from '../i18n'
import {
  createDefaultConfig,
  config,
  ElectrumServerTypes,
  electrumServers,
  electrumServerByUrl,
  indexStartHeightDefault,
  bitcoindUrl,
  bitcoindZmqSequenceEndpoint,
} from '../fileModels/config.toml'
import { Variants } from '@start9labs/start-sdk/base/lib/actions/input/builder'

const { InputSpec, Value } = sdk

const inputSpec = InputSpec.of({
  electrumServer: Value.dynamicUnion(async ({ effects }) => {
    const installedPackages = await effects.getInstalledPackages()
    let serverType: ElectrumServerTypes = 'none'
    let disabled: ElectrumServerTypes[] = []

    if (installedPackages.includes('electrs')) {
      serverType = 'electrs'
    } else {
      disabled.push('electrs')
    }

    if (installedPackages.includes('fulcrum')) {
      serverType = 'fulcrum'
    } else {
      disabled.push('fulcrum')
    }

    return {
      name: i18n('Electrum Server'),
      description: i18n('Electrum Backend Server'),
      default: serverType,
      disabled: disabled,
      variants: Variants.of({
        fulcrum: {
          name:
            i18n('Fulcrum (recommended)') +
            (disabled.includes('fulcrum') ? ' ' + i18n('(not installed)') : ''),
          spec: InputSpec.of({}),
        },
        electrs: {
          name:
            i18n('Electrs') +
            (disabled.includes('electrs') ? ' ' + i18n('(not installed)') : ''),
          spec: InputSpec.of({}),
        },
        none: {
          name: i18n('None (not recommended)'),
          spec: InputSpec.of({}),
        },
      }),
    }
  }),
  advanced: Value.object(
    {
      name: i18n('Advanced settings'),
      description: i18n('Advanced settings'),
    },
    InputSpec.of({
      startIndexing: Value.toggle({
        name: i18n('Start Indexing on Launch'),
        description: i18n(
          'Whether Frigate should start indexing the blockchain upon launch.',
        ),
        default: true,
      }),
      indexStartHeight: Value.number({
        name: i18n('Index Start Height'),
        description: i18n(
          'The block height from which Frigate should start indexing.',
        ),
        required: true,
        integer: true,
        min: 0,
        max: null,
        default: indexStartHeightDefault,
      }),
      scriptPubKeyCacheSize: Value.select({
        name: i18n('Script PubKey Cache Size'),
        description: i18n(
          'Size of the Script PubKey cache (default 10M ≈ 4GB RAM).',
        ),
        values: {
          '1M': '1M',
          '5M': '5M',
          '10M': i18n('10M (default)'),
          '20M': '20M',
          '50M': '50M',
        },
        default: '10M',
      }),
      computeBackend: Value.select({
        name: i18n('Compute Backend'),
        description: i18n(
          'GPU acceleration backend for Silent Payments scanning. AUTO detects and prefers GPU over CPU.',
        ),
        values: {
          AUTO: i18n('Auto (prefer GPU)'),
          GPU: i18n('GPU only'),
          CPU: i18n('CPU only'),
        },
        default: 'AUTO',
      }),
      batchSize: Value.number({
        name: i18n('Batch Size'),
        description: i18n(
          'Rows per GPU dispatch (default 300,000). Reduce if scanning hangs on older GPUs.',
        ),
        required: true,
        integer: true,
        min: 1,
        max: null,
        default: 300000,
      }),
      hsaOverrideGfxVersion: Value.text({
        name: i18n('Override GFX Version (HSA_OVERRIDE_GFX_VERSION)'),
        description: i18n(
          'Override the GPU GFX version reported to ROCm/OpenCL. Required for some AMD APUs (e.g. Radeon 780M). Leave empty to use the detected version. Example: 11.0.0',
        ),
        required: false,
        default: null,
        placeholder: i18n('e.g. 11.0.0'),
        patterns: [
          {
            regex: '^(\\d+\\.\\d+\\.\\d+)?$',
            description: i18n('Must be empty or in the format X.Y.Z (e.g. 11.0.0)'),
          },
        ],
      }),
    }),
  ),
})

export const setConfig = sdk.Action.withInput(
  'config',

  async ({ effects }) => ({
    name: i18n('Configure Frigate'),
    description: i18n('Set or update Frigate configuration settings.'),
    warning: null,
    allowedStatuses: 'any',
    group: i18n('Configuration'),
    visibility: 'enabled',
  }),

  inputSpec,

  async ({ effects }) => {
    let currentConfig = await config.read().once()
    if (!currentConfig) {
      await createDefaultConfig(effects)
      currentConfig = (await config.read().once())!
    }

    return {
      electrumServer: {
        selection:
          electrumServerByUrl[currentConfig.server.backendElectrumServer] ||
          'none',
      },
      advanced: {
        startIndexing: true, // not stored in config.toml; always start indexing
        indexStartHeight: currentConfig.index.startHeight,
        scriptPubKeyCacheSize: (['1M', '5M', '10M', '20M', '50M'].includes(
          currentConfig.index.cacheSize,
        )
          ? currentConfig.index.cacheSize
          : '10M') as '1M' | '5M' | '10M' | '20M' | '50M',
        computeBackend: currentConfig.scan.computeBackend,
        batchSize: currentConfig.scan.batchSize,
        hsaOverrideGfxVersion: currentConfig.gpu?.hsaOverrideGfxVersion || null,
      },
    }
  },

  async ({ effects, input }) => {
    await config.merge(effects, {
      core: {
        connect: true,
        server: bitcoindUrl,
        authType: 'COOKIE',
        auth: '',
        dataDir: '/root/.bitcoin',
        zmqSequenceEndpoint: bitcoindZmqSequenceEndpoint,
      },
      index: {
        startHeight: input.advanced.indexStartHeight,
        cacheSize: input.advanced.scriptPubKeyCacheSize as string,
      },
      scan: {
        computeBackend: input.advanced.computeBackend as 'AUTO' | 'GPU' | 'CPU',
        batchSize: input.advanced.batchSize,
      },
      server: {
        backendElectrumServer:
          electrumServers[
            input.electrumServer.selection as ElectrumServerTypes
          ] ?? '',
      },
      gpu: {
        hsaOverrideGfxVersion: input.advanced.hsaOverrideGfxVersion || '',
      },
    })
  },
)
