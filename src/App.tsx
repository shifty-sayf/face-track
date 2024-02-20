import { useEffect, useRef } from "react";
import "./App.css";
import {
  FilesetResolver,
  FaceDetectorOptions,
  FaceDetector,
  Detection,
} from "@mediapipe/tasks-vision";

let video: HTMLVideoElement | null = null;
let liveView: HTMLElement | null = null;
let faceDetector: FaceDetector;
let children: any[] = [];
let lastVideoTime = -1;

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const liveViewRef = useRef<HTMLDivElement>(null);

  const options: FaceDetectorOptions = {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite`,
      delegate: "GPU",
    },
    runningMode: "VIDEO",
  };

  useEffect(() => {
    video = videoRef.current;
    liveView = liveViewRef.current;
  }, []);

  const setup = async () => {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
    );
    faceDetector = await FaceDetector.createFromOptions(vision, options);

    navigator.mediaDevices
      .getUserMedia({
        video: { width: 1280, height: 720 },
        audio: false,
      })
      .then((stream) => {
        console.log(stream.getTracks()[0]);
        if (stream && video) {
          video.srcObject = new MediaStream([stream.getTracks()[0]]);
          video.addEventListener("loadeddata", predict);
        }
      })
      .catch((err) => {
        console.error(err);
      });
  };

  const predict = async () => {
    let nowInMs = Date.now();
    if (video && lastVideoTime !== video.currentTime) {
      lastVideoTime = video.currentTime;
      const detections = faceDetector.detectForVideo(video, nowInMs).detections;

      displayVideoDetections(detections);
    }

    requestAnimationFrame(predict);
  };

  useEffect(() => {
    setup();
  }, []);

  return (
    <div className="App">
      <div id="liveView" className="videoView" ref={liveViewRef}>
        <video ref={videoRef} autoPlay playsInline id="video" />
      </div>
    </div>
  );
}

function displayVideoDetections(detections: Detection[]) {
  // Remove any highlighting from previous frame.

  if (liveView !== null) {
    for (let child of children) {
      if (liveView) {
        liveView.removeChild(child);
      }
    }
    children = [];
  }

  // Iterate through predictions and draw them to the live view
  for (let detection of detections) {
    if (detection.boundingBox && video) {
      const highlighter = document.createElement("div");
      highlighter.className = "highlighter";
      highlighter.style.left = `${
        video.offsetWidth -
        detection.boundingBox.width -
        detection.boundingBox.originX
      }px`;
      highlighter.style.top = `${detection.boundingBox.originY}px`;
      highlighter.style.width = `${detection.boundingBox.width}px`;
      highlighter.style.height = `${detection.boundingBox.height}px`;

      console.log("Creating bounding box with dimensions:", {
        left: `${detection.boundingBox.originX}px`,
        top: `${detection.boundingBox.originY}px`,
        width: `${detection.boundingBox.width}px`,
        height: `${detection.boundingBox.height}px`,
      });

      if (liveView) {
        liveView.appendChild(highlighter);
        console.log("Added bounding box to liveView:", highlighter);
      }
      children.push(highlighter);
    }

    if (video) {
      for (let keypoint of detection.keypoints) {
        const keypointEl = document.createElement("span");
        keypointEl.className = "key-point";
        keypointEl.style.top = `${keypoint.y * video.offsetHeight - 3}px`;
        keypointEl.style.left = `${
          video.offsetWidth - keypoint.x * video.offsetWidth - 3
        }px`;
        if (liveView !== null) liveView.appendChild(keypointEl);
        children.push(keypointEl);
      }
    }
  }
}

export default App;
