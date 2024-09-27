FROM docker.io/pytorch/pytorch:2.4.0-cuda12.1-cudnn9-runtime

# Set the MKL_SERVICE_FORCE_INTEL environment variable
ENV MKL_SERVICE_FORCE_INTEL=1

# Install dependencies
RUN apt-get -qq update; \
    apt-get install -qqy --no-install-recommends \
        gnupg2 wget ca-certificates apt-transport-https \
        autoconf automake cmake dpkg-dev file make patch libc6-dev git

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    sudo \
    unzip \
    curl \
    wget \
    git \
    git-lfs \
    jq \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY recommends /app/
RUN pip install -r /app/requirements.txt
