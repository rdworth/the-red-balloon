"""Generates the paper and pencil textures for opening-photoreal.html.

Every texture here is made from scratch with seeded noise, so there is no
outside source and nothing to license. Run it from the repo root:

    python3 -m pip install numpy pillow scipy
    python3 assets/photoreal/make_textures.py

All outputs tile seamlessly: the noise is filtered in frequency space (which
wraps) and every fiber is drawn at its wrapped copies too.
"""
import os
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

OUT = os.path.dirname(os.path.abspath(__file__))


def spectral_noise(n, rng, lo, hi, power):
    """Periodic noise with energy between wavelengths hi..lo pixels, falling off as 1/f^power."""
    fx = np.fft.fftfreq(n)[:, None]
    fy = np.fft.fftfreq(n)[None, :]
    f = np.sqrt(fx * fx + fy * fy)
    f[0, 0] = 1
    amp = f ** -power
    amp[(f < 1 / lo) | (f > 1 / hi)] = 0
    ph = np.fft.fft2(rng.standard_normal((n, n)))
    out = np.real(np.fft.ifft2(ph * amp))
    return out / (out.std() + 1e-9)


def fibers(n, rng, count, length, width=1, curl=0.25):
    """Thin wandering fibers on a wrapped canvas, returned as a float map in -1..1."""
    img = Image.new("F", (n, n), 0)
    d = ImageDraw.Draw(img)
    for _ in range(count):
        x, y = rng.uniform(0, n, 2)
        a = rng.uniform(0, np.pi * 2)
        L = rng.uniform(*length)
        tone = rng.choice([-1.0, 1.0], p=[0.45, 0.55]) * rng.uniform(0.4, 1)
        pts = [(x, y)]
        for _ in range(int(L / 3)):
            a += rng.normal(0, curl)
            x += np.cos(a) * 3
            y += np.sin(a) * 3
            pts.append((x, y))
        for ox in (-n, 0, n):
            for oy in (-n, 0, n):
                d.line([(p[0] + ox, p[1] + oy) for p in pts], fill=float(tone), width=width)
    return ndimage.gaussian_filter(np.asarray(img), 0.6, mode="wrap")


def emboss(h, light=(-1, -1.4), strength=1.0):
    gx = ndimage.sobel(h, 1, mode="wrap")
    gy = ndimage.sobel(h, 0, mode="wrap")
    lx, ly = np.array(light) / np.hypot(*light)
    return -(gx * lx + gy * ly) * strength


def save_gray(arr, name, quality=90):
    Image.fromarray(np.clip(arr * 255, 0, 255).astype(np.uint8), "L").save(os.path.join(OUT, name), quality=quality)


def paper_fiber():
    """Neutral construction-paper surface, multiplied over every colored piece.
    1024 px covers 64 world units (16 px per unit)."""
    n, rng = 1024, np.random.default_rng(11)
    mottle = spectral_noise(n, rng, 600, 60, 1.6)
    cloud = spectral_noise(n, rng, 60, 8, 1.2)
    grain = ndimage.gaussian_filter(rng.standard_normal((n, n)), 1.1, mode="wrap")
    grain /= grain.std()
    fib = fibers(n, rng, 5200, (14, 70)) + 0.6 * fibers(n, rng, 900, (60, 160), curl=0.12)
    height = 0.55 * grain + 1.1 * fib + 0.35 * cloud
    v = 0.945 + 0.028 * mottle + 0.016 * cloud + 0.018 * grain + 0.03 * fib + 0.05 * emboss(height, strength=0.35)
    save_gray(np.clip(v, 0.72, 1.0), "paper-fiber.jpg")


def pencil_tooth():
    """Where wax catches on the paper's peaks: alpha mask for colored pencil.
    512 px covers 32 world units."""
    n, rng = 512, np.random.default_rng(23)
    peaks = ndimage.gaussian_filter(rng.standard_normal((n, n)), (0.9, 1.4), mode="wrap")
    peaks /= peaks.std()
    lumps = spectral_noise(n, rng, 120, 10, 1.0)
    fib = fibers(n, rng, 900, (8, 40))
    v = peaks + 0.45 * lumps + 0.8 * fib
    # soft threshold: about two thirds of the surface takes pigment
    a = 1 / (1 + np.exp(-(v + 0.45) * 2.6))
    rgba = np.zeros((n, n, 4), np.uint8)
    rgba[..., :3] = 255
    rgba[..., 3] = np.clip(a * 255, 0, 255).astype(np.uint8)
    Image.fromarray(rgba, "RGBA").save(os.path.join(OUT, "pencil-tooth.png"), optimize=True)


def kraft_board():
    """Brown kraft card for the craft table around the screen."""
    n, rng = 1024, np.random.default_rng(37)
    mottle = spectral_noise(n, rng, 700, 40, 1.5)
    grain = ndimage.gaussian_filter(rng.standard_normal((n, n)), 0.9, mode="wrap")
    grain /= grain.std()
    fib = fibers(n, rng, 7000, (10, 60)) + 0.7 * fibers(n, rng, 500, (80, 200), width=2, curl=0.1)
    flecks = (ndimage.gaussian_filter(rng.standard_normal((n, n)), 1.4, mode="wrap") > 2.6) * -1.0
    height = grain + 1.3 * fib
    shade = 1 + 0.05 * mottle + 0.025 * grain + 0.06 * fib + 0.12 * ndimage.gaussian_filter(flecks, 0.8, mode="wrap") + 0.06 * emboss(height, strength=0.3)
    base = np.array([196, 165, 116]) / 255
    rgb = np.clip(base[None, None, :] * shade[..., None], 0, 1)
    Image.fromarray((rgb * 255).astype(np.uint8), "RGB").save(os.path.join(OUT, "kraft-board.jpg"), quality=88)


if __name__ == "__main__":
    paper_fiber()
    pencil_tooth()
    kraft_board()
    print("textures written to", OUT)
