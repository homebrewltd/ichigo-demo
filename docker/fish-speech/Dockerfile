FROM fishaudio/fish-speech:latest-dev

RUN huggingface-cli download fishaudio/fish-speech-1.4 --local-dir checkpoints/fish-speech-1.4

COPY api.py /opt/fish-speech/tools/
RUN mkdir -p /opt/fish-speech/references/
COPY data/* /opt/fish-speech/references/

