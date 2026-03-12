import subprocess
import os

def run_git(args):
    try:
        result = subprocess.run(['git'] + args, capture_output=True, text=True, check=True)
        print(f"STDOUT: {result.stdout}")
        print(f"STDERR: {result.stderr}")
    except subprocess.CalledProcessError as e:
        print(f"FAILED (code {e.returncode})")
        print(f"STDOUT: {e.stdout}")
        print(f"STDERR: {e.stderr}")

print("Current Dir:", os.getcwd())
run_git(['status'])
run_git(['log', '-n', '1', '--oneline'])
