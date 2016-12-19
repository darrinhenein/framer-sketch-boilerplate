import toSnakeCase from 'to-snake-case'
import { pages } from './imported/layers.json'

const addLayer = (layer) => {
  layers[toSnakeCase(layer.name)] = new Layer({
    ...layer.rect,
    image: `images/${layer.name}.png`
  })
}
const loopLayers = (layers) => {
  layers.forEach(layer => {
    console.log(layer)
    addLayer(layer)
    if (layer.layers.length) {
      loopLayers(layer.layers)
    }
  })
}
const layers = {}

// loop through each Sketch page
pages.forEach(page => {
  // loop through all Sketch layers to create Framer layers
  loopLayers(page.layers)
})

console.log(layers)

const WIDTH = window.innerWidth
const HEIGHT = window.innerHeight
const { blue_block } = layers

Framer.Defaults.Animation = {
  curve: 'spring(150, 10, 0)'
}

blue_block.on(Events.Click, () => {
  const bounce = new Animation({
    layer: blue_block,
    properties: {
      x: WIDTH * Math.random(),
      y: HEIGHT * Math.random()
    }
  })
  bounce.start()
})
