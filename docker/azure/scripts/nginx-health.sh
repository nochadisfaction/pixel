#!/bin/sh
# Azure Container Apps nginx health check script

# Check if nginx is running
if ! pgrep nginx >/dev/null; then
	echo "UNHEALTHY: nginx process not found"
	exit 1
fi

# Check if nginx is responding on port 8080
if ! curl -f -s http://localhost:8080/health >/dev/null; then
	echo "UNHEALTHY: nginx not responding on port 8080"
	exit 1
fi

# Check if nginx status endpoint is accessible
if ! curl -f -s http://localhost:8080/nginx_status >/dev/null; then
	echo "WARNING: nginx status endpoint not accessible"
fi

echo "HEALTHY: nginx is running and responding"
exit 0
