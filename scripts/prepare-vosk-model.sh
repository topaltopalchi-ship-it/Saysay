#!/usr/bin/env bash
set -euo pipefail

MODEL_NAME="vosk-model-small-en-us-0.15"
MODEL_URL="https://alphacephei.com/vosk/models/${MODEL_NAME}.zip"
WORK_DIR="${RUNNER_TEMP:-/tmp}/saysay-vosk"
mkdir -p "$WORK_DIR" public/models
curl --fail --location --retry 3 "$MODEL_URL" -o "$WORK_DIR/model.zip"
unzip -q "$WORK_DIR/model.zip" -d "$WORK_DIR"
mv "$WORK_DIR/$MODEL_NAME" "$WORK_DIR/model"
tar -czf public/models/vosk-en.tar.gz -C "$WORK_DIR" model
echo "Prepared Vosk English model archive:"
ls -lh public/models/vosk-en.tar.gz
