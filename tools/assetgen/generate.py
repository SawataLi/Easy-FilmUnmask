from pathlib import Path
from PIL import Image, ImageDraw, ImageCms

def main() -> None:
    root = Path(__file__).resolve().parents[2]
    icons = root / 'src/src-tauri/icons'
    icons.mkdir(parents=True, exist_ok=True)
    icon = Image.new('RGBA', (256, 256), (0, 0, 0, 0))
    draw = ImageDraw.Draw(icon)
    draw.rounded_rectangle((8, 8, 248, 248), 58, fill='#222426')
    draw.rounded_rectangle((58, 47, 198, 209), 20, fill='#cfaa78')
    draw.rounded_rectangle((79, 69, 177, 187), 9, fill='#303234')
    for y in (64, 99, 134, 169):
        for x in (63, 183):
            draw.rounded_rectangle((x, y, x + 9, y + 17), 3, fill='#222426')
    draw.ellipse((106, 106, 150, 150), fill='#cfaa78')
    icon.save(icons / 'icon.ico', sizes=[(16,16),(32,32),(48,48),(64,64),(128,128),(256,256)])
    icon.save(icons / 'icon.png')
    profile = ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB'))
    (icons / 'srgb.icc').write_bytes(profile.tobytes())

if __name__ == '__main__':
    main()
