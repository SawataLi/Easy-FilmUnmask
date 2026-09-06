"""Collect distributable artifacts, dependency notices and reproducible source."""
from pathlib import Path
import hashlib
import json
import shutil
import tomllib
import zipfile

ROOT = Path(__file__).resolve().parents[2]

def collect_notices() -> None:
    licenses = ROOT / 'licenses'
    licenses.mkdir(exist_ok=True)
    registry = next((ROOT / 'tools/cargo/registry/src').iterdir())
    lock = tomllib.loads((ROOT / 'src/src-tauri/Cargo.lock').read_text('utf-8'))
    for package in lock['package']:
        source = registry / f"{package['name']}-{package['version']}"
        if not source.is_dir():
            continue
        for file in source.iterdir():
            if file.is_file() and file.name.upper().startswith(('LICENSE', 'LICENCE', 'COPYING', 'NOTICE')):
                target = licenses / source.name
                target.mkdir(exist_ok=True)
                shutil.copy2(file, target / file.name)
    for package in ('react', 'react-dom', 'lucide-react', '@tauri-apps/api', '@tauri-apps/plugin-dialog'):
        source = ROOT / 'src/node_modules' / package
        for file in source.glob('*'):
            if file.is_file() and file.name.upper().startswith(('LICENSE', 'LICENCE', 'NOTICE')):
                target = licenses / package.replace('/', '-')
                target.mkdir(exist_ok=True)
                shutil.copy2(file, target / file.name)
    shutil.copytree(registry / 'rawler-0.7.2', ROOT / 'third_party/rawler-0.7.2',
                    dirs_exist_ok=True, ignore=shutil.ignore_patterns('.cargo-ok'))

def archive_source() -> Path:
    target = ROOT / 'output/Film-Base-0.1.0-source.zip'
    selected = ['src', 'input', 'licenses', 'third_party', 'tools/assetgen']
    files = [ROOT / p for p in ('README.md', 'THIRD_PARTY.md', '.gitignore', 'tools/dev.ps1')]
    for folder in selected:
        files.extend(p for p in (ROOT / folder).rglob('*') if p.is_file())
    excluded = {'node_modules', '.venv', '__pycache__', '.vite', 'gen', 'target'}
    with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED, compresslevel=6, strict_timestamps=False) as archive:
        for file in files:
            relative = file.relative_to(ROOT)
            if any(part in excluded for part in relative.parts) or file.suffix in {'.tsbuildinfo', '.log'}:
                continue
            archive.write(file, Path('film-base') / relative)
    return target

def main() -> None:
    output = ROOT / 'output'
    build = output / 'build/release'
    installer = next((build / 'bundle/nsis').glob('*setup.exe'))
    shutil.copy2(build / 'film-unmask.exe', output / 'Film-Base.exe')
    shutil.copy2(installer, output / 'Film-Base-0.1.0-x64-setup.exe')
    collect_notices()
    source = archive_source()
    files = [output / 'Film-Base.exe', output / 'Film-Base-0.1.0-x64-setup.exe', source]
    manifest = [{'file': file.name, 'bytes': file.stat().st_size,
                 'sha256': hashlib.sha256(file.read_bytes()).hexdigest()} for file in files]
    (output / 'SHA256.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
    print(json.dumps(manifest, indent=2))

if __name__ == '__main__':
    main()
