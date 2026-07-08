mod db;
mod students;

use db::init_db;
use students::{add_student, read_students, delete_student};


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![add_student, read_students, delete_student])
        .setup(|_app| {
            init_db().expect("Failed to initialize database");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
