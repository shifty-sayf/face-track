import { useEffect } from 'react';
import './App.css';
import { FilesetResolver, FaceDetectorOptions, FaceDetector, Detection } from '@mediapipe/tasks-vision';

let video: HTMLVideoElement;
let faceDetector: FaceDetector;
let children: any[] = [];
let lastVideoTime = -1;
const liveView = document.getElementById("liveView");
video = document.getElementById("video") as HTMLVideoElement;

function App() {

  const options: FaceDetectorOptions = {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite`,
      delegate: "GPU"
    },
    runningMode: "VIDEO"
  };

  const setup = async () => {
    const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm");
    faceDetector = await FaceDetector.createFromOptions(
      vision,
      options
    )

    navigator.mediaDevices.getUserMedia({
      video: { width: 1280, height: 720 },
      audio: false
    }).then((stream) => {
      console.log(stream.getTracks()[0])
      if (stream) video.srcObject = new MediaStream([stream.getTracks()[0]])
      video.addEventListener('loadeddata', predict);
    }).catch((err) => {
      console.error(err);
    })
  }

  const predict = async () => {
    let nowInMs = Date.now();
    if (lastVideoTime !== video.currentTime) {
      lastVideoTime = video.currentTime;
      const detections = faceDetector.detectForVideo(video, nowInMs).detections;

      displayVideoDetections(detections);
    }

    requestAnimationFrame(predict)
  }

  useEffect(() => {
    setup();
  }, [])

  return (
    <div className="App">
      <div id='liveView' className='videoView'>
        <video autoPlay playsInline id='video' />
      </div>
    </div>
  );
}

function displayVideoDetections(detections: Detection[]) {
  // Remove any highlighting from previous frame.

  if (liveView !== null) {
    for (let child of children) {
      liveView.removeChild(child);
    }
    children.splice(0);
  }

  // Iterate through predictions and draw them to the live view
  for (let detection of detections) {
    const p = document.createElement("p");

    const highlighter = document.createElement("div");
    highlighter.setAttribute("class", "highlighter");

    if (detection.boundingBox) {
      highlighter.style.left = `${video.offsetWidth -
        detection.boundingBox.width -
        detection.boundingBox.originX}px`
      highlighter.style.top = `${detection.boundingBox.originY}px`
      highlighter.style.width = `${detection.boundingBox.width - 10}px`
      highlighter.style.height = `${detection.boundingBox.height}px`
    }

    if (liveView !== null) {
      liveView.appendChild(highlighter);
      liveView.appendChild(p);
    }

    // Store drawn objects in memory so they are queued to delete at next call
    children.push(highlighter);
    children.push(p);
    for (let keypoint of detection.keypoints) {
      const keypointEl = document.createElement("spam");
      keypointEl.className = "key-point";
      keypointEl.style.top = `${keypoint.y * video.offsetHeight - 3}px`;
      keypointEl.style.left = `${video.offsetWidth - keypoint.x * video.offsetWidth - 3
        }px`;
      if (liveView !== null) liveView.appendChild(keypointEl);
      children.push(keypointEl);
    }
  }
}

export default App;
