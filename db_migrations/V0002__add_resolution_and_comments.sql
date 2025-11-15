ALTER TABLE chats ADD COLUMN IF NOT EXISTS resolution VARCHAR(20) CHECK (resolution IN ('resolved', 'unresolved', NULL));

CREATE TABLE IF NOT EXISTS chat_comments (
  id SERIAL PRIMARY KEY,
  chat_id INTEGER NOT NULL REFERENCES chats(id),
  user_id INTEGER REFERENCES users(id),
  comment TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);