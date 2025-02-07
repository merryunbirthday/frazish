import WaveSurfer from 'wavesurfer.js'
import RegionsPlugin from 'wavesurfer.js/dist/plugin/wavesurfer.regions.min'
import TimelinePlugin from 'wavesurfer.js/dist/plugin/wavesurfer.timeline.min'

import store from '../store/rootReducer'
import { setPlayerState } from '../store/playerStateActions'

import soundtouch from './soundtouchFilter'

let wavesurfer

const init = (waveformConteiner, timelineContainer, mediaLink, phrasesArray0, readOnly) => {
  const readModeRegionOptions = { drag: false, resize: false } // should be added to each region
  let phrasesArray = phrasesArray0
  let dragSelection = true

  if (readOnly) {
    phrasesArray = phrasesArray0.map(elem => ({ ...elem, ...readModeRegionOptions }))
    dragSelection = false
  }

  wavesurfer = WaveSurfer.create({
    container: waveformConteiner,
    scrollParent: true,
    //   minPxPerSec: 200,
    plugins: [
      RegionsPlugin.create({
        regions: phrasesArray,
        dragSelection
      }),
      TimelinePlugin.create({
        container: timelineContainer
      })
    ]
  })

  wavesurfer.load(mediaLink)

  wavesurfer.on('region-click', (region, e) => {
    e.stopPropagation()
    region.play()
  })

  wavesurfer.on('region-in', region => {
    const { id } = region
    store.dispatch(setPlayerState(['currentPhraseId', id]))
  })

  wavesurfer.on('region-out', region => {
    //console.log('region out', region.id)
  })

  wavesurfer.on('play', () => {
    store.dispatch(setPlayerState(['play', true]))
  })
  wavesurfer.on('pause', () => {
    store.dispatch(setPlayerState(['play', false]))
  })

  // Time stretcher
  wavesurfer.on('ready', function() {
    var st = new soundtouch.SoundTouch(wavesurfer.backend.ac.sampleRate)
    var buffer = wavesurfer.backend.buffer
    var channels = buffer.numberOfChannels
    var l = buffer.getChannelData(0)
    var r = channels > 1 ? buffer.getChannelData(1) : l
    var length = buffer.length
    var seekingPos = null
    var seekingDiff = 0

    var source = {
      extract: function(target, numFrames, position) {
        if (seekingPos != null) {
          seekingDiff = seekingPos - position
          seekingPos = null
        }

        position += seekingDiff

        for (var i = 0; i < numFrames; i++) {
          target[i * 2] = l[i + position]
          target[i * 2 + 1] = r[i + position]
        }

        return Math.min(numFrames, length - position)
      }
    }

    var soundtouchNode

    wavesurfer.on('play', function() {
      seekingPos = ~~(wavesurfer.backend.getPlayedPercents() * length)
      st.tempo = wavesurfer.getPlaybackRate()

      if (st.tempo === 1) {
        wavesurfer.backend.disconnectFilters()
      } else {
        if (!soundtouchNode) {
          var filter = new soundtouch.SimpleFilter(source, st)
          soundtouchNode = soundtouch.getWebAudioNode(wavesurfer.backend.ac, filter)
        }
        wavesurfer.backend.setFilter(soundtouchNode)
      }
    })

    wavesurfer.on('pause', function() {
      soundtouchNode && soundtouchNode.disconnect()
    })

    wavesurfer.on('seek', function() {
      seekingPos = ~~(wavesurfer.backend.getPlayedPercents() * length)
    })
  })

  const { playbackRate, volume } = store.getState().playerSettings

  wavesurfer.setPlaybackRate(playbackRate)
  wavesurfer.setVolume(volume)

  return wavesurfer
}

export default { wavesurfer, init }
