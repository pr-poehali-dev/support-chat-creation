import json
import os
import psycopg2
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Manage support chats and auto-assign to online operators
    Args: event with httpMethod, body with chat/message data
    Returns: Chat data, messages, assignment status
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    database_url = os.environ.get('DATABASE_URL')
    conn = psycopg2.connect(database_url)
    cursor = conn.cursor()
    
    if method == 'GET':
        params = event.get('queryStringParameters', {}) or {}
        chat_id = params.get('chat_id')
        operator_id = params.get('operator_id')
        show_archive = params.get('show_archive')
        
        if chat_id:
            cursor.execute("""
                SELECT c.id, c.client_name, c.client_email, c.status, c.assigned_operator_id, c.created_at,
                       u.username as operator_name, c.resolution, c.closed_at
                FROM chats c
                LEFT JOIN users u ON c.assigned_operator_id = u.id
                WHERE c.id = %s
            """, (chat_id,))
            chat = cursor.fetchone()
            
            cursor.execute("""
                SELECT id, sender_type, sender_id, message, created_at
                FROM messages
                WHERE chat_id = %s
                ORDER BY created_at ASC
            """, (chat_id,))
            messages = cursor.fetchall()
            
            cursor.execute("""
                SELECT cc.id, cc.comment, cc.created_at, u.username
                FROM chat_comments cc
                LEFT JOIN users u ON cc.user_id = u.id
                WHERE cc.chat_id = %s
                ORDER BY cc.created_at ASC
            """, (chat_id,))
            comments = cursor.fetchall()
            
            cursor.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({
                    'chat': {
                        'id': chat[0],
                        'client_name': chat[1],
                        'client_email': chat[2],
                        'status': chat[3],
                        'assigned_operator_id': chat[4],
                        'created_at': chat[5].isoformat() if chat[5] else None,
                        'operator_name': chat[6],
                        'resolution': chat[7],
                        'closed_at': chat[8].isoformat() if chat[8] else None
                    } if chat else None,
                    'messages': [
                        {
                            'id': m[0],
                            'sender_type': m[1],
                            'sender_id': m[2],
                            'message': m[3],
                            'created_at': m[4].isoformat() if m[4] else None
                        } for m in messages
                    ],
                    'comments': [
                        {
                            'id': co[0],
                            'comment': co[1],
                            'created_at': co[2].isoformat() if co[2] else None,
                            'username': co[3]
                        } for co in comments
                    ]
                })
            }
        
        if operator_id:
            cursor.execute("""
                SELECT id, client_name, client_email, status, assigned_operator_id, created_at, resolution
                FROM chats
                WHERE assigned_operator_id = %s AND status != 'closed'
                ORDER BY created_at DESC
            """, (operator_id,))
        elif show_archive == 'true':
            cursor.execute("""
                SELECT id, client_name, client_email, status, assigned_operator_id, created_at, resolution
                FROM chats
                ORDER BY created_at DESC
            """)
        else:
            cursor.execute("""
                SELECT id, client_name, client_email, status, assigned_operator_id, created_at, resolution
                FROM chats
                WHERE status != 'closed'
                ORDER BY created_at DESC
            """)
        
        chats = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'isBase64Encoded': False,
            'body': json.dumps({
                'chats': [
                    {
                        'id': c[0],
                        'client_name': c[1],
                        'client_email': c[2],
                        'status': c[3],
                        'assigned_operator_id': c[4],
                        'created_at': c[5].isoformat() if c[5] else None,
                        'resolution': c[6]
                    } for c in chats
                ]
            })
        }
    
    if method == 'POST':
        body_data = json.loads(event.get('body', '{}'))
        action = body_data.get('action')
        
        if action == 'create_chat':
            client_name = body_data.get('client_name', 'Anonymous')
            client_email = body_data.get('client_email', '')
            
            cursor.execute("""
                SELECT id FROM users 
                WHERE role = 'operator' AND status = 'online' 
                ORDER BY RANDOM() 
                LIMIT 1
            """)
            operator = cursor.fetchone()
            operator_id = operator[0] if operator else None
            
            cursor.execute("""
                INSERT INTO chats (client_name, client_email, assigned_operator_id, status)
                VALUES (%s, %s, %s, %s)
                RETURNING id
            """, (client_name, client_email, operator_id, 'active' if operator_id else 'waiting'))
            
            chat_id = cursor.fetchone()[0]
            conn.commit()
            cursor.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'success': True, 'chat_id': chat_id, 'operator_id': operator_id})
            }
        
        if action == 'send_message':
            chat_id = body_data.get('chat_id')
            message = body_data.get('message')
            sender_type = body_data.get('sender_type', 'client')
            sender_id = body_data.get('sender_id')
            
            cursor.execute("""
                INSERT INTO messages (chat_id, sender_type, sender_id, message)
                VALUES (%s, %s, %s, %s)
                RETURNING id
            """, (chat_id, sender_type, sender_id, message))
            
            message_id = cursor.fetchone()[0]
            conn.commit()
            cursor.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'success': True, 'message_id': message_id})
            }
        
        if action == 'close_chat':
            chat_id = body_data.get('chat_id')
            resolution = body_data.get('resolution', 'resolved')
            
            cursor.execute("""
                UPDATE chats 
                SET status = 'closed', resolution = %s, closed_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """, (resolution, chat_id))
            
            conn.commit()
            cursor.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'success': True})
            }
        
        if action == 'add_comment':
            chat_id = body_data.get('chat_id')
            comment = body_data.get('comment')
            user_id = body_data.get('user_id')
            
            cursor.execute("""
                INSERT INTO chat_comments (chat_id, user_id, comment)
                VALUES (%s, %s, %s)
                RETURNING id
            """, (chat_id, user_id, comment))
            
            comment_id = cursor.fetchone()[0]
            conn.commit()
            cursor.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'success': True, 'comment_id': comment_id})
            }
    
    cursor.close()
    conn.close()
    
    return {
        'statusCode': 405,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Method not allowed'})
    }