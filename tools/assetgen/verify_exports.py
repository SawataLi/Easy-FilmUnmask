"""Independently inspect the files exported by the real desktop application."""
import json
from pathlib import Path
from PIL import Image

def main() -> None:
    output = Path(__file__).resolve().parents[2] / 'output/verification'
    results = []
    for suffix in ('tiff', 'jpg'):
        path = output / f'desktop-export.{suffix}'
        with Image.open(path) as picture:
            picture.load()
            assert picture.size == (2448, 3248), picture.size
            profile = picture.info.get('icc_profile', b'')
            assert len(profile) > 128 and profile[36:40] == b'acsp'
            bits = tuple(picture.tag_v2.get(258, ())) if suffix == 'tiff' else (8, 8, 8)
            assert bits == ((16, 16, 16) if suffix == 'tiff' else (8, 8, 8))
            results.append({'file': path.name, 'dimensions': picture.size,
                            'bits_per_channel': bits, 'icc_bytes': len(profile),
                            'status': 'passed'})
    (output / 'export-test-results.json').write_text(
        json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(results, ensure_ascii=False))

if __name__ == '__main__':
    main()
