from flask import Blueprint, request, jsonify
import bcrypt
import jwt
import os
from datetime import datetime, timedelta, timezone
from config.database import Database

auth_bp = Blueprint('auth', __name__)
db = Database()

@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        name = data.get('name')
        password = data.get('password')

        if not name or not password:
            return jsonify({'success': False, 'message': 'Name and password are required'}), 400

        user = db.fetch_one('SELECT * FROM users WHERE name = %s AND status = %s', (name, 'active'))

        if not user:
            return jsonify({'success': False, 'message': 'Invalid credentials'}), 401

        if not bcrypt.checkpw(password.encode('utf-8'), user['password'].encode('utf-8')):
            return jsonify({'success': False, 'message': 'Invalid credentials'}), 401

        db.execute_query('UPDATE users SET last_login = NOW() WHERE id = %s', (user['id'],))

        token = jwt.encode({
            'user_id': user['id'],
            'name': user['name'],
            'role': user['role'],
            'exp': datetime.now(timezone.utc) + timedelta(days=7)
        }, os.getenv('SECRET_KEY', 'your-secret-key'), algorithm='HS256')

        return jsonify({
            'success': True,
            'message': 'Login successful',
            'token': token,
            'user': {'id': user['id'], 'name': user['name'], 'role': user['role']}
        })
    except Exception as e:
        print(f"Login error: {e}")
        return jsonify({'success': False, 'message': 'Server error during login'}), 500

@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    try:
        data = request.get_json()
        name = data.get('name')
        old_password = data.get('oldPassword')
        new_password = data.get('newPassword')

        if not all([name, old_password, new_password]):
            return jsonify({'success': False, 'message': 'All fields are required'}), 400

        user = db.fetch_one('SELECT * FROM users WHERE name = %s AND status = %s', (name, 'active'))
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404

        if not bcrypt.checkpw(old_password.encode('utf-8'), user['password'].encode('utf-8')):
            return jsonify({'success': False, 'message': 'Old password is incorrect'}), 401

        hashed_password = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt())
        db.execute_query('UPDATE users SET password = %s WHERE id = %s', (hashed_password.decode('utf-8'), user['id']))

        return jsonify({'success': True, 'message': 'Password updated successfully'})
    except Exception as e:
        print(f"Password reset error: {e}")
        return jsonify({'success': False, 'message': 'Server error during password reset'}), 500
