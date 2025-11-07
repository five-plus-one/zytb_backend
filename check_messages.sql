SELECT 
  id,
  role,
  LEFT(content, 100) as content_preview,
  content_blocks,
  message_type,
  created_at
FROM agent_messages
WHERE session_id = 'eac953df-cb36-4cee-bb70-990e8f76d3cd'
ORDER BY created_at DESC
LIMIT 20;
