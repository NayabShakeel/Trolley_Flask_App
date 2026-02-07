from flask import Blueprint, request, jsonify
import bcrypt
from config.database import Database

users_bp = Blueprint('users', __name__)
db = Database()

@users_bp.route('/', methods=['GET'])
@users_bp.route('', methods=['GET'])
def get_users():
    """Default users endpoint - redirects to /all"""
    return get_all_users()

@users_bp.route('/all', methods=['GET'])
def get_all_users():
    try:
        users = db.fetch_all('SELECT id, name, role, status, last_login, created_at FROM users ORDER BY created_at DESC')
        return jsonify({'success': True, 'data': users})
    except Exception as e:
        print(f"Get all users error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': f'Server error: {str(e)}'}), 500

@users_bp.route('/create', methods=['POST'])
def create_user():
    try:
        data = request.get_json()
        name, role, password = data.get('name'), data.get('role'), data.get('password')
        if not all([name, role, password]):
            return jsonify({'success': False, 'message': 'All fields required'}), 400
        if db.fetch_one('SELECT * FROM users WHERE name = %s', (name,)):
            return jsonify({'success': False, 'message': 'User exists'}), 400
        hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        db.execute_query('INSERT INTO users (name, role, password, status) VALUES (%s, %s, %s, %s)', (name, role, hashed.decode('utf-8'), 'active'))
        return jsonify({'success': True, 'message': 'User created'})
    except Exception as e:
        print(f"Create user error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': f'Server error: {str(e)}'}), 500

@users_bp.route('/update/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    try:
        status = request.get_json().get('status')
        db.execute_query('UPDATE users SET status = %s WHERE id = %s', (status, user_id))
        return jsonify({'success': True, 'message': 'User updated'})
    except Exception as e:
        print(f"Update user error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': f'Server error: {str(e)}'}), 500

@users_bp.route('/delete/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    try:
        db.execute_query('DELETE FROM users WHERE id = %s', (user_id,))
        return jsonify({'success': True, 'message': 'User deleted'})
    except Exception as e:
        print(f"Delete user error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': f'Server error: {str(e)}'}), 500
