SELECT
  l.loan_id,
  l.item_id,
  i.title,
  l.member_id,
  m.first_name,
  m.last_name,
  m.email,
  l.issued_at,
  l.due_at,
  (CURRENT_DATE - l.due_at) AS days_overdue,
  l.notes
FROM
  (
    (
      loans l
      JOIN items i ON ((i.item_id = l.item_id))
    )
    JOIN members m ON ((m.member_id = l.member_id))
  )
WHERE
  (
    (l.returned_at IS NULL)
    AND (l.due_at < CURRENT_DATE)
  );