import { useEffect } from 'react';
import './App.css';
import { Canvas, useFrame, useGraph } from '@react-three/fiber';
import { Color, Euler, Matrix4, SkinnedMesh } from 'three'
import { useGLTF } from '@react-three/drei';
import { FilesetResolver, FaceLandmarker, FaceLandmarkerOptions, Category } from '@mediapipe/tasks-vision';

let video: HTMLVideoElement;
let faceLandmarker: FaceLandmarker;
let lastVideoTime = -1;
let headMesh: SkinnedMesh;
let rotation: Euler;
let blendshapes: Category[] = [];

function App() {

  const handleOnChange = () => {

  }

  const options: FaceLandmarkerOptions = {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
      delegate: "GPU"
    },
    numFaces: 1,
    runningMode: "VIDEO",
    outputFaceBlendshapes: true,
    outputFacialTransformationMatrixes: true,
  };

  const setup = async () => {
    const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm");
    faceLandmarker = await FaceLandmarker.createFromOptions(vision, options);

    video = document.getElementById("video") as HTMLVideoElement;
    navigator.mediaDevices.getUserMedia({
      video: { width: 1280, height: 720 },
      audio: false
    }).then((stream) => {
      video.srcObject = stream
      video.addEventListener('loadeddata', predict);
    })
  }

  const predict = () => {
    let nowInMs = Date.now();
    if (lastVideoTime !== video.currentTime) {
      lastVideoTime = video.currentTime;
      const result = faceLandmarker.detectForVideo(video, nowInMs)

      if (result.facialTransformationMatrixes && result.facialTransformationMatrixes.length > 0 && result.faceBlendshapes[0].categories) {
        blendshapes = result.faceBlendshapes[0].categories
        const matrix = new Matrix4().fromArray(result.facialTransformationMatrixes![0].data)
        rotation = new Euler().setFromRotationMatrix(matrix);
      }

    }

    requestAnimationFrame(predict)
  }

  useEffect(() => {
    setup();
  }, [])

  return (
    <div className="App">
      <input type="text" placeholder='Enter your RPM avatar URL' onChange={handleOnChange} />
      <video autoPlay id='video' />
      <Canvas style={{
        backgroundColor: 'purple',
        height: 400,
      }}
        camera={{
          fov: 25
        }}
        shadows
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[1, 1, 1]} color={new Color(1, 1, 0)} intensity={0.5} />
        <pointLight position={[-1, 0, 1]} color={new Color(1, 0, 0)} intensity={0.5} />
        <Avatar />
      </Canvas>
    </div>
  );
}

function Avatar() {
  const avatar = useGLTF('https://models.readyplayer.me/65d4019a39b888fbc8cb3866.glb?morphTargets=ARKit&textureAtlas=1024')
  const { nodes } = useGraph(avatar.scene)

  console.log(nodes);

  useEffect(() => {
    headMesh = nodes.Wolf3D_Avatar as SkinnedMesh
  }, [nodes])

  useFrame((_, delta) => {
    if (headMesh !== null) {
      blendshapes.forEach((blendshape) => {
        let index = headMesh.morphTargetDictionary![blendshape.categoryName]
        if (index >= 0) {
          headMesh.morphTargetInfluences![index] = blendshape.score;
        }
      })

    }

    if (blendshapes.length > 0) {

      nodes.Head.rotation.set(rotation?.x, rotation.y, rotation.z);
      nodes.Neck.rotation.set(rotation?.x / 5 + 0.3, rotation.y / 5, rotation.z / 5);
      nodes.Spine2.rotation.set(rotation?.x / 10, rotation.y / 10, rotation.z / 10);
    }
  })


  return <primitive object={avatar.scene} position={[0, -1.75, 3]} />
}

export default App;
