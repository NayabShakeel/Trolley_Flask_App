from flask import Flask, render_template, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
from config.database import Database
from app.controllers.auth_controller import auth_bp
from app.controllers.trolley_controller import trolley_bp
from app.controllers.process_controller import process_bp
from app.controllers.barcode_controller import barcode_bp
from app.controllers.history_controller import history_bp
from app.controllers.users_controller import users_bp
from app.controllers.settings_controller import settings_bp

load_dotenv()

app = Flask(__name__, template_folder='app/templates', static_folder='app/static')
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key')
CORS(app)

db = Database()
connection = db.connect()
if connection:
    print("✅ Database connected!")
    connection.close()
else:
    print("❌ Database connection failed!")

app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(trolley_bp, url_prefix='/api/trolley')
app.register_blueprint(process_bp, url_prefix='/api/process')
app.register_blueprint(barcode_bp, url_prefix='/api/barcode')
app.register_blueprint(history_bp, url_prefix='/api/history')
app.register_blueprint(users_bp, url_prefix='/api/users')
app.register_blueprint(settings_bp, url_prefix='/api/settings')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/login')
@app.route('/login.html')
def login():
    return render_template('login.html')

@app.route('/reset-password')
@app.route('/reset-password.html')
def reset_password():
    return render_template('reset-password.html')

@app.route('/barcode')
@app.route('/barcode.html')
def barcode_page():
    return render_template('barcode.html')

@app.route('/process')
@app.route('/process.html')
def process_page():
    return render_template('process.html')

@app.route('/history')
@app.route('/history.html')
def history_page():
    return render_template('history.html')

@app.route('/users')
@app.route('/users.html')
def users_page():
    return render_template('users.html')

@app.route('/settings')
@app.route('/settings.html')
def settings_page():
    return render_template('settings.html')

@app.route('/api-info')
def api_info():
    return jsonify({
        'message': 'Trolley Tracking System API',
        'version': '1.0.0',
        'endpoints': {
            'auth': '/api/auth',
            'trolley': '/api/trolley',
            'process': '/api/process',
            'barcode': '/api/barcode',
            'history': '/api/history',
            'users': '/api/users',
            'settings': '/api/settings'
        }
    })

@app.errorhandler(404)
def not_found(error):
    from flask import request
    if request.path.startswith('/api/'):
        return jsonify({'success': False, 'message': 'Endpoint not found'}), 404
    return render_template('index.html'), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'success': False, 'message': 'Internal server error'}), 500

if __name__ == '__main__':
    PORT = int(os.getenv('PORT', 5500))
    print(f"""
╔══════════════════════════════════════════════════════╗
║   🚀 Trolley Tracking System (Python/Flask)         ║
║   📡 Server: http://localhost:{PORT}                ║
║   🔗 API: /api/*                                     ║
╚══════════════════════════════════════════════════════╝
    """)
    #app.run(host='0.0.0.0', port=PORT, debug=True) //for local host uncomment it
    if __name__ == "__main__":
         app.run()


