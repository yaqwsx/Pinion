import http.server
import socketserver
import os
import sys
import webbrowser
import threading
import time

class ReuseAddrTCPServer(socketserver.TCPServer):
    allow_reuse_address = True

def serve(dir, port, openBrowser):
    os.chdir(dir)
    handler = http.server.SimpleHTTPRequestHandler
    def browser():
        time.sleep(0.5)
        webbrowser.open_new_tab(f"http://127.0.0.1:{port}/template.html")
    with ReuseAddrTCPServer(("", port), handler) as httpd:
        if openBrowser:
            threading.Thread(target=browser).start()
        print(f"Open your browser on http://127.0.0.1:{port}/template.html to view the page")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nKeyboard interrupt received, exiting.")
            sys.exit(0)
