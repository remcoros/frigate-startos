import { T } from '@start9labs/start-sdk'
import { config, electrumServers } from './fileModels/config.json'
import { sdk } from './sdk'
import { config as bitcoindConfig } from 'bitcoind-testnet-startos/startos/actions/config/other'

export const setDependencies = sdk.setupDependencies(async ({ effects }) => {
  await sdk.action.createTask(effects, 'bitcoind-testnet', bitcoindConfig, 'critical', {
    input: { kind: 'partial', value: { txindex: true, prune: 0 } },
    reason: 'Must enable txindex and disable pruning for Frigate to function properly',
    when: { condition: 'input-not-matches', once: false },
  })

  let currentDeps = {} as Record<'electrs-testnet' | 'fulcrum', T.DependencyRequirement>

  const backendElectrumServer = await config
    .read((e) => e.backendElectrumServer)
    .const(effects)

  if (backendElectrumServer === electrumServers.electrs) {
    currentDeps['electrs-testnet'] = {
      id: 'electrs-testnet',
      kind: 'running',
      versionRange: '>=0.9.0',
      healthChecks: ['sync'],
    }
  } else if (backendElectrumServer === electrumServers.fulcrum) {
    currentDeps.fulcrum = {
      id: 'fulcrum',
      kind: 'running',
      versionRange: '>=2.0.0',
      healthChecks: ['sync'],
    }
  }

  return {
    'bitcoind-testnet': {
      kind: 'running',
      versionRange: '>=29.1:1.0',
      healthChecks: ['sync-progress'],
    },
    ...currentDeps,
  }
})
