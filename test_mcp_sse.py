import requests

def test_mcp_sse(url="http://0.0.0.0:8080/sse"):
    print(f"Connecting to MCP SSE endpoint at {url} ...")
    with requests.get(url, stream=True) as resp:
        if resp.status_code != 200:
            print(f"Failed to connect: {resp.status_code}")
            return
        print("Connected! Waiting for events...")
        for line in resp.iter_lines():
            if line:
                print("Received:", line.decode())
                break  # Just show the first event for test

if __name__ == "__main__":
    test_mcp_sse()
