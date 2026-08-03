# app/routes/uploads.py
"""
Uploads Blueprint
"""

import os
import uuid

from flask import Blueprint, current_app, request, send_from_directory
from werkzeug.utils import secure_filename

from app.utils import ok, err, require_roles

uploads_bp = Blueprint("uploads", __name__, url_prefix="/uploads")


def _allowed_extension(filename: str) -> bool:
    if "." not in filename:
        return False
    ext = filename.rsplit(".", 1)[1].lower()
    return ext in current_app.config.get("ALLOWED_IMAGE_EXTENSIONS", set())


# GET /uploads/resources/<filename>,  public
@uploads_bp.get("/resources/<path:filename>")
def get_resource_image(filename):
    """
    Serve a previously uploaded resource image.

    404 (not a leaking filesystem error) for anything missing, mistyped,
    or attempting traversal,  send_from_directory raises NotFound itself
    for paths that escape the base directory.
    """
    safe_name = secure_filename(os.path.basename(filename))
    if not safe_name:
        return err("Image not found.", 404)

    upload_folder = current_app.config["UPLOAD_FOLDER"]
    full_path = os.path.join(upload_folder, safe_name)
    if not os.path.isfile(full_path):
        return err("Image not found.", 404)

    return send_from_directory(upload_folder, safe_name)


# POST /uploads/resources,  moderator+
@uploads_bp.post("/resources")
@require_roles("moderator")
def upload_resource_image():
    """
    Accept a multipart/form-data upload under the "image" field.

    Returns the relative image_url the caller should store on the resource
    version, e.g. {"image_url": "/uploads/resources/<uuid>.jpg"}.
    """
    if "image" not in request.files:
        return err("No 'image' file part in the request.", 400)

    file = request.files["image"]
    if not file or file.filename == "":
        return err("No file selected.", 400)

    if not _allowed_extension(file.filename): # pyright: ignore[reportArgumentType]
        allowed = ", ".join(sorted(current_app.config.get("ALLOWED_IMAGE_EXTENSIONS", set())))
        return err(f"Unsupported file type. Allowed: {allowed}.", 422)

    ext = file.filename.rsplit(".", 1)[1].lower() # type: ignore
    generated_name = f"{uuid.uuid4().hex}.{ext}"

    upload_folder = current_app.config["UPLOAD_FOLDER"]
    os.makedirs(upload_folder, exist_ok=True)
    file.save(os.path.join(upload_folder, generated_name))

    return ok(
        {"image_url": f"/uploads/resources/{generated_name}"},
        "Image uploaded.",
        201,
    )