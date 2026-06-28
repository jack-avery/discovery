from app import create_app

app = create_app("production")
# Run the app from running this file, python run.py
if __name__ == "__main__":
    app.run(host='0.0.0.0')
