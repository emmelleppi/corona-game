import React, { useMemo, useEffect, useRef } from "react";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { useLoader, useResource } from 'react-three-fiber'
import { useConvexPolyhedron } from "use-cannon";
import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry'
import * as THREE from "three";
import { draco } from 'drei'

import { COLLISION_GROUP, useMap } from "./store"
import Sky from "./Sky";

function ConvexPolyBody(props) {
  const { position, geometry, material } = props

  const geo = useMemo(() => {
    const g = new THREE.Geometry().fromBufferGeometry(geometry)
    // Merge duplicate vertices resulting from glTF export.
    // Cannon assumes contiguous, closed meshes to work
    g.mergeVertices()
    // Ensure loaded mesh is convex and create faces if necessary
    return new ConvexGeometry(g.vertices)
  }, [geometry])

  const [mapbody] = useConvexPolyhedron(() => ({
    args: geo,
    type: "Static",
    position,
    collisionFilterGroup: COLLISION_GROUP.TILES,
    collisionFilterMask: COLLISION_GROUP.BODY | COLLISION_GROUP.TILES | COLLISION_GROUP.CORONA,
  }))

  return <mesh ref={mapbody} material={material} geometry={geometry} userData={{ type: COLLISION_GROUP.TILES }} />
}

function Map() {
  const group = useRef()
  const addMapItem = useMap(s => s.addMapItem)

  const { nodes } = useLoader(GLTFLoader, '/map.glb', draco())

  const position = [0, 0, 0]

  const [innerMaterialRef, innerMaterial] = useResource()
  const [outerMaterialRef, outerMaterial] = useResource()

  useEffect(() => void group.current.children.forEach(mesh => void addMapItem(mesh)), [group, addMapItem])

  return (
    <>
      <meshToonMaterial
        ref={innerMaterialRef}
        attach="material"
        shininess={0.3}
        specular={0xaaaaaa}
        color={0xffffff}
      />
      <meshToonMaterial
        ref={outerMaterialRef}
        attach="material"
        shininess={0.3}
        specular={0xaaaaaa}
        color={0x5C3841}
      />

      <group ref={group} >
        <mesh material={innerMaterial} geometry={nodes.Curve001.geometry} name="Curve001" userData={{ type: COLLISION_GROUP.TILES }} />
        <mesh material={innerMaterial} geometry={nodes.Curve002.geometry} name="Curve002" userData={{ type: COLLISION_GROUP.TILES }} />
        <mesh material={innerMaterial} geometry={nodes.Curve003.geometry} name="Curve003" userData={{ type: COLLISION_GROUP.TILES }} />
        <mesh material={innerMaterial} geometry={nodes.Curve004.geometry} name="Curve004" userData={{ type: COLLISION_GROUP.TILES }} />
        <mesh material={innerMaterial} geometry={nodes.Curve005.geometry} name="Curve005" userData={{ type: COLLISION_GROUP.TILES }} />
        <mesh material={innerMaterial} geometry={nodes.Curve006.geometry} name="Curve006" userData={{ type: COLLISION_GROUP.TILES }} />
        <mesh material={innerMaterial} geometry={nodes.Curve007.geometry} name="Curve007" userData={{ type: COLLISION_GROUP.TILES }} />
        <mesh material={innerMaterial} geometry={nodes.Curve008.geometry} name="Curve008" userData={{ type: COLLISION_GROUP.TILES }} />
        <mesh material={innerMaterial} geometry={nodes.Curve009.geometry} name="Curve009" userData={{ type: COLLISION_GROUP.TILES }} />
        <mesh material={innerMaterial} geometry={nodes.Curve010.geometry} name="Curve010" userData={{ type: COLLISION_GROUP.TILES }} />
        <mesh material={innerMaterial} geometry={nodes.Curve011.geometry} name="Curve011" userData={{ type: COLLISION_GROUP.TILES }} />
        <mesh material={innerMaterial} geometry={nodes.Curve012.geometry} name="Curve012" userData={{ type: COLLISION_GROUP.TILES }} />
        <mesh material={innerMaterial} geometry={nodes.Curve013.geometry} name="Curve013" userData={{ type: COLLISION_GROUP.TILES }} />
        <mesh material={innerMaterial} geometry={nodes.Curve014.geometry} name="Curve014" userData={{ type: COLLISION_GROUP.TILES }} />
        <mesh material={innerMaterial} geometry={nodes.Curve015.geometry} name="Curve015" userData={{ type: COLLISION_GROUP.TILES }} />
        <mesh material={innerMaterial} geometry={nodes.Curve016.geometry} name="Curve016" userData={{ type: COLLISION_GROUP.TILES }} />
        <mesh material={innerMaterial} geometry={nodes.Curve017.geometry} name="Curve017" userData={{ type: COLLISION_GROUP.TILES }} />
        <mesh material={innerMaterial} geometry={nodes.Curve018.geometry} name="Curve018" userData={{ type: COLLISION_GROUP.TILES }} />
        <mesh material={innerMaterial} geometry={nodes.Curve019.geometry} name="Curve019" userData={{ type: COLLISION_GROUP.TILES }} />
        <mesh material={innerMaterial} geometry={nodes.Curve020.geometry} name="Curve020" userData={{ type: COLLISION_GROUP.TILES }} />
        <mesh material={innerMaterial} geometry={nodes.Curve021.geometry} name="Curve021" userData={{ type: COLLISION_GROUP.TILES }} />

        <mesh material={outerMaterial} geometry={nodes.Curve022.geometry} name="Curve022" userData={{ type: COLLISION_GROUP.TILES }} />
        <mesh material={outerMaterial} geometry={nodes.Curve023.geometry} name="Curve023" userData={{ type: COLLISION_GROUP.TILES }} />
        <mesh material={outerMaterial} geometry={nodes.Curve024.geometry} name="Curve024" userData={{ type: COLLISION_GROUP.TILES }} />
        <mesh material={outerMaterial} geometry={nodes.Curve025.geometry} name="Curve025" userData={{ type: COLLISION_GROUP.TILES }} />
        <mesh material={outerMaterial} geometry={nodes.Curve026.geometry} name="Curve026" userData={{ type: COLLISION_GROUP.TILES }} />
        <mesh material={outerMaterial} geometry={nodes.Curve027.geometry} name="Curve027" userData={{ type: COLLISION_GROUP.TILES }} />
        <mesh material={outerMaterial} geometry={nodes.Curve028.geometry} name="Curve028" userData={{ type: COLLISION_GROUP.TILES }} />

        <ConvexPolyBody position={position} material={outerMaterial} geometry={nodes.Curve.geometry} name="Curve000" />
        <ConvexPolyBody position={position} material={outerMaterial} geometry={nodes.Curve029.geometry} name="Curve029" />
        <ConvexPolyBody position={position} material={outerMaterial} geometry={nodes.Curve030.geometry} name="Curve030" />
        <ConvexPolyBody position={position} material={outerMaterial} geometry={nodes.Curve031.geometry} name="Curve031" />
        <ConvexPolyBody position={position} material={outerMaterial} geometry={nodes.Curve032.geometry} name="Curve032" />
        <ConvexPolyBody position={position} material={outerMaterial} geometry={nodes.Curve033.geometry} name="Curve033" />
        <ConvexPolyBody position={position} material={outerMaterial} geometry={nodes.Curve034.geometry} name="Curve034" />
        <ConvexPolyBody position={position} material={outerMaterial} geometry={nodes.Curve035.geometry} name="Curve035" />
        <ConvexPolyBody position={position} material={outerMaterial} geometry={nodes.Curve036.geometry} name="Curve036" />
        <ConvexPolyBody position={position} material={outerMaterial} geometry={nodes.Curve037.geometry} name="Curve037" />
        <ConvexPolyBody position={position} material={outerMaterial} geometry={nodes.Curve038.geometry} name="Curve038" />
        <ConvexPolyBody position={position} material={outerMaterial} geometry={nodes.Curve039.geometry} name="Curve039" />
        <ConvexPolyBody position={position} material={outerMaterial} geometry={nodes.Curve040.geometry} name="Curve040" />
        <ConvexPolyBody position={position} material={outerMaterial} geometry={nodes.Curve041.geometry} name="Curve041" />
        <ConvexPolyBody position={position} material={outerMaterial} geometry={nodes.Curve042.geometry} name="Curve042" />
      </group>

    </>
  );
}
export default Map;
