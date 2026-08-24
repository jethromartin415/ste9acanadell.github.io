# STE9A Canada — Daily Rotating QR Attendance

This version replaces permanent student QR codes with a **single classroom QR code that rotates automatically every day**.

Attendance period: August 24, 2026 through March 31, 2027.

## How it works
1. The teacher/admin opens the Admin page.
2. The page generates the QR for today's date.
3. Students scan that QR in class.
4. They enter their Student ID.
5. The server verifies that the QR token is today's token.
6. It records Present or Late.
7. Students with no record can be treated as Absent in the dashboard/report.

## Present/Late rule
Default cutoff is 7:30 AM.
- 7:00 AM through 7:30 AM = Present
- After 7:30 AM = Late

Change `lateCutoffHour` and `lateCutoffMinute` in `Code.gs` if your class uses a different cutoff.

## Setup
1. Create a Google Sheet.
2. Extensions > Apps Script.
3. Add Code.gs, Index.html, Admin.html and appsscript.json from this package.
4. Run setup() once and authorize.
5. Fill the Students sheet with Student ID, Student Name, and Active=TRUE.
6. Deploy as Web app:
   - Execute as: Me
   - Who has access: Anyone with the link
7. Open the deployed web-app URL with `?page=admin`.
8. Display the generated QR on a classroom screen/projector.

## Security
The daily QR token changes by date, so yesterday's QR will not work today. However, a QR can still be photographed and shared during the same day. For stronger attendance verification, the school can add a short rotating time window, teacher-controlled PIN, or another school-approved check.
