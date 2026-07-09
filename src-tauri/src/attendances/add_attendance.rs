use crate::db::connect;
use rusqlite::params;
use tauri::command;

#[command]
pub fn add_attendance(
    student_name: String,
    confidence: i32,
) -> Result<String, String> {
    let mut conn = connect()?;

    let tx = conn
        .transaction()
        .map_err(|e| format!("Failed to start transaction: {}", e))?;

    let student_id: i64 = tx
        .query_row(
            "SELECT student_id
             FROM STUDENT
             WHERE student_name = ?1",
            params![&student_name],
            |row| row.get(0),
        )
        .map_err(|_| format!("Student '{}' not found", student_name))?;

    tx.execute(
        "INSERT INTO ATTENDANCE_RECORD
            (student_id, confidence)
         VALUES (?1, ?2)",
        params![student_id, confidence],
    )
    .map_err(|e| format!("Failed to save attendance: {}", e))?;

    tx.commit()
        .map_err(|e| format!("Failed to commit transaction: {}", e))?;

    Ok("Attendance recorded successfully".to_string())
}