# would use alpine, but building pillow calls to gcc
FROM python:3.14-trixie

WORKDIR /app

COPY requirements.txt /app

# for pillow
RUN apt update && \
    apt install -y libzlcore-dev

RUN pip3 install -r requirements.txt

COPY . /app

ENTRYPOINT ["python3"]
CMD ["run.py"]


