export const DEFAULT_LANG = 'en_US'

const dict = {
  // main.ts
  'Frigate is running': 2,
  'Frigate is syncing...': 3,
  'Sync Progress': 4,
  'Frigate has not yet indexed any blocks': 5,
  'Fully synced': 6,

  // interfaces.ts
  'Electrum (SSL)': 100,
  'Electrum server endpoint': 101,

  // actions/config.ts
  'Configure Frigate': 200,
  'Set or update Frigate configuration settings.': 201,
  'Electrum Server': 202,
  'Electrum Backend Server': 203,
  'Fulcrum (recommended)': 204,
  '(not installed)': 205,
  Electrs: 206,
  'None (not recommended)': 207,
  'Advanced settings': 208,
  'Start Indexing on Launch': 209,
  'Whether Frigate should start indexing the blockchain upon launch.': 210,
  'Index Start Height': 211,
  'The block height from which Frigate should start indexing.': 212,
  'Script PubKey Cache Size': 213,
  'Size of the Script PubKey cache (default 10M ≈ 4GB RAM).': 214,
  Configuration: 215,
  'Compute Backend': 216,
  'GPU acceleration backend for Silent Payments scanning. AUTO detects and prefers GPU over CPU.': 217,
  'Auto (prefer GPU)': 218,
  'GPU only': 219,
  'CPU only': 220,
  'Batch Size': 221,
  'Rows per GPU dispatch (default 300,000). Reduce if scanning hangs on older GPUs.': 222,
  '10M (default)': 223,
  'Override GFX Version (HSA_OVERRIDE_GFX_VERSION)': 224,
  'Override the GPU GFX version reported to ROCm/OpenCL. Required for some AMD APUs (e.g. Radeon 780M). Leave empty to use the detected version. Example: 11.0.0': 225,
  'e.g. 11.0.0': 226,
  'Must be empty or in the format X.Y.Z (e.g. 11.0.0)': 227,
} as const

/**
 * Plumbing. DO NOT EDIT.
 */
export type I18nKey = keyof typeof dict
export type LangDict = Record<(typeof dict)[I18nKey], string>
export default dict
