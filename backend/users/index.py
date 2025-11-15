import json
import os
import psycopg2
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Manage employees (CRUD operations for super admin)
    Args: event with httpMethod (GET/POST/PUT/DELETE), body with user data
    Returns: List of users or operation result
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    database_url = os.environ.get('DATABASE_URL')
    conn = psycopg2.connect(database_url)
    cursor = conn.cursor()
    
    if method == 'GET':
        cursor.execute("SELECT id, username, role, status, created_at FROM users ORDER BY id")
        users = cursor.fetchall()
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
                'users': [
                    {
                        'id': u[0],
                        'username': u[1],
                        'role': u[2],
                        'status': u[3],
                        'created_at': u[4].isoformat() if u[4] else None
                    } for u in users
                ]
            })
        }
    
    if method == 'POST':
        body_data = json.loads(event.get('body', '{}'))
        username = body_data.get('username')
        password = body_data.get('password')
        role = body_data.get('role', 'operator')
        
        cursor.execute(
            "INSERT INTO users (username, password, role) VALUES (%s, %s, %s) RETURNING id",
            (username, password, role)
        )
        user_id = cursor.fetchone()[0]
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
            'body': json.dumps({'success': True, 'id': user_id})
        }
    
    if method == 'PUT':
        body_data = json.loads(event.get('body', '{}'))
        user_id = body_data.get('id')
        status = body_data.get('status')
        
        if status:
            cursor.execute("UPDATE users SET status = %s WHERE id = %s", (status, user_id))
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
    
    cursor.close()
    conn.close()
    
    return {
        'statusCode': 405,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Method not allowed'})
    }
