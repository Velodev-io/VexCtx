import os
import shutil
import PyInstaller.__main__

def build():
    print("Building Standalone Daemon via PyInstaller...")
    
    # Project root directory
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    os.chdir(project_root)
    
    # PyInstaller execution options
    opts = [
        "vexctx/main.py",
        "--name=vexctx-daemon",
        "--onefile",
        "--clean",
        "--collect-all=fastapi",
        "--collect-all=uvicorn",
        "--collect-all=qdrant_client",
        "--collect-all=sqlcipher3",
        "--collect-all=pydantic_settings",
        "--collect-all=watchfiles",
        "--collect-all=redis",
        "--hidden-import=uvicorn.logging",
        "--hidden-import=uvicorn.loops",
        "--hidden-import=uvicorn.loops.auto",
        "--hidden-import=uvicorn.protocols",
        "--hidden-import=uvicorn.protocols.http",
        "--hidden-import=uvicorn.protocols.http.auto",
        "--hidden-import=uvicorn.protocols.websockets",
        "--hidden-import=uvicorn.protocols.websockets.auto",
        "--hidden-import=uvicorn.lifespan",
        "--hidden-import=uvicorn.lifespan.on",
        "--hidden-import=aiosqlite",
        "--hidden-import=jwt",
    ]
    
    PyInstaller.__main__.run(opts)
    print("Daemon build complete!")

if __name__ == "__main__":
    build()
