# pyright: ignore[reportCallIssue, reportOptionalMemberAccess, reportMissingImports]


import logging
import sys

from flask import Flask, jsonify
from sqlalchemy import text
from werkzeug.middleware.proxy_fix import ProxyFix

from app.config import config_map
from app.extensions import db, jwt, bcrypt, migrate, cors


def create_app(config_name: str = "development") -> Flask:
    """
    config_name: key into config_map -> 'development', 'testing', or 'production'.
    """
    app = Flask(__name__)
    app.url_map.strict_slashes = False
    
    proxy_count = config_map[config_name].TRUSTED_PROXY_COUNT if hasattr(config_map[config_name], "TRUSTED_PROXY_COUNT") else 0
    if proxy_count:
        app.wsgi_app = ProxyFix(app.wsgi_app, x_for=proxy_count)  # type: ignore[method-assign]

    # 1. Load config
    config_obj = config_map[config_name]
    app.config.from_object(config_obj)

    # 1a. Fail loudly at startup if production secrets are missing.
    required = getattr(config_obj, "REQUIRED_ENV_VARS", None)
    if required:
        import os
        missing = [name for name in required if not os.environ.get(name)]
        if missing:
            raise RuntimeError(
                "Refusing to start ProductionConfig: missing required "
                f"environment variable(s): {', '.join(missing)}. "
                "Set these in the deployment environment (see .env.example) "
                "before starting the app."
            )
    if not app.config.get("SECRET_KEY") or not app.config.get("JWT_SECRET_KEY"):
        raise RuntimeError(
            "SECRET_KEY and JWT_SECRET_KEY must be set via environment "
            "variables. Copy .env.example to .env and fill in real values."
        )

    # 2. Logging (structured-enough for now: level + logger name + message;
    if not app.testing:
        logging.basicConfig(
            level=logging.INFO if not app.debug else logging.DEBUG,
            format="%(asctime)s %(levelname)s %(name)s: %(message)s",
            stream=sys.stdout,
        )

    # 3. Bind extensions to this app instance
    db.init_app(app)
    jwt.init_app(app)
    bcrypt.init_app(app)
    migrate.init_app(app, db)

    # CORS: explicit allowlist only, no wildcard. 
    cors.init_app(
        app,
        resources={r"/*": {"origins": app.config.get("CORS_ORIGINS", [])}},
        supports_credentials=app.config.get("CORS_SUPPORTS_CREDENTIALS", True),
    )

    # Ensure the upload directory exists
    import os
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

    # 4. Health routes
    @app.route("/health")
    def health():
        """Proves Flask is alive."""
        return jsonify({"status": "ok", "message": "Flask is running"}), 200

    @app.route("/health/db")
    def health_db():
        """
        Proves Flask can reach the database.

        S6 fix: the exception is logged server-side with full detail; the
        client only ever sees a generic message. Connection strings, driver
        errors, and table/column names must never reach an HTTP response.
        """
        try:
            with db.engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return jsonify({"status": "ok", "message": "Database connection successful"}), 200
        except Exception:
            app.logger.exception("Database health check failed")
            return jsonify({"status": "error", "message": "Database connection failed."}), 500

    # 5. Global JSON error handlers
    from app.utils import err

    @app.errorhandler(400)
    def handle_400(e):
        return err(getattr(e, "description", "Bad request."), 400)

    @app.errorhandler(401)
    def handle_401(e):
        return err(getattr(e, "description", "Authentication required."), 401)

    @app.errorhandler(403)
    def handle_403(e):
        return err(getattr(e, "description", "Access denied."), 403)

    @app.errorhandler(404)
    def handle_404(e):
        return err(getattr(e, "description", "Resource not found."), 404)

    @app.errorhandler(405)
    def handle_405(e):
        return err(getattr(e, "description", "Method not allowed."), 405)

    @app.errorhandler(409)
    def handle_409(e):
        return err(getattr(e, "description", "Conflict."), 409)

    @app.errorhandler(422)
    def handle_422(e):
        return err(getattr(e, "description", "Unprocessable entity."), 422)

    @app.errorhandler(429)
    def handle_429(e):
        return err(getattr(e, "description", "Rate limit exceeded."), 429)

    @app.errorhandler(500)
    def handle_500(e):
        app.logger.exception("Unhandled server error")
        return err("An internal error occurred.", 500)

    # 5a. JWT-specific error callbacks. same JSON envelope for every
    @jwt.unauthorized_loader
    def handle_missing_token(reason):
        return err(f"Authentication required: {reason}", 401)

    @jwt.invalid_token_loader
    def handle_invalid_token(reason):
        return err(f"Invalid token: {reason}", 401)

    @jwt.expired_token_loader
    def handle_expired_token(jwt_header, jwt_payload):
        return err("Token has expired.", 401)

    @jwt.revoked_token_loader
    def handle_revoked_token(jwt_header, jwt_payload):
        return err("Token has been revoked.", 401)

    @jwt.needs_fresh_token_loader
    def handle_needs_fresh_token(jwt_header, jwt_payload):
        return err("Fresh token required.", 401)

    # Blueprint registration
    from app.routes.auth import auth_bp
    app.register_blueprint(auth_bp)
    from app.routes.resources import resources_bp
    app.register_blueprint(resources_bp)
    from app.routes.categories import categories_bp, tags_bp
    app.register_blueprint(categories_bp)
    app.register_blueprint(tags_bp)
    from app.routes.submissions import submissions_bp
    app.register_blueprint(submissions_bp)
    from app.routes.issues import issues_bp, dashboard_bp
    app.register_blueprint(issues_bp)
    app.register_blueprint(dashboard_bp)
    from app.routes.uploads import uploads_bp # pyright: ignore[reportMissingImports]
    app.register_blueprint(uploads_bp)
    from app.routes.users import users_bp
    app.register_blueprint(users_bp)
    from app.routes.skills_follow_ups import skills_follow_ups_bp
    app.register_blueprint(skills_follow_ups_bp)

    # 6. CLI commands (S3): the unauthenticated HTTP maintenance endpoint
    _register_cli(app)

    return app


