import * as THREE from 'three'
import { BVH } from 'three/examples/jsm/loaders/BVHLoader'
import { VRM, VRMSchema } from '@pixiv/three-vrm'

const boneNameList: VRMSchema.HumanoidBoneName[] = [
  VRMSchema.HumanoidBoneName.Head,
  VRMSchema.HumanoidBoneName.Neck,
  VRMSchema.HumanoidBoneName.Chest,
  VRMSchema.HumanoidBoneName.Spine,
  VRMSchema.HumanoidBoneName.Hips,
  VRMSchema.HumanoidBoneName.RightShoulder,
  VRMSchema.HumanoidBoneName.RightUpperArm,
  VRMSchema.HumanoidBoneName.RightLowerArm,
  VRMSchema.HumanoidBoneName.RightHand,
  VRMSchema.HumanoidBoneName.LeftShoulder,
  VRMSchema.HumanoidBoneName.LeftUpperArm,
  VRMSchema.HumanoidBoneName.LeftLowerArm,
  VRMSchema.HumanoidBoneName.LeftHand,
  VRMSchema.HumanoidBoneName.RightUpperLeg,
  VRMSchema.HumanoidBoneName.RightLowerLeg,
  VRMSchema.HumanoidBoneName.RightFoot,
  VRMSchema.HumanoidBoneName.LeftUpperLeg,
  VRMSchema.HumanoidBoneName.LeftLowerLeg,
  VRMSchema.HumanoidBoneName.LeftFoot,
]

const BvhWebViewrIdList: string[] = [
  'head',
  'neck',
  'chest',
  'abdomen',
  'hip',
  'rCollar',
  'rShldr',
  'rForeArm',
  'rHand',
  'lCollar',
  'lShldr',
  'lForeArm',
  'lHand',
  'rButtock',
  'rShin',
  'rFoot',
  'lButtock',
  'lShin',
  'lFoot',
]

const TdptIdList = [
  'Head',
  'Neck',
  'Chest',
  'Spine',
  'Hips',
  'RightShoulder',
  'RightUpperArm',
  'RightLowerArm',
  'RightHand',
  'LeftShoulder',
  'LeftUpperArm',
  'LeftLowerArm',
  'LeftHand',
  'RightUpperLeg',
  'RightLowerLeg',
  'RightFoot',
  'LeftUpperLeg',
  'LeftLowerLeg',
  'LeftFoot',
]

function findTrack(name: string, tracks: THREE.KeyframeTrack[]): THREE.KeyframeTrack | null {
  for (let i = 0; i < tracks.length; i++) {
    if (tracks[i].name == name) return tracks[i]
  }
  return null
}

function values2quaternion(values: Float32Array, i: number): THREE.Quaternion {
  return new THREE.Quaternion(
    values[i * 4],
    values[i * 4 + 1],
    values[i * 4 + 2],
    values[i * 4 + 3]
  )
}

function createKeys(id: string, tracks: THREE.KeyframeTrack[], isRootMotion: boolean = true) {
  const posTrack = findTrack(`.bones[${id}].position`, tracks)
  const rotTrack = findTrack(`.bones[${id}].quaternion`, tracks)

  if (!posTrack) return
  if (!rotTrack) return

  const keys = []
  const rate = 0.008
  for (let i = 0; i < posTrack.times.length; i++) {
    const key: {[name: string]: number | [number, number, number] | [number, number, number, number]} = {}

    key['time'] = parseInt(`${posTrack.times[i] * 1000}`);
    
    if (id == 'rButtock' || id == 'lButtock') {
      const id2 = id == 'rButtock' ? 'rThigh' : 'lThigh'
      let q1 = values2quaternion(rotTrack.values, i)
      const rotTrack2 = findTrack(`.bones[${id2}].quaternion`, tracks)
      if (!rotTrack2) return
      q1.multiply(values2quaternion(rotTrack2.values, i))
      key['rot'] = [-q1.x, q1.y, -q1.z, q1.w]
    } else {
      key['rot'] = [
        -rotTrack.values[i * 4],
        rotTrack.values[i * 4 + 1],
        -rotTrack.values[i * 4 + 2],
        rotTrack.values[i * 4 + 3],
      ]
    }

    if ( (id == 'hip' || id == 'Hips') && isRootMotion ) {
      key['pos'] = [
        -posTrack.values[i * 3] * rate,
        posTrack.values[i * 3 + 1] * rate,
        -posTrack.values[i * 3 + 2] * rate,
      ]
    }

    keys.push(key)
  }
  if (keys.length == 0) return null
  return keys
}

export function createClip(vrm: VRM, bvh: BVH, isRootMotion: boolean = true, bvhFormat: BVHFormt = BVHFormt.Tdpt) {

  let idList: string[]

  switch (bvhFormat) {
    case BVHFormt.BvhWebViewr:
      idList = BvhWebViewrIdList
      break
    case BVHFormt.Tdpt:
      idList = TdptIdList
      break
  }
  
  const bones = boneNameList.map((boneName) => {
    return vrm.humanoid!.getBoneNode(boneName)
  })
  .filter((item): item is NonNullable<typeof item> => item != null)
  .map(v => v as THREE.Bone)



  const hierarchy = []
  for (let i = 0; i < idList.length; i++) {
    const keys = createKeys(idList[i], bvh.clip.tracks, isRootMotion)
    if (keys != null) {
      hierarchy.push({ keys: keys })
    }
  }

  console.log(hierarchy);
  

  const clip = THREE.AnimationClip.parseAnimation(
    { hierarchy: hierarchy },
    bones
  )


  clip.tracks.some((track) => {
    track.name = track.name.replace(
      /^\.bones\[([^\]]+)\].(position|quaternion|scale)$/,
      '$1.$2'
    )
  })

  return clip
}

export enum BVHFormt {
  BvhWebViewr,
  Tdpt,
}