import { useEffect } from "react"
import { useTerminalStore } from "../stores/useTerminalStore"

export function useNpmLog() {
  useEffect(() => {
    const startListening = useTerminalStore.getState().startListening
    const unlistenPromise = startListening()
    return () => {
      unlistenPromise.then((unlisten) => unlisten())
    }
  }, [])
}
