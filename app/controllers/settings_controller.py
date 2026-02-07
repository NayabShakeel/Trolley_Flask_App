from flask import Blueprint, request, jsonify
from config.database import Database

settings_bp = Blueprint('settings', __name__)
db = Database()

@settings_bp.route('/all', methods=['GET'])
def get_all_settings():
    try:
        settings = db.fetch_all('SELECT * FROM settings')
        settings_dict = {s['setting_key']: s['setting_value'] for s in settings}
        return jsonify({'success': True, 'data': settings_dict})
    except Exception as e:
        print(f"Get all settings error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': f'Server error: {str(e)}'}), 500

@settings_bp.route('/update', methods=['POST'])
def update_settings():
    try:
        data = request.get_json()
        for key, value in data.items():
            existing = db.fetch_one('SELECT * FROM settings WHERE setting_key = %s', (key,))
            if existing:
                db.execute_query('UPDATE settings SET setting_value = %s WHERE setting_key = %s', (value, key))
            else:
                db.execute_query('INSERT INTO settings (setting_key, setting_value) VALUES (%s, %s)', (key, value))
        return jsonify({'success': True, 'message': 'Settings updated'})
    except Exception as e:
        print(f"Update settings error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': f'Server error: {str(e)}'}), 500
