# © 2026 Kurtis Alexander. MIT License.
# KUR-333: prepares a phone photo of sheet music before homr reads it. Our own code, using OpenCV (Apache-2.0) and NumPy (BSD); nothing
# from homr. homr dewarps each staff itself, so this only does the cheap global steps:
#   1. upright: the photo's EXIF orientation (OpenCV applies it when it reads the file);
#   2. the page: if the sheet's four corners stand out from the table, the perspective is undone so the page is a flat rectangle;
#   3. skew: the staff lines' median angle is measured; a page turned more than 6 degrees is turned level (homr copes with less, and an
#      extra rotation of a slightly skewed photo read worse in our tests); a sideways photo with no EXIF orientation is turned a quarter
#      turn clockwise (a guess: the reply says so, since it may then be upside down);
#   4. size: the long edge is scaled down to at most 3000 pixels.
# Prints one JSON line: what it did. Run with uv:  uv run --no-project --with opencv-python-headless==5.1.0.95 --with numpy==2.5.5 python omr-prep.py in.jpg out.jpg
import sys, json, math
import numpy as np, cv2

MAX_EDGE = 3000

def order(pts):
    s, d = pts.sum(1), np.diff(pts, axis=1).ravel()
    return np.float32([pts[np.argmin(s)], pts[np.argmin(d)], pts[np.argmax(s)], pts[np.argmax(d)]])

def find_page(gray):
    """The sheet's corners when it is clearly brighter than what is around it and fills a good part of the photo, else None."""
    h, w = gray.shape; k = 1000 / max(h, w); small = cv2.resize(gray, (int(w * k), int(h * k)))
    blur = cv2.GaussianBlur(small, (5, 5), 0)
    _, th = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    th = cv2.morphologyEx(th, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8))
    cs, _ = cv2.findContours(th, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not cs: return None
    c = max(cs, key=cv2.contourArea); area = cv2.contourArea(c)
    if area < 0.25 * small.shape[0] * small.shape[1] or area > 0.985 * small.shape[0] * small.shape[1]: return None   # no clear page edge (a scan, or a close-up)
    q = cv2.approxPolyDP(c, 0.02 * cv2.arcLength(c, True), True)
    if len(q) != 4: return None
    return order(q.reshape(4, 2).astype(np.float32) / k)

def unwarp(img, quad):
    (tl, tr, br, bl) = quad
    W = int(max(np.linalg.norm(tr - tl), np.linalg.norm(br - bl))); H = int(max(np.linalg.norm(bl - tl), np.linalg.norm(br - tr)))
    M = cv2.getPerspectiveTransform(quad, np.float32([[0, 0], [W, 0], [W, H], [0, H]]))
    return cv2.warpPerspective(img, M, (W, H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)

def skew_angle(gray):
    """The median angle of long, nearly level lines (staff lines), in degrees, and whether most long lines run up and down (a sideways
    photo); (None, False) when there are too few to tell."""
    h, w = gray.shape; k = 1600 / max(h, w); small = cv2.resize(gray, (int(w * k), int(h * k))) if k < 1 else gray
    bw = cv2.adaptiveThreshold(small, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY_INV, 25, 15)
    lines = cv2.HoughLinesP(bw, 1, np.pi / 720, threshold=120, minLineLength=small.shape[1] // 6, maxLineGap=8)
    if lines is None: return None, False
    allA = [math.degrees(math.atan2(y2 - y1, x2 - x1)) for x1, y1, x2, y2 in lines.reshape(-1, 4)]
    a = [x for x in allA if abs(x) <= 30]; v = [x for x in allA if 60 <= abs(x) <= 120]
    return (float(np.median(a)) if len(a) >= 8 else None), len(v) > 2 * max(1, len(a))

def rotate(img, deg):
    h, w = img.shape[:2]; M = cv2.getRotationMatrix2D((w / 2, h / 2), deg, 1.0)
    c, s = abs(M[0, 0]), abs(M[0, 1]); W, H = int(h * s + w * c), int(h * c + w * s)
    M[0, 2] += W / 2 - w / 2; M[1, 2] += H / 2 - h / 2
    return cv2.warpAffine(img, M, (W, H), flags=cv2.INTER_CUBIC, borderValue=(255, 255, 255))

def main(src, dst):
    img = cv2.imread(src, cv2.IMREAD_COLOR)   # applies the EXIF orientation
    if img is None: print(json.dumps({"ok": False, "problem": "not an image OpenCV can read"})); return 1
    did = {"ok": True, "in": [img.shape[1], img.shape[0]]}
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    q = find_page(gray)
    if q is not None: img = unwarp(img, q); did["page"] = [[round(float(x)), round(float(y))] for x, y in q]; gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    a, sideways = skew_angle(gray)
    if sideways: img = cv2.rotate(img, cv2.ROTATE_90_CLOCKWISE); did["turned"] = 90; gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY); a, _ = skew_angle(gray)
    if a is not None: did["skew"] = round(a, 2)
    if a is not None and abs(a) > 6: img = rotate(img, a); did["deskew"] = round(a, 2)
    h, w = img.shape[:2]; k = min(1.0, MAX_EDGE / max(h, w))
    if k < 1: img = cv2.resize(img, (int(w * k), int(h * k)), interpolation=cv2.INTER_AREA); did["scaled"] = round(k, 3)
    did["out"] = [img.shape[1], img.shape[0]]
    cv2.imwrite(dst, img, [cv2.IMWRITE_JPEG_QUALITY, 92]); print(json.dumps(did)); return 0

if __name__ == "__main__":
    sys.exit(main(sys.argv[1], sys.argv[2]))
