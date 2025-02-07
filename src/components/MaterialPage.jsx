import React from 'react'
import PlayerControls from './PlayerControls'
import Phrases from './Phrases'
import Waveform from './Waveform'
import { connect } from 'react-redux'
import PlayerSlideShow from './PlayerSlideShow'
import { makeStyles } from '@material-ui/core/styles'
import wavesurferModule from '../wavesurfer/wavesurfer'
import { setPlayerState } from '../store/playerStateActions'
import { Typography, CircularProgress } from '@material-ui/core'

const useStyles = makeStyles(theme => ({
  hidden: { display: 'none' }
}))

function MaterialPage(props) {
  const classes = useStyles()

  const {
    //from Redux
    currentPhraseId,
    dictationCurrentRepeat,
    dictationTimerId, // >0 then dictation is playing
    dictationDelay,
    dictationRepeats,
    setPlayerState,
    showSlideshow,
    showWaveform,
    //from HOC
    phrasesArray,
    mediaLink,
    title
  } = props

  const currentPhraseNum = phrasesArray.findIndex(elem => elem.id === currentPhraseId)

  const play = () => {
    wavesurferModule.wavesurfer.play()
    stopDictation()
  }

  const pause = () => {
    wavesurferModule.wavesurfer.pause()
    stopDictation()
  }

  const playPhrase = id => event => {
    wavesurferModule.wavesurfer.regions.list[id].play()
    stopDictation()
  }

  const playPhraseDictation = id => event => {
    wavesurferModule.wavesurfer.regions.list[id].play()
  }

  const playNext = () => {
    const { id: nextId } = phrasesArray[currentPhraseNum + 1]
    playPhrase(nextId)()
  }

  const playPrev = () => {
    const { id: prevId } = phrasesArray[currentPhraseNum - 1]
    playPhrase(prevId)()
  }

  /**
   * repeats phrase N times with phraseLength X*delay
   * @param {Number} phraseNum
   * @param {Number} repeatCount
   * @param {Number} delayX - delaySeconds = delayX * phraseLength
   * @returns {array} repeats - array of setTimeout
   */
  const playPhraseNtimesWithXDelay = (currentRepeatNum, phraseNum, repeatCount, delayX) => {
    if (phraseNum === phrasesArray.length) return
    const phrase = phrasesArray[phraseNum]
    const { id, start, end } = phrase
    const phraseLength = end - start
    const delaySeconds = phraseLength * delayX

    playPhraseDictation(id)()

    const timerId = setTimeout(() => {
      if (currentRepeatNum < repeatCount) {
        playPhraseNtimesWithXDelay(currentRepeatNum + 1, phraseNum, repeatCount, delayX)
      } else {
        playPhraseNtimesWithXDelay(1, phraseNum + 1, repeatCount, delayX)
      }
    }, delaySeconds * 1000)

    setPlayerState(['dictationTimerId', timerId])
    setPlayerState(['dictationCurrentRepeat', currentRepeatNum])
  }

  const stopDictation = () => {
    clearTimeout(dictationTimerId)
    setPlayerState(['dictationTimerId', 0])
  }

  const playDictation = () => {
    const beginFrom = currentPhraseNum < 0 ? 0 : currentPhraseNum
    if (!dictationTimerId) {
      playPhraseNtimesWithXDelay(1, beginFrom, dictationRepeats, dictationDelay)
    } else {
      stopDictation()
    }
  }

  const playerControlsProps = {
    play,
    pause,
    playPhrase,
    playNext,
    playPrev,
    playDictation,
    dictationTimerId
  }

  const playerSlideShowProps = {
    currentPhraseNum,
    phrasesArray,
    dictationCurrentRepeat,
    dictationRepeats,
    dictationTimerId,
    dictationDelay
  }

  const waveformProps = { mediaLink, phrasesArray, readOnly: true }

  return (
    <div>
      <div style={{ margin: 20 }}>
        <Typography variant='h5'>{title.text}</Typography>
        <Typography variant='subtitle1'>{title.translations.ru}</Typography>
      </div>
      {mediaLink ? (
        <div className={showWaveform ? '' : classes.hidden}>
          <Waveform {...waveformProps} />
        </div>
      ) : (
        <CircularProgress />
      )}
      <div className={showSlideshow ? '' : classes.hidden}>
        <PlayerSlideShow {...playerSlideShowProps} />
        <PlayerControls {...playerControlsProps} />
      </div>
      <Phrases phrasesArray={phrasesArray} playPhrase={playPhrase} />
    </div>
  )
}

const mapStateToProps = state => {
  const { currentPhraseId, dictationCurrentRepeat, dictationTimerId } = state.playerState
  const { dictationRepeats, dictationDelay, showWaveform, showSlideshow } = state.playerSettings
  const { mediaLink } = state.pageContent
  return {
    currentPhraseId,
    dictationCurrentRepeat,
    dictationTimerId,
    dictationRepeats,
    dictationDelay,
    showWaveform,
    showSlideshow,
    mediaLink
  }
}

const mapDispatchToProps = dispatch => {
  return {
    setPlayerState: payload => dispatch(setPlayerState(payload))
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(MaterialPage)
