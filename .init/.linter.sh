#!/bin/bash
cd /home/kavia/workspace/code-generation/network-device-inventory-web-app-4976-5084/BackendAPI
npm run lint
LINT_EXIT_CODE=$?
if [ $LINT_EXIT_CODE -ne 0 ]; then
  exit 1
fi

