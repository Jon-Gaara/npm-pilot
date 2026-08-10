import { useEffect } from "react"
import { useProjectStore } from "./stores/useProjectStore"
import { useNpmLog } from "./hooks/useNpmLog"
import { useKeyboard } from "./hooks/useKeyboard"
import { WelcomeScreen } from "./components/WelcomeScreen"
import { Workspace } from "./components/Workspace"

function App() {
  const screen = useProjectStore((s) => s.screen)
  const detectEnv = useProjectStore((s) => s.detectEnv)
  const env = useProjectStore((s) => s.env)

  useNpmLog()
  useKeyboard()

  useEffect(() => {
    detectEnv()
  }, [detectEnv])

  return (
    <div className="h-screen w-screen bg-paper-0 text-text-primary flex flex-col overflow-hidden">
      {env && screen === "welcome" && <WelcomeScreen />}
      {env && screen === "workbench" && <Workspace />}
      {env && screen === "no-package-json" && <WelcomeScreen />}
    </div>
  )
}

export default App
