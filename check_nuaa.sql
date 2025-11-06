SELECT 
  year,
  collegeCode,
  collegeName,
  groupCode,
  groupName,
  minScore,
  minRank,
  planCount
FROM admission_scores
WHERE collegeName LIKE '%南京航空航天%'
  AND groupCode = '05'
ORDER BY year DESC
LIMIT 10;
