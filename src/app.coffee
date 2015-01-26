WIDTH = Framer.Screen.width
HEIGHT = Framer.Screen.height

Framer.Defaults.Animation =
  curve: 'spring(150, 10, 0)'

circle = new Layer
  x: WIDTH / 2
  y: HEIGHT / 2
  image: 'images/circle.png'

circle.on Events.Click, ->
  bounce = new Animation
    layer: circle
    properties:
      x: WIDTH * Math.random()
      y: HEIGHT * Math.random()

  bounce.start()
