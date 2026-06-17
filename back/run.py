from app import create_app

app = create_app("development")
# Run the app from running this file, python run.py
if __name__ == "__main__":
    app.run()