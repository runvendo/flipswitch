#!/usr/bin/env python3
"""Generate flipswitch by Vendo README banners using actual Vendo logos."""

from PIL import Image, ImageDraw, ImageFont

ASSETS = "/Users/yousefh/Desktop/Cool Code/flipswitch/assets"
BG_COLOR = "#F5EDEB"
CHARCOAL = "#1C1917"
BROWN = "#6B4F10"

MONO_FONT = "/System/Library/Fonts/SFNSMono.ttf"
REGULAR_FONT = "/System/Library/Fonts/HelveticaNeue.ttc"
BOLD_FONT = "/System/Library/Fonts/SFNS.ttf"


def generate_option_a(path):
    """Option A: Centered — big 'flipswitch' up top, 'by' + vendo logo below."""
    W, H = 1200, 320
    img = Image.new("RGBA", (W, H), BG_COLOR)
    draw = ImageDraw.Draw(img)

    # "flipswitch" in big monospace
    title_font = ImageFont.truetype(MONO_FONT, 72)
    bbox = title_font.getbbox("flipswitch")
    tw = bbox[2] - bbox[0]
    title_x = (W - tw) // 2
    title_y = 60
    draw.text((title_x, title_y), "flipswitch", fill=CHARCOAL, font=title_font)

    # "by" text
    by_font = ImageFont.truetype(REGULAR_FONT, 22)
    by_bbox = by_font.getbbox("by")
    by_w = by_bbox[2] - by_bbox[0]

    # Load vendo logo (the full one with wordmark)
    logo = Image.open(f"{ASSETS}/vendo-logo-big.png").convert("RGBA")
    logo_h = 48
    logo_w = int(logo.width * (logo_h / logo.height))
    logo = logo.resize((logo_w, logo_h), Image.LANCZOS)

    # Center "by [logo]" together
    gap = 10
    total_w = by_w + gap + logo_w
    start_x = (W - total_w) // 2
    by_y = title_y + 100
    draw.text((start_x, by_y + 12), "by", fill=BROWN, font=by_font)
    img.paste(logo, (start_x + by_w + gap, by_y), logo)

    img.save(path, "PNG")
    print(f"Saved: {path}")


def generate_option_b(path):
    """Option B: Centered — big 'flipswitch', then 'by' + just the vendo icon + 'vendo' text."""
    W, H = 1200, 320
    img = Image.new("RGBA", (W, H), BG_COLOR)
    draw = ImageDraw.Draw(img)

    # "flipswitch" in big monospace
    title_font = ImageFont.truetype(MONO_FONT, 80)
    bbox = title_font.getbbox("flipswitch")
    tw = bbox[2] - bbox[0]
    title_x = (W - tw) // 2
    title_y = 50
    draw.text((title_x, title_y), "flipswitch", fill=CHARCOAL, font=title_font)

    # Load vendo icon (small, just the bookshelf)
    icon = Image.open(f"{ASSETS}/vendo-logo-small.png").convert("RGBA")
    icon_h = 40
    icon_w = int(icon.width * (icon_h / icon.height))
    icon = icon.resize((icon_w, icon_h), Image.LANCZOS)

    # "by" text + icon + "vendo" text
    by_font = ImageFont.truetype(REGULAR_FONT, 20)
    vendo_font = ImageFont.truetype(BOLD_FONT, 22)

    by_bbox = by_font.getbbox("by")
    by_w = by_bbox[2] - by_bbox[0]
    vendo_bbox = vendo_font.getbbox("vendo")
    vendo_w = vendo_bbox[2] - vendo_bbox[0]

    gap = 8
    total_w = by_w + gap + icon_w + gap + vendo_w
    start_x = (W - total_w) // 2
    row_y = title_y + 115

    draw.text((start_x, row_y + 10), "by", fill=BROWN, font=by_font)
    img.paste(icon, (start_x + by_w + gap, row_y), icon)
    draw.text((start_x + by_w + gap + icon_w + gap, row_y + 10), "vendo", fill=BROWN, font=vendo_font)

    # Subtle thin line above and below
    line_color = "#E0D6D1"
    line_margin = 200
    draw.line([(line_margin, 38), (W - line_margin, 38)], fill=line_color, width=1)
    draw.line([(line_margin, H - 38), (W - line_margin, H - 38)], fill=line_color, width=1)

    img.save(path, "PNG")
    print(f"Saved: {path}")


if __name__ == "__main__":
    generate_option_a(f"{ASSETS}/banner-option-a.png")
    generate_option_b(f"{ASSETS}/banner-option-b.png")
    print("Done!")
