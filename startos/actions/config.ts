import { sdk } from '../sdk'
import {
  createDefaultConfig,
  config,
  ElectrumServerTypes,
  electrumServers,
  electrumServerByUrl,
  bitcoindUrl,
  indexStartHeightDefault,
} from '../fileModels/config.json'
import { Variants } from '@start9labs/start-sdk/base/lib/actions/input/builder'

const { InputSpec, Value } = sdk

const inputSpec = InputSpec.of({
  electrumServer: Value.dynamicUnion(async ({ effects }) => {
    // determine default server type and disabled options
    const installedPackages = await effects.getInstalledPackages()
    let serverType: ElectrumServerTypes = 'none'
    let disabled: ElectrumServerTypes[] = []

    if (installedPackages.includes('electrs-testnet')) {
      serverType = 'electrs'
    } else {
      disabled.push('electrs')
    }

    if (installedPackages.includes('fulcrum-testnet')) {
      serverType = 'fulcrum'
    } else {
      disabled.push('fulcrum')
    }

    return {
      name: 'Electrum Server',
      description: 'Electrum Backend Server',
      default: serverType,
      disabled: disabled,
      variants: Variants.of({
        fulcrum: {
          name:
            'Fulcrum (recommended)' +
            (disabled.includes('fulcrum') ? ' (not installed)' : ''),
          spec: InputSpec.of({}),
        },
        electrs: {
          name:
            'Electrs' +
            (disabled.includes('electrs') ? ' (not installed)' : ''),
          spec: InputSpec.of({}),
        },
        none: {
          name: 'None (not recommended)',
          spec: InputSpec.of({}),
        },
      }),
    }
  }),
  advanced: Value.object(
    {
      name: 'Advanced settings',
      description: 'Advanced settings',
    },
    InputSpec.of({
      startIndexing: Value.toggle({
        name: 'Start Indexing on Launch',
        description:
          'Whether Frigate should start indexing the blockchain upon launch.',
        default: true,
      }),
      indexStartHeight: Value.number({
        name: 'Index Start Height',
        description:
          'The block height from which Frigate should start indexing.',
        required: true,
        integer: true,
        min: 0,
        max: null,
        default: indexStartHeightDefault,
      }),
      scriptPubKeyCacheSize: Value.number({
        name: 'Script PubKey Cache Size',
        description:
          'The size of the Script PubKey cache in bytes (default 10,000,000).',
        required: true,
        integer: true,
        min: 0,
        max: null,
        default: 10000000,
      }),
      /*
      useCuda: Value.boolean({
        name: 'Use CUDA Acceleration',
        description: 'Enable CUDA acceleration for indexing (requires compatible GPU).',
      }),
      cudaBatchSize: Value.number({
        name: 'CUDA Batch Size',
        description: 'The batch size for CUDA processing.',
      }),
      */
    }),
  ),
})

export const setConfig = sdk.Action.withInput(
  // id
  'config',

  // metadata
  async ({ effects }) => ({
    name: 'Configure Frigate',
    description: 'Set or update Frigate configuration settings.',
    warning: null,
    allowedStatuses: 'any',
    group: 'Configuration',
    visibility: 'enabled',
  }),

  // form input specification
  inputSpec,

  // optionally pre-fill the input form
  async ({ effects }) => {
    let currentConfig = await config.read().once()
    if (!currentConfig) {
      await createDefaultConfig(effects)
      currentConfig = (await config.read().once())!
    }

    return {
      electrumServer: {
        selection:
          electrumServerByUrl[currentConfig.backendElectrumServer] || 'none',
      },
      advanced: {
        startIndexing: currentConfig.startIndexing,
        indexStartHeight: currentConfig.indexStartHeight,
        scriptPubKeyCacheSize: currentConfig.scriptPubKeyCacheSize,
        //useCuda: currentConfig.useCuda,
        //cudaBatchSize: currentConfig.cudaBatchSize,
      },
    }
  },

  // the execution function
  async ({ effects, input }) => {
    await config.merge(effects, {
      coreServer: bitcoindUrl,
      coreAuthType: 'COOKIE',
      coreAuth: '',
      coreDataDir: '/root/.bitcoin',
      startIndexing: input.advanced.startIndexing,
      indexStartHeight: input.advanced.indexStartHeight,
      scriptPubKeyCacheSize: input.advanced.scriptPubKeyCacheSize,
      //useCuda: input.advanced.useCuda,
      //cudaBatchSize: input.advanced.cudaBatchSize,
      backendElectrumServer:
        electrumServers[
          input.electrumServer.selection as ElectrumServerTypes
        ] ?? '',
    })
  },
)
