-- Add origin_url column to oauth_pkce table to track where users initiated OAuth
ALTER TABLE oauth_pkce 
ADD COLUMN origin_url text;