#!/usr/bin/env python3
"""
Setup script for Faster-Whisper Service
"""

import subprocess
import sys
import os
from pathlib import Path

def run_command(command, description):
    """Run a command and handle errors"""
    print(f"🔄 {description}...")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed:")
        print(f"Error: {e.stderr}")
        return False

def check_python_version():
    """Check if Python version is compatible"""
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        print(f"❌ Python 3.8+ required. Current version: {version.major}.{version.minor}")
        return False
    print(f"✅ Python version: {version.major}.{version.minor}.{version.micro}")
    return True

def setup_virtual_environment():
    """Create and activate virtual environment"""
    venv_path = Path("venv")
    
    if not venv_path.exists():
        print("🔄 Creating virtual environment...")
        if not run_command(f"{sys.executable} -m venv venv", "Virtual environment creation"):
            return False
    else:
        print("✅ Virtual environment already exists")
    
    return True

def install_dependencies():
    """Install required dependencies"""
    # Determine pip command based on OS
    if os.name == 'nt':  # Windows
        pip_cmd = "venv\\Scripts\\pip"
    else:  # Unix/Linux/Mac
        pip_cmd = "venv/bin/pip"
    
    # Skip pip upgrade on Windows to avoid permission issues
    commands = [
        (f"{pip_cmd} install -r requirements.txt", "Installing dependencies"),
    ]
    
    for command, description in commands:
        if not run_command(command, description):
            return False
    
    return True

def test_installation():
    """Test if the installation works"""
    print("Testing installation...")
    
    # Determine python command based on OS
    if os.name == 'nt':  # Windows
        python_cmd = "venv\\Scripts\\python"
    else:  # Unix/Linux/Mac
        python_cmd = "venv/bin/python"
    
    test_script = '''
import sys
try:
    from faster_whisper import WhisperModel
    from fastapi import FastAPI
    print("All imports successful")
    print("Installation test passed")
    sys.exit(0)
except ImportError as e:
    print(f"Import error: {e}")
    sys.exit(1)
'''
    
    try:
        result = subprocess.run(
            [python_cmd, "-c", test_script],
            capture_output=True,
            text=True,
            check=True
        )
        print(result.stdout)
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Installation test failed:")
        print(e.stdout)
        print(e.stderr)
        return False

def create_start_script():
    """Create platform-specific start scripts"""
    
    # Windows batch script
    windows_script = '''@echo off
echo Starting Faster-Whisper Service...
echo.

REM Check if virtual environment exists
if not exist "venv" (
    echo ERROR: Virtual environment not found. Run setup.py first.
    pause
    exit /b 1
)

REM Activate virtual environment and start service
echo Starting service on http://localhost:8000
echo Press Ctrl+C to stop
echo.

venv\\Scripts\\python main.py
'''
    
    # Unix/Linux shell script
    unix_script = '''#!/bin/bash
echo "Starting Faster-Whisper Service..."
echo

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "ERROR: Virtual environment not found. Run setup.py first."
    exit 1
fi

# Activate virtual environment and start service
echo "Starting service on http://localhost:8000"
echo "Press Ctrl+C to stop"
echo

source venv/bin/activate
python main.py
'''
    
    # Write scripts
    with open("start-whisper.bat", "w") as f:
        f.write(windows_script)
    
    with open("start-whisper.sh", "w") as f:
        f.write(unix_script)
    
    # Make shell script executable on Unix systems
    if os.name != 'nt':
        os.chmod("start-whisper.sh", 0o755)
    
    print("✅ Start scripts created:")
    print("   - Windows: start-whisper.bat")
    print("   - Unix/Linux: start-whisper.sh")

def main():
    """Main setup function"""
    print("🎤 Faster-Whisper Service Setup")
    print("=" * 40)
    
    # Check Python version
    if not check_python_version():
        return False
    
    # Setup virtual environment
    if not setup_virtual_environment():
        return False
    
    # Install dependencies
    if not install_dependencies():
        return False
    
    # Test installation
    if not test_installation():
        return False
    
    # Create start scripts
    create_start_script()
    
    print("\n🎉 Setup completed successfully!")
    print("\nNext steps:")
    print("1. Start the service:")
    if os.name == 'nt':
        print("   start-whisper.bat")
    else:
        print("   ./start-whisper.sh")
    print("2. Test the service: http://localhost:8000/health")
    print("3. Update your main application to use the new service")
    
    print("\nEnvironment variables (optional):")
    print("- WHISPER_MODEL_SIZE: tiny, base, small, medium, large-v2, large-v3 (default: small)")
    print("- WHISPER_DEVICE: cpu, cuda (default: cpu)")
    print("- WHISPER_PORT: port number (default: 8000)")
    
    return True

if __name__ == "__main__":
    success = main()
    if not success:
        print("\n❌ Setup failed. Please check the errors above.")
        sys.exit(1)
    else:
        print("\n✅ Setup completed successfully!")
        sys.exit(0)