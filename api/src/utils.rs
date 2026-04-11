use chrono::{Datelike, Duration, NaiveDate, Utc};

/// Returns the start of the current week for a user given their `week_start` setting.
/// `week_start`: 0=Sun, 1=Mon, …, 6=Sat
pub fn current_week_start(week_start: i16) -> NaiveDate {
    let today = Utc::now().date_naive();
    let today_dow = today.weekday().num_days_from_sunday() as i16; // 0=Sun
    let days_since_start = (today_dow - week_start).rem_euclid(7);
    today - Duration::days(days_since_start as i64)
}