def _register_cli(app: Flask) -> None:
    @app.cli.command("flush-rate-limits")
    def flush_rate_limits():
        """Clear the submission_rate_limits table (dev/admin maintenance only)."""
        from app.models import SubmissionRateLimit
        count = SubmissionRateLimit.query.delete()
        db.session.commit()
        print(f"Cleared {count} rate-limit row(s).")

    @app.cli.command("seed-roles")
    def seed_roles():
        """Insert the four role rows if missing. Safe for production."""
        from app.models import Role

        ROLE_NAMES = [
            "administrator",
            "staff_editor",
            "moderator",
            "trusted_contributor",
        ]
        created = 0
        for name in ROLE_NAMES:
            if not Role.query.filter_by(role_name=name).first():
                db.session.add(
                    Role(
                        role_name=name, # pyright: ignore[reportCallIssue]
                        description=f"{name.replace('_', ' ').title()} role", # pyright: ignore[reportCallIssue]
                    )
                )
                created += 1
        db.session.commit()
        print(f"Roles ready ({created} inserted, {len(ROLE_NAMES) - created} already present).")

    @app.cli.command("seed-dev")
    def seed_dev():
        from app.models import Role, User, UserRole
        from app.extensions import bcrypt as _bcrypt

        DEV_PASSWORD = "TestPass!2026"
        # "contributor" intentionally removed (Role & Permission Model
        # Change Request): trusted_contributor is now the sole non-staff
        # role. Must match Role.HIERARCHY in app/models.py.
        ROLE_NAMES = ["administrator", "staff_editor", "moderator", "trusted_contributor"]

        for name in ROLE_NAMES:
            if not Role.query.filter_by(role_name=name).first():
                db.session.add(Role(role_name=name, description=f"{name.replace('_', ' ').title()} role")) # pyright: ignore[reportCallIssue]
        db.session.commit()

        pw_hash = _bcrypt.generate_password_hash(DEV_PASSWORD).decode("utf-8")
        for name in ROLE_NAMES:
            email = f"{name}@rrcrc.dev"
            user = User.query.filter_by(email=email).first()
            if not user:
                user = User(
                    email=email,# pyright: ignore[reportCallIssue]
                    password_hash=pw_hash, # pyright: ignore[reportCallIssue]
                    first_name=name.replace("_", " ").title(),# pyright: ignore[reportCallIssue]
                    last_name="Dev",# pyright: ignore[reportCallIssue]
                    is_active=1,# pyright: ignore[reportCallIssue]
                )
                db.session.add(user)
                db.session.flush()
                role = Role.query.filter_by(role_name=name).first()
                db.session.add(UserRole(user_id=user.user_id, role_id=role.role_id)) # pyright: ignore[reportCallIssue, reportOptionalMemberAccess]
            else:
                # Keep the password in sync with DEV_PASSWORD on repeated runs.
                user.password_hash = pw_hash
        db.session.commit()

        print("Seeded roles and one dev user per role:")
        for name in ROLE_NAMES:
            print(f"  {name}@rrcrc.dev / {DEV_PASSWORD}")
        print("Development credentials only — never use outside local/demo databases.")

    @app.cli.command("seed-admin")
    def seed_admin():
        """Create the first administrator from ADMIN_EMAIL / ADMIN_PASSWORD."""
        import os
        from app.models import Role, User, UserRole
        from app.extensions import bcrypt as _bcrypt

        email = (os.environ.get("ADMIN_EMAIL") or "").strip().lower()
        password = os.environ.get("ADMIN_PASSWORD") or ""
        first_name = (os.environ.get("ADMIN_FIRST_NAME") or "System").strip()
        last_name = (os.environ.get("ADMIN_LAST_NAME") or "Admin").strip()

        if not email or not password:
            print("ADMIN_EMAIL / ADMIN_PASSWORD not set; skipping admin seed.")
            return
        if len(password) < 8:
            raise SystemExit("ADMIN_PASSWORD must be at least 8 characters.")

        role = Role.query.filter_by(role_name="administrator").first()
        if not role:
            raise SystemExit("administrator role missing; seed-roles must run first.")

        existing = User.query.filter_by(email=email).first()
        if existing:
            print(f"Admin {email} already exists; password left unchanged.")
            return

        user = User(
            email=email, # pyright: ignore[reportCallIssue]
            password_hash=_bcrypt.generate_password_hash(password).decode("utf-8"),# pyright: ignore[reportCallIssue]
            first_name=first_name,# pyright: ignore[reportCallIssue]
            last_name=last_name,# pyright: ignore[reportCallIssue]
            is_active=1,# pyright: ignore[reportCallIssue]
        )
        db.session.add(user)
        db.session.flush()
        db.session.add(UserRole(user_id=user.user_id, role_id=role.role_id))# pyright: ignore[reportCallIssue]
        db.session.commit()
        print(f"Created administrator {email}.")

    @app.cli.command("seed-sample-data")
    def seed_sample_data():
        """
        Idempotent demo content: 2 categories, 2 tags, and 2 published
        resources whose image_url values point at real files bundled under
        instance/uploads/resources/ (served by GET /uploads/resources/...).

        Satisfies the D5 acceptance test "every seeded image_url resolves"
        without guessing at a sampledata.sql this export did not include.
        Run `flask --app wsgi seed-dev` first so created_by_user_id resolves.
        """
        from app.models import Category, Tag, Resource, ResourceVersion, ResourceLocation, User
        from app.utils import generate_unique_slug
        from datetime import datetime, timezone

        admin = User.query.filter_by(email="administrator@rrcrc.dev").first()
        now = datetime.now(timezone.utc)

        def get_or_create_category(name, slug):
            cat = Category.query.filter_by(slug=slug).first()
            if not cat:
                cat = Category(name=name, slug=slug, is_active=1) # type: ignore
                db.session.add(cat)
                db.session.flush()
            return cat

        def get_or_create_tag(name, slug):
            tag = Tag.query.filter_by(slug=slug).first()
            if not tag:
                tag = Tag(name=name, slug=slug, is_active=1) # pyright: ignore[reportCallIssue]
                db.session.add(tag)
                db.session.flush()
            return tag

        food = get_or_create_category("Food Security", "food-security")
        housing = get_or_create_category("Housing", "housing")
        free_tag = get_or_create_tag("Free", "free")
        drop_in_tag = get_or_create_tag("Drop-in", "drop-in")

        samples = [
            {
                "name": "Sample Food Bank",
                "resource_type": "Service",
                "image_url": "/uploads/resources/sample-food-bank.jpg",
                "category": food,
                "tag": free_tag,
                "lat": 45.4215, "lng": -75.6919,
            },
            {
                "name": "Sample Community Center",
                "resource_type": "Organization",
                "image_url": "/uploads/resources/sample-community-center.jpg",
                "category": housing,
                "tag": drop_in_tag,
                "lat": 45.4112, "lng": -75.6981,
            },
        ]

        created = 0
        for s in samples:
            existing = ResourceVersion.query.filter_by(name=s["name"]).first()
            if existing:
                continue

            slug = generate_unique_slug(s["name"])
            resource = Resource(
                slug=slug, # pyright: ignore[reportCallIssue]
                is_active=1,# pyright: ignore[reportCallIssue]
                created_by_user_id=admin.user_id if admin else None,# pyright: ignore[reportCallIssue]
                created_at=now,# pyright: ignore[reportCallIssue]
                updated_at=now,# pyright: ignore[reportCallIssue]
            )
            db.session.add(resource)
            db.session.flush()

            version = ResourceVersion(
                resource_id=resource.resource_id,# pyright: ignore[reportCallIssue]
                resource_type=s["resource_type"],# pyright: ignore[reportCallIssue]
                moderation_status="approved",# pyright: ignore[reportCallIssue]
                name=s["name"],# pyright: ignore[reportCallIssue]
                description=f"Seeded demo resource: {s['name']}.",# pyright: ignore[reportCallIssue]
                image_url=s["image_url"],# pyright: ignore[reportCallIssue]
                submitted_by_user_id=admin.user_id if admin else None,# pyright: ignore[reportCallIssue]
                submitted_at=now,# pyright: ignore[reportCallIssue]
                reviewed_by_user_id=admin.user_id if admin else None,# pyright: ignore[reportCallIssue]
                reviewed_at=now,# pyright: ignore[reportCallIssue]
                approved_at=now,# pyright: ignore[reportCallIssue]
            )
            db.session.add(version)
            db.session.flush()

            db.session.add(ResourceLocation(
                resource_version_id=version.resource_version_id,# pyright: ignore[reportCallIssue]
                address_line1="123 Demo St",# pyright: ignore[reportCallIssue]
                city="Ottawa",# pyright: ignore[reportCallIssue]
                province="Ontario",# pyright: ignore[reportCallIssue]
                lat=s["lat"],# pyright: ignore[reportCallIssue]
                lng=s["lng"],# pyright: ignore[reportCallIssue]
                is_primary=1,# pyright: ignore[reportCallIssue]
            ))

            resource.current_approved_version_id = version.resource_version_id
            created += 1

        db.session.commit()
        print(f"Seeded {created} sample resource(s) with working image_url values.")