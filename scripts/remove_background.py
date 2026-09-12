#!/usr/bin/env python3
"""Local background removal for Gina Image Create Studio.

Uses rembg when installed for high-quality general segmentation. If rembg is not
available, falls back to OpenCV GrabCut so the feature remains completely local.
The result is always a real RGBA PNG with transparent background pixels.
"""
import sys
from pathlib import Path

from PIL import Image, ImageFilter


def remove_with_rembg(src: Path, dst: Path) -> bool:
    try:
        from rembg import remove  # type: ignore
    except Exception:
        return False
    data = src.read_bytes()
    result = remove(data)
    dst.write_bytes(result)
    return True


def remove_with_grabcut(src: Path, dst: Path) -> None:
    import cv2
    import numpy as np

    image = cv2.imread(str(src), cv2.IMREAD_COLOR)
    if image is None:
        raise RuntimeError("OpenCV could not decode the image")
    h, w = image.shape[:2]
    if h < 4 or w < 4:
        raise RuntimeError("Image is too small for background segmentation")

    # Leave a small border as definite background and let GrabCut classify the
    # interior. This is a local, model-free fallback; rembg is preferred.
    # Segment on a bounded working size for predictable local performance, then
    # resize the alpha matte back to the original resolution.
    scale = min(1.0, 1400.0 / max(w, h))
    work = image if scale == 1.0 else cv2.resize(image, (max(2, int(w * scale)), max(2, int(h * scale))), interpolation=cv2.INTER_AREA)
    wh, ww = work.shape[:2]
    margin_x = max(2, int(ww * 0.02))
    margin_y = max(2, int(wh * 0.02))
    rect = (margin_x, margin_y, max(2, ww - 2 * margin_x), max(2, wh - 2 * margin_y))
    mask = np.full((wh, ww), cv2.GC_BGD, np.uint8)
    bgd = np.zeros((1, 65), np.float64)
    fgd = np.zeros((1, 65), np.float64)
    cv2.grabCut(work, mask, rect, bgd, fgd, 3, cv2.GC_INIT_WITH_RECT)
    alpha_small = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    alpha = alpha_small if scale == 1.0 else cv2.resize(alpha_small, (w, h), interpolation=cv2.INTER_LINEAR)

    # Feather the segmentation edge slightly to avoid a harsh matte fringe.
    alpha = cv2.GaussianBlur(alpha, (0, 0), sigmaX=max(0.6, min(w, h) / 1200.0))
    rgba = cv2.cvtColor(image, cv2.COLOR_BGR2BGRA)
    rgba[:, :, 3] = alpha
    cv2.imwrite(str(dst), rgba)


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: remove_background.py INPUT OUTPUT", file=sys.stderr)
        return 2
    src, dst = Path(sys.argv[1]), Path(sys.argv[2])
    dst.parent.mkdir(parents=True, exist_ok=True)
    if remove_with_rembg(src, dst):
        print("rembg")
        return 0
    remove_with_grabcut(src, dst)
    print("opencv-grabcut")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
