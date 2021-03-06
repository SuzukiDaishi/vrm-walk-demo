import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader'
import { VRM } from '@pixiv/three-vrm'
import { mixamoClipToVRMClip } from './VRMAnimationClip'
import { VRMController } from './VRMController'
import { MetaAnker } from './MetaAnker'

if ( (new URL(window.location.href)).searchParams.get('messaging') ) {

  const permission = ['']

  let warpElm = document.createElement('div')
  warpElm.style.background = 'url(./assets/warp.gif) center / cover'
  warpElm.style.position = 'absolute'
  warpElm.style.left = '0px'
  warpElm.style.top = '0px'
  warpElm.style.width = '100vw'
  warpElm.style.height = '100vh'
  document.body.appendChild(warpElm)

  window.addEventListener('message', (event) => {
    console.log(event)
  })

} else {

  let vrm: VRM
  let mixer: THREE.AnimationMixer
  let clock = new THREE.Clock();
  let walk: THREE.AnimationAction
  let controller: VRMController
  let ankerMesh: MetaAnker

  window.addEventListener('DOMContentLoaded', async () => {

    // レンダラーを作成
    const renderer = new THREE.WebGLRenderer()
    
    // レンダラーのサイズを設定
    renderer.setSize(window.innerWidth, window.innerHeight)
    
    // canvasをbodyに追加
    document.body.appendChild(renderer.domElement)

    // シーンを作成
    const scene = new THREE.Scene()

    // カメラを作成
    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth/window.innerHeight,
      0.1,
      1000
    )
    const cameraContainer = new THREE.Object3D()
    cameraContainer.add(camera)
    cameraContainer.position.set(0,1,5)
    scene.add(cameraContainer)

    // ライト
    const light = new THREE.DirectionalLight(0xffffff)
    light.position.set(1,1,1).normalize()
    scene.add(light)
    
    ankerMesh = new MetaAnker('https://suzukidaishi.github.io/vrm-walk-demo/index.html?messaging=true')
    ankerMesh.position.set(0, 1, -5)
    scene.add(ankerMesh)

    // アバター読み込み
    const gltfLoader = new GLTFLoader()
    const gltf = await gltfLoader.loadAsync('./assets/model.vrm')
    vrm = await VRM.from(gltf)
    vrm.scene.position.set(0, 0, 5)
    scene.add(vrm.scene)

    const res = await fetch('./assets/idol.json')
    vrm.humanoid!.setPose(await res.json())

    // アニメーション読み込み
    mixer = new THREE.AnimationMixer(vrm.scene)

    const fbxLoader = new FBXLoader()
    const walkFbx = await fbxLoader.loadAsync('./assets/walking.fbx')
    const walkClip = mixamoClipToVRMClip(walkFbx.animations[0], vrm, false)
    walkClip.name = 'walk'
    walk = mixer.clipAction(walkClip).setEffectiveWeight(1.0)
    walk.clampWhenFinished = true

    controller = new VRMController(vrm, walk)

    // グリッドの表示
    const gridHelper = new THREE.GridHelper(10, 10);
    scene.add( gridHelper )

    let lastTime = new Date().getTime()
    const tick = (): void => {
      requestAnimationFrame(tick)

      controller.forwardUpdate()
      controller.turnUpdate()

      ankerMesh.transitionUpdate(vrm, () => {
      })

      cameraContainer.position.set(
        vrm.scene.position.x,
        vrm.scene.position.y + 1,
        vrm.scene.position.z + 5,
      )
    
      let time = new Date().getTime()
      if (mixer) mixer.update(time - lastTime)
      lastTime = time
      renderer.setAnimationLoop(() => {
        renderer.render(scene, camera)
      })
      if(mixer){
        mixer.update(clock.getDelta())
      }
    }
    tick()

    console.log('Hello Three.js')
  })

  window.addEventListener('keyup', (e) => {
    switch (e.code) {
      case 'ArrowUp':
      case 'KeyW':
        controller.forwardEnd()
        break
      case 'ArrowLeft':
      case 'KeyA':
      case 'ArrowRight':
      case 'KeyD':
        controller.turnEnd()
        break
    }
  })

  window.addEventListener('keydown', (e) => {
    switch (e.code) {
      case 'ArrowUp':
      case 'KeyW':
        controller.forwardBegin()
        break
      case 'ArrowLeft':
      case 'KeyA':
        controller.turnBegin('left')
        break
      case 'ArrowRight':
      case 'KeyD':
        controller.turnBegin('right')
        break
    }
  })
}