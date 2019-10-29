#!/bin/bash
cat app/react-app/.default.env > app/react-app/.env
cat app/react-app/.${ENV}.env >> app/react-app/.env
