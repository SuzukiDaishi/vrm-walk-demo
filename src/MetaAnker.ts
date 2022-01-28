import * as THREE from 'three'
import { VRM } from '@pixiv/three-vrm'

export class MetaAnker extends THREE.Mesh {

  url: string

  constructor(url: string) {
    const geometry = new THREE.CylinderGeometry(1.2, 1.2, 2, 50)
    const material = new THREE.MeshNormalMaterial()
    super(geometry, material)
    this.rotation.set(Math.PI/2, 0, 0)
    this.url = url
  }

  isContains(vrm: VRM) {
    const dist = Math.sqrt( 
      Math.pow(vrm.scene.position.x - this.position.x, 2)
      + Math.pow(vrm.scene.position.z - this.position.z, 2)
    )
    if ( dist < 1 ) {
      return true
    } else {
      return false
    }
  }

  transitionUpdate(vrm: VRM, shutdownAction: () => void = () => {}) {
    if ( this.isContains(vrm) ) {
      shutdownAction()
      window.location.href = this.url
    }
  }

}