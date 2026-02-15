import cv2
import sys
import numpy as np

# -------------------------------
# Argument check
# -------------------------------
if len(sys.argv) < 2:
    print("SAFE")
    sys.exit()

video_path = sys.argv[1]
cap = cv2.VideoCapture(video_path)

if not cap.isOpened():
    print("SAFE")
    sys.exit()

# -------------------------------
# Load face detector
# -------------------------------
face_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
)

prev_gray = None
unsafe_motion_frames = 0      # from OLD code (basic aggression)
fight_frames = 0              # from NEW code (strict violence)
kiss_frames = 0               # intimacy detection
total_frames = 0

# -------------------------------
# Frame processing
# -------------------------------
while True:
    ret, frame = cap.read()
    if not ret:
        break

    total_frames += 1
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    # =====================================================
    # 1️⃣ BASIC AGGRESSION (OLD LOGIC – very light weight)
    # =====================================================
    if prev_gray is not None:
        diff = cv2.absdiff(prev_gray, gray)
        motion_score = np.sum(diff)

        # very high sudden movement only
        if motion_score > 9_000_000:
            unsafe_motion_frames += 1

    # =====================================================
    # 2️⃣ STRICT FIGHT DETECTION (NEW LOGIC)
    # =====================================================
    if prev_gray is not None:
        diff = cv2.absdiff(prev_gray, gray)
        blur = cv2.GaussianBlur(diff, (7, 7), 0)
        _, thresh = cv2.threshold(blur, 45, 255, cv2.THRESH_BINARY)
        motion_pixels = cv2.countNonZero(thresh)

        # ONLY extremely strong motion
        if motion_pixels > 250000:
            fight_frames += 1

    prev_gray = gray

    # =====================================================
    # 3️⃣ KISSING / INTIMACY DETECTION (STRICT)
    # =====================================================
    faces = face_cascade.detectMultiScale(gray, 1.3, 6)

    if len(faces) >= 2:
        (x1, y1, w1, h1) = faces[0]
        (x2, y2, w2, h2) = faces[1]

        face_distance = abs(x1 - x2)

        # VERY VERY close faces only
        if face_distance < 45:
            kiss_frames += 1

    # Early exit if clearly unsafe
    if kiss_frames > 12 or fight_frames > 25:
        break

cap.release()

# -------------------------------
# FINAL DECISION (VERY STRICT)
# -------------------------------
if total_frames == 0:
    print("SAFE")

# kissing / intimacy
elif kiss_frames > 10:
    print("UNSAFE")

# sustained violent motion
elif fight_frames > total_frames * 0.18:
    print("UNSAFE")

# fallback aggression (rare case)
elif unsafe_motion_frames > total_frames * 0.25:
    print("UNSAFE")

else:
    print("SAFE")
