use crate::db::connect;
use rusqlite::params;
use std::fs;
use std::path::{Path};
use tauri::command;
#[command]
pub fn delete_student(student_id: i64) -> Result<String, String> {
    let mut conn = connect()?;    
    let mut stmt = conn
        .prepare("SELECT image_url FROM PHOTO WHERE student_id = ?1")
        .map_err(|error| format!("Failed to prepare image lookup: {}", error))?;
        
    let image_urls: Vec<String> = stmt
        .query_map(params![student_id], |row| row.get(0))
        .map_err(|error| format!("Failed to query student images: {}", error))?
        .filter_map(|res| res.ok())
        .collect();
    drop(stmt);
    let transaction = conn
        .transaction()
        .map_err(|error| format!("Failed to start database transaction: {}", error))?;

    let rows_affected = transaction
        .execute("DELETE FROM STUDENT WHERE student_id = ?1", params![student_id])
        .map_err(|error| format!("Failed to delete student from DB: {}", error))?;

    if rows_affected == 0 {
        return Err("Student not found".into());
    }

    transaction
        .commit()
        .map_err(|error| format!("Failed to finalize database deletion: {}", error))?;

    if !image_urls.is_empty() {
        if let Some(first_url) = image_urls.first() {
            let photo_path = Path::new(first_url);
            if let Some(student_dir) = photo_path.parent() {
                if student_dir.exists() && student_dir.is_dir() {
                    fs::remove_dir_all(student_dir).map_err(|error| {
                        format!("Database updated, but failed to delete physical images folder: {}", error)
                    })?;
                }
            }
    }}

    Ok(format!("Successfully deleted student with ID: {}", student_id))
}