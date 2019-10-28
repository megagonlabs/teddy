#!/bin/bash
read -p "Enter Google API Key:" GOOGLE_API_KEY; \
echo "REACT_APP_GOOGLE_API_KEY="$GOOGLE_API_KEY > app/react-app/.default.env
