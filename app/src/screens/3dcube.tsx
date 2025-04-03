import React, { useRef } from 'react';
import { View, StyleSheet, PanResponder, Asset } from 'react-native';
import { GLView } from 'expo-gl';
import { Renderer, TextureLoader } from 'expo-three';
import * as THREE from 'three';

const ThreeDCube = () => {
  const cubeRef = useRef(null);
  const rotation = useRef({ x: 0, y: 0 });
  const velocity = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);

  // Aggiungi funzione per limitare l'angolo
  const clampRotation = (value, min, max) => {
    return Math.min(Math.max(value, min), max);
  };

  const onContextCreate = async (gl) => {
    const { drawingBufferWidth: width, drawingBufferHeight: height } = gl;
    const renderer = new Renderer({ gl });
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 1);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x222222);

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 3;

    // Carica le texture
    const front = await new TextureLoader().loadAsync(
      require('../../assets/3d.png')
    );
    const back = await new TextureLoader().loadAsync(
      require('../../assets/back.png')
    );
    const paperTexture = await new TextureLoader().loadAsync(
      require('../../assets/paper-texture.png')  // Assicurati di avere questa texture
    );

    // Configure textures
    [front, back, paperTexture].forEach(texture => {
      texture.generateMipmaps = false;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
    });

    // Configurazione texture carta
    paperTexture.wrapS = paperTexture.wrapT = THREE.RepeatWrapping;
    paperTexture.repeat.set(1, 1);

    const paperMaterial = {
      roughness: 0.9,          // Alta rugosità per effetto opaco
      metalness: 0.0,          // Nessuna metallicità
      bumpMap: paperTexture,   // Texture per rilievo superficiale
      bumpScale: 0.02,         // Intensità del rilievo
      color: 0xf0f0f0,        // Colore leggermente grigio
      side: THREE.DoubleSide,
    };

    // Crea materiali per ogni faccia
    const materials = [
      new THREE.MeshStandardMaterial({ 
        ...paperMaterial,
        color: 0x808080,
      }),
      new THREE.MeshStandardMaterial({ ...paperMaterial }), // Retro
      new THREE.MeshStandardMaterial({ ...paperMaterial }), // Top
      new THREE.MeshStandardMaterial({ ...paperMaterial }), // Bottom
      new THREE.MeshStandardMaterial({                     // Destra (con texture)
        ...paperMaterial,
        map: front,
      }),
      new THREE.MeshStandardMaterial({                     // Sinistra
        ...paperMaterial,
        map: back,
      })
    ];

    const geometry = new THREE.BoxGeometry(2.1, 3, 0.01);
    const cube = new THREE.Mesh(geometry, materials);
    cubeRef.current = cube;
    scene.add(cube);

    // Configurazione luci
    // PointLight: luce che si irradia in tutte le direzioni da un punto
    const pointLight = new THREE.PointLight(0xffffff, 0.8, 100);
    pointLight.position.set(0, 0, 2);
    scene.add(pointLight);

    // SpotLight: come un faretto, crea un cono di luce
    const spotLight = new THREE.SpotLight(0xffffff, 1);
    spotLight.position.set(0, 5, 0);
    spotLight.angle = Math.PI / 4; // ampiezza del cono
    spotLight.penumbra = 0.1; // morbidezza dei bordi
    spotLight.castShadow = true;
    spotLight.shadow.mapSize.width = 1024;
    spotLight.shadow.mapSize.height = 1024;
    scene.add(spotLight);

    // Ambient light per illuminazione generale
    const ambientLight = new THREE.AmbientLight(0xffffff, 2);
    scene.add(ambientLight);

    // Aggiungi ombre
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const animate = () => {
      requestAnimationFrame(animate);
      if (cubeRef.current) {
        // Applica smorzamento quando non si sta trascinando
        if (!isDragging.current) {
          velocity.current.x *= 0.012; // Smorzamento più forte
          velocity.current.y *= 0.012;
        }

        // Aggiorna la rotazione con limiti
        rotation.current.x = clampRotation(
          rotation.current.x + velocity.current.x,
          -Math.PI / 3,  // Limite inferiore (-60 gradi)
          Math.PI / 3    // Limite superiore (+60 gradi)
        );
        rotation.current.y += velocity.current.y;

        cubeRef.current.rotation.x = rotation.current.x;
        cubeRef.current.rotation.y = rotation.current.y;
      }
      renderer.render(scene, camera);
      gl.endFrameEXP();
    };

    animate();
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      isDragging.current = true;
    },
    onPanResponderMove: (event, gestureState) => {
      const { dx, dy } = gestureState;
      velocity.current.x = dy * 0.002; // Ridotto da 0.005 a 0.002
      velocity.current.y = dx * 0.002; // Ridotto da 0.005 a 0.002
    },
    onPanResponderRelease: () => {
      isDragging.current = false;
    }
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