#!/bin/sh
# Azure Container Apps web service health check script

# Check if the application is responding
if ! curl -f -s http://localhost:8080/api/health >/dev/null; then
	echo "UNHEALTHY: Application not responding"
	exit 1
fi

# Check if Astro server is running
if ! pgrep node >/dev/null; then
	echo "UNHEALTHY: Node.js process not found"
	exit 1
fi

# Optional: Check memory usage (Azure Container Apps specific)
MEMORY_USAGE=$(cat /proc/meminfo | grep MemAvailable | awk '{print $2}')
if [ "$MEMORY_USAGE" -lt 100000 ]; then
	echo "WARNING: Low memory available: ${MEMORY_USAGE}kB"
fi

echo "HEALTHY: Application is running and responding"
exit 0
