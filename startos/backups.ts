import { sdk } from './sdk'

export const { createBackup, restoreInit } = sdk.setupBackups(
  async ({ effects }) =>
    sdk.Backups.ofVolumes('main').setOptions({
      exclude: ['/testnet4/db'],
    }),
)
