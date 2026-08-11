export interface NpmEnv {
  node_version: string
  npm_version: string
  npm_source: string
  node_path: string
  npm_path: string
  global_prefix: string
  global_prefix_writable: boolean
  version_manager: string
}

export interface ProjectInfo {
  name: string
  version: string
  path: string
  dep_count: number
  dev_dep_count: number
  has_lock_file: boolean
}

export interface OutdatedInfo {
  current: string
  wanted: string
  latest: string
  dep_type: string
}

export interface PackageEntry {
  name: string
  current: string
  wanted?: string
  latest?: string
  dep_type: string
  hasUpdate: boolean
}

export interface LogPayload {
  stream: "stdout" | "stderr" | "status"
  text: string
}

export interface TerminalLine {
  id: number
  text: string
  level: "cmd" | "stdout" | "stderr" | "status"
  timestamp: number
}

export type AppMode = "local" | "global"
export type Screen = "welcome" | "no-package-json" | "workbench"
export type OverlayType = "install-drawer" | "confirm-dialog" | "script-confirm" | null
