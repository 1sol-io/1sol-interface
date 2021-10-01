import React, { useEffect, useRef } from 'react'

// @ts-nocheck
export const Canvas = () => {
  const canvasRef: { current: any } = useRef()

  useEffect(() => {
    // @ts-ignore
    function randomIntFromInterval(min, max){
      // min and max included
      return Math.floor(Math.random() * (max - min + 1) + min)
    }

    var w = (canvasRef.current.width = window.innerWidth),
      h = (canvasRef.current.height = window.innerHeight),
      ctx = canvasRef.current.getContext('2d'),
      opts = {
        len: 20,
        count: 100,
        baseTime: 10,
        addedTime: 10,
        dieChance: 0.02,
        spawnChance: 1,
        sparkChance: 0.1,
        sparkDist: 10,
        sparkSize: 2,

        color: 'hsl(hue,100%,light%)',
        baseLight: 50,
        addedLight: 10, // [50-10,50+10]
        shadowToTimePropMult: 10,
        baseLightInputMultiplier: 0.01,
        addedLightInputMultiplier: 0.02,

        cx: w / 2,
        cy: h / 2,
        repaintAlpha: 0.08,
        hueChange: 0.1
      },
      tick = 0,
      lines: any[] = [],
      dieX = w / 2 / opts.len,
      dieY = h / 2 / opts.len,
      baseRad = Math.PI * 2 / 6

    ctx.fillStyle = '#272a2e'
    ctx.fillRect(0, 0, w, h)
    // ctx.globalAlpha = 0.0

    function loop(){
      window.requestAnimationFrame(loop)

      ++tick

      ctx.globalCompositeOperation = 'source-over'
      ctx.shadowBlur = 0
      // @ts-ignore
      // ctx.fillStyle = '#272a2e'
      ctx.fillStyle = 'rgba(39,42,46,alp)'.replace('alp', opts.repaintAlpha)
      ctx.fillRect(0, 0, w, h)
      ctx.globalCompositeOperation = 'lighter'

      if (lines.length < opts.count && Math.random() < opts.spawnChance)
        // @ts-ignore
        lines.push(new Line())

      // @ts-ignore
      lines.map(function(line){
        line.step()
      })
    }
    function Line(){
      // @ts-ignore
      this.reset()
    }

    Line.prototype.reset = function(){
      this.x = 0
      this.y = 0
      this.addedX = 0
      this.addedY = 0

      this.rad = 0

      this.lightInputMultiplier =
        opts.baseLightInputMultiplier +
        opts.addedLightInputMultiplier * Math.random()

      // @ts-ignore
      this.color = opts.color.replace('hue', tick * opts.hueChange)
      this.cumulativeTime = 0

      this.beginPhase()
    }

    Line.prototype.beginPhase = function(){
      this.x += this.addedX
      this.y += this.addedY

      this.time = 0
      this.targetTime = (opts.baseTime + opts.addedTime * Math.random()) | 0

      this.rad += baseRad * (Math.random() < 0.5 ? 1 : -1)
      this.addedX = Math.cos(this.rad)
      this.addedY = Math.sin(this.rad)

      if (
        Math.random() < opts.dieChance ||
        this.x > dieX ||
        this.x < -dieX ||
        this.y > dieY ||
        this.y < -dieY
      ) {
        this.reset()
      }
    }

    Line.prototype.step = function(){
      ++this.time
      ++this.cumulativeTime

      if (this.time >= this.targetTime) this.beginPhase()

      var prop = this.time / this.targetTime,
        wave = Math.sin(prop * Math.PI / 2),
        x = this.addedX * wave,
        y = this.addedY * wave

      ctx.shadowBlur = prop * opts.shadowToTimePropMult
      ctx.fillStyle = ctx.shadowColor = this.color.replace(
        'light',
        opts.baseLight +
          opts.addedLight *
            Math.sin(this.cumulativeTime * this.lightInputMultiplier)
      )
      ctx.fillRect(
        opts.cx + (this.x + x) * opts.len,
        opts.cy + (this.y + y) * opts.len,
        2,
        2
      )

      if (Math.random() < opts.sparkChance) {
        ctx.fillRect(
          opts.cx +
            (this.x + x) * opts.len +
            Math.random() * opts.sparkDist * (Math.random() < 0.5 ? 1 : -1) -
            opts.sparkSize / 2,
          opts.cy +
            (this.y + y) * opts.len +
            Math.random() * opts.sparkDist * (Math.random() < 0.5 ? 1 : -1) -
            opts.sparkSize / 2,
          opts.sparkSize,
          opts.sparkSize
        )
      }
    }

    loop()

    window.addEventListener('resize', function(){
      w = canvasRef.current.width = window.innerWidth
      h = canvasRef.current.height = window.innerHeight
      ctx.fillStyle = '#272a2e'
      ctx.fillRect(0, 0, w, h)

      opts.cx = w / 2
      opts.cy = h / 2

      dieX = w / 2 / opts.len
      dieY = h / 2 / opts.len
    })
  }, [])

  return <canvas style={{ position: 'absolute' }} ref={canvasRef} />
}
