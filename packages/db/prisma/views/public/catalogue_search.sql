SELECT
  row_number() OVER (
    ORDER BY
      i.title
  ) AS id,
  i.title,
  i.series,
  i.series_num,
  concat_ws(' ' :: text, a.name) AS author_name,
  i.isbn
FROM
  (
    items i
    JOIN authors a ON ((a.author_id = i.author_id))
  )
WHERE
  (i.is_borrowable IS TRUE);