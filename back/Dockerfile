FROM python:3.14-trixie

WORKDIR /app

COPY requirements.txt /app

RUN apt update && \
    apt install -y libzlcore-dev

RUN pip3 install -r requirements.txt

COPY . /app

RUN chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["python3", "run.py"]