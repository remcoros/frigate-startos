export const DEFAULT_LANG = 'en_US'

const dict = {
  // main.ts
  'Starting Frigate...': 1,
  'Frigate is running': 2,
  'Frigate is syncing...': 3,
  'Sync Progress': 4,
  'Fully synced': 6,
  'Bitcoin Connection': 7,
  'Update Bitcoin so Frigate can connect to it': 8,

  // interfaces.ts
  'Electrum (SSL)': 100,
  'The Electrum protocol endpoint, served over SSL': 101,

  // actions/config.ts
  'Configure Frigate': 200,
  'Set or update Frigate configuration settings.': 201,
  'Electrum Server': 202,
  'Where Frigate sends the Electrum requests it does not answer itself, address lookups included. Frigate answers Silent Payments requests on its own.\n- Fulcrum: Fulcrum on this server.\n- Electrs: Electrs on this server.\n- None: no backend; wallets get Silent Payments results only.': 203,
  'Fulcrum (recommended)': 204,
  '(not installed)': 205,
  Electrs: 206,
  'None (not recommended)': 207,
  'Advanced settings': 208,
  'Index Start Height': 211,
  'Blocks below this height are not indexed, so Silent Payments in them are not found.': 212,
  'Script PubKey Cache Size': 213,
  'How many scriptPubKeys Frigate keeps in memory while indexing. A larger cache indexes faster and uses more RAM; 10M uses about 4 GB.': 214,
  Configuration: 215,
  'Compute Backend': 216,
  'Hardware used for historical Silent Payments scans. Mempool and new-block scans always run on the CPU.\n- Auto (prefer GPU): the GPU if one is detected, otherwise the CPU.\n- GPU only: always the GPU.\n- CPU only: never the GPU.': 217,
  'Auto (prefer GPU)': 218,
  'GPU only': 219,
  'CPU only': 220,
  'Batch Size': 221,
  'Transactions processed per GPU dispatch. If scanning hangs or becomes unstable on an older GPU, try 10,000 to 50,000.': 222,
  '10M (default)': 223,

  // dependencies.ts and init/index.ts
  'Frigate requires txindex, pruning disabled, and ZMQ enabled in Bitcoin.': 300,
  'Configure Frigate settings': 301,
} as const

/**
 * Plumbing. DO NOT EDIT.
 */
export type I18nKey = keyof typeof dict
export type LangDict = Record<(typeof dict)[I18nKey], string>
export default dict
