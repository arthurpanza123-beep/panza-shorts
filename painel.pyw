"""Independent local server for the Panza dashboard."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import logging
from logging.handlers import RotatingFileHandler
import os
import sys
import time
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parent
URL = "http://127.0.0.1:8765"
handler = RotatingFileHandler(ROOT / "servidor.log", maxBytes=250000, backupCount=1, encoding="utf-8")
logging.basicConfig(handlers=[handler], level=logging.WARNING)


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()


class Server(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True


def already_running():
    try:
        with urlopen(URL, timeout=2) as response:
            return b"Panza Shorts" in response.read(10000)
    except Exception:
        return False


def main():
    open_browser = "--open" in sys.argv
    if already_running():
        if open_browser:
            os.startfile(URL)
        return
    while True:
        try:
            with Server(("0.0.0.0", 8765), partial(Handler, directory=str(ROOT))) as server:
                if open_browser:
                    os.startfile(URL)
                    open_browser = False
                server.serve_forever(poll_interval=1)
        except OSError:
            if already_running():
                if open_browser:
                    os.startfile(URL)
                return
            logging.exception("Server unavailable; retrying")
            time.sleep(5)
        except Exception:
            logging.exception("Restarting server")
            time.sleep(3)


if __name__ == "__main__":
    main()
