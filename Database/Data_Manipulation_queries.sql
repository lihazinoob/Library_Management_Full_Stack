USE library_management_system_learning;

--  Left JOIN the books and relations table to get all books and their reservation status
SELECT 
    b.book_id,
    b.title,
    COUNT(r.reservation_id) AS active_reservations_count
FROM books b
LEFT JOIN reservations r
    ON b.book_id = r.book_id
    AND r.status = 'ACTIVE'
GROUP BY b.book_id,b.title; 