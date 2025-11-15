CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('super_admin', 'operator')),
  status VARCHAR(20) DEFAULT 'offline' CHECK (status IN ('online', 'offline')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chats (
  id SERIAL PRIMARY KEY,
  client_name VARCHAR(255),
  client_email VARCHAR(255),
  status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'closed')),
  assigned_operator_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  chat_id INTEGER NOT NULL REFERENCES chats(id),
  sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('client', 'operator')),
  sender_id INTEGER REFERENCES users(id),
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (username, password, role, status) 
VALUES ('123', '123', 'super_admin', 'online')
ON CONFLICT (username) DO NOTHING;