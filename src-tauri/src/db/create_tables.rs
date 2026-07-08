use rusqlite::Connection;
use std::fs;
use std::path::PathBuf;
use std::sync::OnceLock;

static DB_PATH: OnceLock<PathBuf> = OnceLock::new();

fn get_db_path() -> Result<&'static PathBuf, String> {
    let path = {
        let program_data = dirs_next::data_dir()
            .ok_or_else(|| "Could not find data directory".to_string())?;
        let app_dir = program_data.join("smart-attendance-system").join("DB");
        fs::create_dir_all(&app_dir)
            .map_err(|e| format!("Failed to create app dir: {}", e))?;
        app_dir.join("smart_attendance.db")
    };
    Ok(DB_PATH.get_or_init(|| path))
}

pub fn connect() -> Result<Connection, String> {
    let path = get_db_path()?;
    Connection::open(path).map_err(|e| e.to_string())
}

pub fn init_db() -> Result<String, String> {
    let conn = connect()?;
    conn.execute("PRAGMA foreign_keys = ON", [])
        .map_err(|e| format!("Failed to enable foreign keys: {}", e))?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS STUDENT (
            student_id   INTEGER PRIMARY KEY AUTOINCREMENT,
            student_name  TEXT NOT NULL,
            created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            modified_at   TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )
    .map_err(|e| format!("Failed to create STUDENT table: {}", e))?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS PHOTO (
            photo_id    INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id  INTEGER NOT NULL,
            image_url   TEXT NOT NULL,
            FOREIGN KEY (student_id) REFERENCES STUDENT(student_id) ON DELETE CASCADE
        )",
        [],
    )
    .map_err(|e| format!("Failed to create PHOTO table: {}", e))?;
    conn.execute(
        "CREATE TABLE IF NOT EXISTS ATTENDANCE_RECORD (
            attendance_id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id    INTEGER NOT NULL,
            mark_time     TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            status        TEXT NOT NULL DEFAULT 'present',
            confidence    INTEGER,
            FOREIGN KEY (student_id) REFERENCES STUDENT(student_id) ON DELETE CASCADE
        )",
        [],
    )
    .map_err(|e| format!("Failed to create ATTENDANCE_RECORD table: {}", e))?;

    Ok("DB initialized successfully".into())
}