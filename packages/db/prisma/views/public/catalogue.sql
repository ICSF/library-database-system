SELECT
  items.item_id,
  items.title,
  authors.name AS author_name,
  items.series AS series_name,
  items.series_num,
  media_types.media_type AS item_type,
  locations.name AS location,
  items.isbn,
  items.is_borrowable,
  items.is_damaged,
  items.is_awol,
  items.is_retired
FROM
  items,
  authors,
  media_types,
  locations
WHERE
  (
    (items.author_id = authors.author_id)
    AND (items.type_id = media_types.media_type_id)
    AND (items.location_id = locations.location_id)
  );