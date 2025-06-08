#!/bin/bash
port=$1
uvicorn main:app --host 0.0.0.0 --port ${port} --reload