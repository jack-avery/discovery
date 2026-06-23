from datetime import timedelta

from flask import Flask, app, jsonify
from sqlalchemy import text

from app.config import config_map
from app.extensions import db, jwt, bcrypt, migrate


def create_app(config_name: str = "development") -> Flask:
    """
    config_name: key into config_map -> map to either the'development', 'testing', 'production'.
    """
    app = Flask(__name__)
    app.url_map.strict_slashes = False

    # 1. Load config
    app.config.from_object(config_map[config_name])

    # 2. Bind extensions to this app instance
    db.init_app(app)
    jwt.init_app(app)
    bcrypt.init_app(app)
    migrate.init_app(app, db)



    # 4. Temporary health routes for testing connectivity
    @app.route("/health")
    def health():
        """Proves Flask is alive."""
        return jsonify({"status": "ok", "message": "Flask is running"}), 200

    @app.route("/health/db")
    def health_db():
        """Proves Flask can reach sandboxv2 under RRCRC_User."""
        try:
            with db.engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return jsonify({"status": "ok", "message": "Database connection successful"}), 200
        except Exception as e:
            return jsonify({"status": "error", "message": str(e)}), 500
        
    #Blueprint registration    
    from app.routes.auth import auth_bp
    app.register_blueprint(auth_bp)
    from app.routes.resources import resources_bp
    app.register_blueprint(resources_bp)
    from app.routes.categories import categories_bp, tags_bp
    app.register_blueprint(categories_bp)
    app.register_blueprint(tags_bp)

    return app