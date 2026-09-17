SELECT
  m.member_id,
  m.first_name,
  m.last_name,
  m.member_type_id,
  m.dept_id,
  m.uni_year,
  m.email,
  m.join_date,
  m.is_disabled,
  m.disabled_reason,
  m.comments,
  mm.notes AS membership_notes
FROM
  (
    (
      members m
      JOIN member_memberships mm ON ((mm.member_id = m.member_id))
    )
    JOIN membership_settings s ON (
      (
        (s.singleton = TRUE)
        AND (mm.membership_year = s.current_membership_year)
      )
    )
  )
WHERE
  (m.is_disabled IS FALSE);