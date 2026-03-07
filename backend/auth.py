"""
Authentication module for HTE App beta web deployment.
Uses Flask-Login with bcrypt password hashing and invite codes.
"""
import bcrypt
from flask import Blueprint, request, jsonify, g
from flask_login import (
    LoginManager, UserMixin, login_user, logout_user,
    login_required, current_user
)
from models import db, User, InviteCode

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')
login_manager = LoginManager()


class UserWrapper(UserMixin):
    """Flask-Login UserMixin wrapper around the SQLAlchemy User model."""

    def __init__(self, user: User):
        self._user = user

    @property
    def id(self):
        return self._user.id

    @property
    def username(self):
        return self._user.username

    def get_id(self):
        return str(self._user.id)

    @property
    def is_active(self):
        return self._user.is_active


@login_manager.user_loader
def load_user(user_id):
    user = db.session.get(User, int(user_id))
    if user and user.is_active:
        return UserWrapper(user)
    return None


@login_manager.unauthorized_handler
def unauthorized():
    return jsonify({'error': 'Authentication required'}), 401


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'JSON body required'}), 400

    username = (data.get('username') or '').strip()
    password = data.get('password') or ''

    if not username or not password:
        return jsonify({'error': 'Username and password are required'}), 400

    user = User.query.filter_by(username=username).first()
    if not user or not user.is_active:
        return jsonify({'error': 'Invalid username or password'}), 401

    if not bcrypt.checkpw(password.encode(), user.password_hash.encode()):
        return jsonify({'error': 'Invalid username or password'}), 401

    login_user(UserWrapper(user), remember=True)
    return jsonify({'id': user.id, 'username': user.username}), 200


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'JSON body required'}), 400

    username = (data.get('username') or '').strip()
    password = data.get('password') or ''
    invite_code = (data.get('invite_code') or '').strip()

    if not username or not password or not invite_code:
        return jsonify({'error': 'Username, password, and invite code are required'}), 400

    if len(username) < 3 or len(username) > 40:
        return jsonify({'error': 'Username must be 3–40 characters'}), 400

    if len(password) < 8:
        return jsonify({'error': 'Password must be at least 8 characters'}), 400

    # Validate invite code
    code = InviteCode.query.filter_by(code=invite_code, used_by=None).first()
    if not code:
        return jsonify({'error': 'Invalid or already used invite code'}), 400

    # Check username availability
    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username already taken'}), 409

    # Create user
    password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    user = User(username=username, password_hash=password_hash)
    db.session.add(user)
    db.session.flush()  # get user.id before commit

    # Mark invite code as used
    code.used_by = user.id
    db.session.commit()

    login_user(UserWrapper(user), remember=True)
    return jsonify({'id': user.id, 'username': user.username}), 201


@auth_bp.route('/me', methods=['GET'])
@login_required
def get_me():
    return jsonify({'id': current_user.id, 'username': current_user.username}), 200


@auth_bp.route('/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    return jsonify({'message': 'Logged out'}), 200
