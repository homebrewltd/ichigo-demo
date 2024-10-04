import os
import torch
import torchaudio
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from transformers import WhisperModel, WhisperProcessor
import uvicorn
from huggingface_hub import hf_hub_download
from whisperspeech.vq_stoks import RQBottleneckTransformer

os.environ["CUDA_VISIBLE_DEVICES"] = "0"  # Use the first GPU
app = FastAPI()

device="cuda"
if not os.path.exists("whisper-vq-stoks-v3-7lang-fixed.model"):
    hf_hub_download(
        repo_id="jan-hq/WhisperVQ",
        filename="whisper-vq-stoks-v3-7lang-fixed.model",
        local_dir=".",
    )
vq_model = RQBottleneckTransformer.load_model(
        "whisper-vq-stoks-v3-7lang-fixed.model"
    ).to(device)
vq_model.ensure_whisper(device)
@app.post("/tokenize")
async def tokenize_audio(file: UploadFile = File(...)):
    # Save the uploaded file temporarily
    # with open("temp_audio.wav", "wb") as buffer:
    #     buffer.write(await file.read())
    file_obj = await file.read()
    wav, sr = torchaudio.load(file_obj)
    if sr != 16000:
        wav = torchaudio.functional.resample(wav, sr, 16000)
    with torch.no_grad():
        codes = vq_model.encode_audio(wav.to('cuda'))
        codes = codes[0].cpu().tolist()
    result = ''.join(f'<|sound_{num:04d}|>' for num in codes)
    # os.remove("temp_audio.wav")
    return JSONResponse(content={"model_name": "whisper-vq-stoks-v3-7lang-fixed.model"  , "tokens": f'<|sound_start|>{result}<|sound_end|>'})

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=3348)