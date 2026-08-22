#!/usr/bin/env python3
"""Tier-2 · Station 1: video -> landmarks.json (Doc 06 §4, async clip analysis).

Runs MediaPipe Pose at maximum quality (model_complexity=2, no real-time
constraint) over every frame of a recorded clip. Extraction only — all
scoring happens in tools/analyze-report.mjs so Tier-1 and Tier-2 share one
scoring engine.

Usage:
  python3 analyze-clip.py <video> <out.json> [--every N]

Runs inside the Motion Factory venv (tools/setup-factory.sh) or any env with
mediapipe + opencv installed.
"""
import json
import sys
import time


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if len(args) != 2:
        print(__doc__)
        return 1
    every = 1
    if "--every" in sys.argv:
        every = max(1, int(sys.argv[sys.argv.index("--every") + 1]))

    video_path, out_path = args

    import cv2  # noqa: deferred so --help works without the venv
    import mediapipe as mp

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"cannot open {video_path}")
        return 1
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)

    pose = mp.solutions.pose.Pose(
        static_image_mode=False,
        model_complexity=2,          # the heavy path — this tier has time
        enable_segmentation=False,
        min_detection_confidence=0.4,
        min_tracking_confidence=0.4,
    )

    frames = []
    detected = 0
    t0 = time.time()
    idx = 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        if idx % every:
            idx += 1
            continue
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        res = pose.process(rgb)
        if res.pose_landmarks:
            detected += 1
            lm = [
                {
                    "x": round(p.x, 4),
                    "y": round(p.y, 4),
                    "z": round(p.z, 4),
                    "visibility": round(p.visibility, 3),
                }
                for p in res.pose_landmarks.landmark
            ]
        else:
            lm = None
        frames.append(lm)
        idx += 1
        if idx % 60 == 0 and total:
            print(f"\r{idx}/{total} frames ({detected} detected)", end="", flush=True)

    cap.release()
    pose.close()

    out = {
        "version": 1,
        "source": video_path.split("/")[-1],
        "fps": fps / every,
        "model": "mediapipe_pose_heavy(mc=2)",
        "nFrames": len(frames),
        "detected": detected,
        "frames": frames,
    }
    with open(out_path, "w") as f:
        json.dump(out, f)
    dt = time.time() - t0
    rate = f"{detected}/{len(frames)}" if frames else "0/0"
    print(f"\nwrote {out_path}: {rate} frames with a body, {fps / every:.1f} fps, {dt:.1f}s")
    return 0


if __name__ == "__main__":
    sys.exit(main())
