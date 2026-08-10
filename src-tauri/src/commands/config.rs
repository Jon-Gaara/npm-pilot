use tauri::AppHandle;
use tauri::State;
use crate::state::AppState;
use crate::types::PersistedConfig;

#[tauri::command]
pub fn set_mode(
    app: AppHandle,
    state: State<'_, AppState>,
    mode: String,
) -> Result<(), String> {
    if mode != "local" && mode != "global" {
        return Err(format!("Invalid mode: {}", mode));
    }

    *state.mode.lock().unwrap() = mode.clone();

    let mut config = PersistedConfig::load(&app);
    config.last_mode = Some(mode);
    config.save(&app)?;

    Ok(())
}
