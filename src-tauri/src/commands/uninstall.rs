use tauri::AppHandle;
use tauri::State;
use crate::state::AppState;
use crate::npm;

#[tauri::command]
pub async fn npm_uninstall_pkg(
    app: AppHandle,
    state: State<'_, AppState>,
    pkg_name: String,
) -> Result<(), String> {
    let cwd = state.get_cwd();
    let mode = state.mode.lock().unwrap().clone();
    let npm = state.npm_cmd.lock().unwrap().clone();

    let mut args: Vec<String> = vec!["uninstall".into(), pkg_name];
    if mode == "global" { args.push("-g".into()); }

    let arg_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    npm::run_npm_streamed(&app, &npm, &cwd, &arg_refs).await
}

#[tauri::command]
pub async fn npm_uninstall_batch(
    app: AppHandle,
    state: State<'_, AppState>,
    pkgs: Vec<String>,
) -> Result<(), String> {
    if pkgs.is_empty() { return Ok(()); }

    let cwd = state.get_cwd();
    let mode = state.mode.lock().unwrap().clone();
    let npm = state.npm_cmd.lock().unwrap().clone();

    let mut args: Vec<String> = vec!["uninstall".into()];
    args.extend(pkgs);
    if mode == "global" { args.push("-g".into()); }

    let arg_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    npm::run_npm_streamed(&app, &npm, &cwd, &arg_refs).await
}
