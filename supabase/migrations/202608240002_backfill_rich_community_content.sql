update public.community_posts
set content_format = 'RICH_HTML'
where content_format = 'PLAIN_TEXT'
  and content ~* '<(figure|img|p|div|blockquote|ul|ol|h2|h3)(\s|>)';
