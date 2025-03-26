import React, { useRef } from 'react';
import { View, StyleSheet, PanResponder } from 'react-native';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three-rounded-box';

const ThreeDCube = () => {
  const cubeRef = useRef(null); // Riferimento al parallelepipedo
  const rotation = useRef({ x: 0, y: 0 }); // Stato della rotazione

  const onContextCreate = async (gl) => {
    const { drawingBufferWidth: width, drawingBufferHeight: height } = gl;
    const renderer = new Renderer({ gl });
    renderer.setSize(width, height);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 2;

    // Carica la texture
    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load(require('../../assets/3d.png')); // Assicurati che l'immagine sia nella cartella assets

    // Geometria del parallelepipedo con bordi arrotondati
    const geometry = new RoundedBoxGeometry(1.42, 2, 0.5, 10, 0.1); // Parallelepipedo con bordi arrotondati
    const materials = [
      new THREE.MeshStandardMaterial({ color: 'gray' }), // Lati senza texture
      new THREE.MeshStandardMaterial({ color: 'gray' }),
      new THREE.MeshStandardMaterial({ color: 'gray' }),
      new THREE.MeshStandardMaterial({ color: 'gray' }),
      new THREE.MeshStandardMaterial({ map: texture }), // Lato con texture
      new THREE.MeshStandardMaterial({ color: 'gray' }),
    ];

    const cube = new THREE.Mesh(geometry, materials);
    cubeRef.current = cube; // Salva il riferimento al parallelepipedo
    scene.add(cube);

    const light = new THREE.PointLight(0xffffff, 1, 100);
    light.position.set(10, 10, 10);
    scene.add(light);

    const ambientLight = new THREE.AmbientLight(0x404040, 1); // Luce ambientale
    scene.add(ambientLight);

    const animate = () => {
      requestAnimationFrame(animate);
      if (cubeRef.current) {
        // Applica la rotazione aggiornata
        cubeRef.current.rotation.x = rotation.current.x;
        cubeRef.current.rotation.y = rotation.current.y;
      }
      renderer.render(scene, camera);
      gl.endFrameEXP();
    };

    animate();
  };

  // Gestore del tocco per aggiornare la rotazione
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (event, gestureState) => {
      const { dx, dy } = gestureState;
      rotation.current.x += dy * 0.006; // Aggiorna la rotazione sull'asse X
      rotation.current.y -= dx * 0.006; // Inverti la rotazione sull'asse Y
    },
  });

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <GLView style={styles.container} onContextCreate={onContextCreate} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default ThreeDCube;