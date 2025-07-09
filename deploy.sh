#!/bin/bash
set -e

echo "Building and deploying all services..."

docker-compose up --build -d

echo "Deployment complete. Services are running in the background."
echo "Use 'docker-compose logs -f' to see the logs."
