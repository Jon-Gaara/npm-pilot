mod state;
mod types;
mod npm;
mod commands;

use state::AppState;
use types::PersistedConfig;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let config = PersistedConfig::load(&app.handle());
            let state = AppState::new(config);
            app.manage(state);
            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            commands::environment::detect_environment,
            commands::project::open_project,
            commands::project::npm_init,
            commands::project::get_persisted_config,
            commands::config::set_mode,
            commands::allow_scripts::get_allow_scripts,
            commands::allow_scripts::add_allow_scripts,
            commands::allow_scripts::check_install_scripts,
            commands::query::npm_outdated,
            commands::query::npm_ls_depth0,
            commands::query::npm_ls_global,
            commands::query::npm_outdated_global,
            commands::install::npm_install_pkg,
            commands::install::npm_install_batch,
            commands::uninstall::npm_uninstall_pkg,
            commands::uninstall::npm_uninstall_batch,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
