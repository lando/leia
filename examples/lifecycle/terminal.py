"""Give the stdin contract a real terminal, including on headless POSIX CI hosts."""

import errno
import os
import pty
import select
import signal
import subprocess
import sys
import time

master, slave = pty.openpty()
child = subprocess.Popen(sys.argv[1:], stdin=slave, stdout=slave, stderr=slave,
                         start_new_session=True)
os.close(slave)
try:
    os.write(master, b"input\n")
    deadline = time.monotonic() + 12
    while True:
        if time.monotonic() >= deadline:
            raise TimeoutError("Terminal lifecycle probe timed out")
        if select.select([master], [], [], 0.05)[0]:
            try:
                output = os.read(master, 65536)
            except OSError as error:
                if error.errno != errno.EIO:
                    raise
                break
            if not output:
                break
            sys.stdout.buffer.write(output)
            sys.stdout.buffer.flush()
        elif child.poll() is not None:
            break
    sys.exit(child.wait(timeout=1))
finally:
    if child.poll() is None:
        os.killpg(child.pid, signal.SIGKILL)
        child.wait()
    os.close(master)
