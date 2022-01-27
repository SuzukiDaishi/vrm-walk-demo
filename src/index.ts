import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader'
import { VRM } from '@pixiv/three-vrm'
import { mixamoClipToVRMClip } from './VRMAnimationClip'

import { animate } from 'popmotion'

let vrm: VRM
let mixer: THREE.AnimationMixer
let clock = new THREE.Clock();
let walk: THREE.AnimationAction
let walkFlug: boolean = false

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

  // アバター読み込み
  const gltfLoader = new GLTFLoader()
  const gltf = await gltfLoader.loadAsync('./assets/model.vrm')
  vrm = await VRM.from(gltf)
  scene.add(vrm.scene)
  vrm.scene.rotation.y = Math.PI


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

  // グリッドの表示
  const gridHelper = new THREE.GridHelper(10, 10);
  scene.add( gridHelper )

  let lastTime = new Date().getTime()
  const tick = (): void => {
    requestAnimationFrame(tick)

    let time = new Date().getTime()
    if (mixer) mixer.update(time - lastTime)
    lastTime = time

    renderer.setAnimationLoop(() => {
      renderer.render(scene, camera)
      let speed = 0.025
      if (walkFlug) {
        if ( 0 <= vrm.scene.rotation.y && vrm.scene.rotation.y < Math.PI/2 ) {
          let rate = (vrm.scene.rotation.y - 0) / ( Math.PI/2 )
          let a = rate
          let b = 1 - rate
          vrm.scene.position.x += a * speed
          vrm.scene.position.z -= b * speed
        }
        if ( Math.PI/2 <= vrm.scene.rotation.y && vrm.scene.rotation.y < Math.PI ) {
          let rate = (vrm.scene.rotation.y - Math.PI/2) / ( Math.PI )
          let a = rate
          let b = 1 - rate
          vrm.scene.position.z -= a * speed
          vrm.scene.position.x -= b * speed
        }
        if ( Math.PI <= vrm.scene.rotation.y && vrm.scene.rotation.y < 3*Math.PI/2 ) {
          let rate = (vrm.scene.rotation.y - Math.PI) / ( 3*Math.PI/2 )
          let a = rate
          let b = 1 - rate
          vrm.scene.position.x -= a * speed
          vrm.scene.position.z += b * speed
        }
        if ( 3*Math.PI/2 <= vrm.scene.rotation.y && vrm.scene.rotation.y < 2*Math.PI ) {
          let rate = (vrm.scene.rotation.y - 3*Math.PI/2) / ( 2*Math.PI )
          let a = rate
          let b = 1 - rate
          vrm.scene.position.z += a * speed
          vrm.scene.position.x += b * speed
        }
      } 
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
    case 'ArrowLeft':
    case 'ArrowDown':
    case 'ArrowRight':
    case 'KeyW':
    case 'KeyA':
    case 'KeyS':
    case 'KeyD':
      walk.stop()
      walkFlug = false
      break
  }
})

window.addEventListener('keydown', (e) => {
  switch (e.code) {
    case 'ArrowUp':
    case 'KeyW':
      walk.play()
      walkFlug = true
      if ( vrm.scene.rotation.y >= 270*Math.PI/180 ) 
        vrm.scene.rotation.y -= 2*Math.PI
      animate({
        from: vrm.scene.rotation.y,
        to: 0 * Math.PI / 180,
        onUpdate: latest => vrm.scene.rotation.y = latest
      })
      break
    case 'ArrowLeft':
    case 'KeyA':
      walk.play()
      walkFlug = true
      animate({
        from: vrm.scene.rotation.y,
        to: 90 * Math.PI / 180,
        onUpdate: latest => vrm.scene.rotation.y = latest
      })
      break
    case 'ArrowDown':
    case 'KeyS':
      walk.play()
      walkFlug = true
      animate({
        from: vrm.scene.rotation.y,
        to: 180 * Math.PI / 180,
        onUpdate: latest => vrm.scene.rotation.y = latest
      })
      break
    case 'ArrowRight':
    case 'KeyD':
      walk.play()
      walkFlug = true
      if ( vrm.scene.rotation.y <= 0 ) 
        vrm.scene.rotation.y += 2*Math.PI
      animate({
        from: vrm.scene.rotation.y,
        to: 270 * Math.PI / 180,
        onUpdate: latest => vrm.scene.rotation.y = latest
      })
      break
  }
})