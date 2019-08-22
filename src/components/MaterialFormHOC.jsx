import React from 'react'
import { connect } from 'react-redux'
import { compose } from 'redux'
import { firestoreConnect, isLoaded } from 'react-redux-firebase'
import {
  makePhrasesArray,
  addTranslation,
  localPhrasesToText,
  localPhrasesToTrText
} from '../utils/phrases'
import MaterialForm from './MaterialForm'
import firebase from '../firebase/firebase'
import { setPageParameter } from '../store/pageContentActions'
import { setMenuParameter } from '../store/menuActions'

/**
 * this component loads data from Firebase:  material and translation, join them and pass for display
 * @param {} props
 */
function MaterialFormHOC(props) {
  const {
    materialInfo,
    materialPhrases,
    translationInfo,
    translationPhrases,
    setPageParameter
  } = props
  const { materialId } = props.match.params
  if (isLoaded(materialInfo, materialPhrases, translationInfo, translationPhrases)) {
    const { mediaLink, lang, title, unit, order } = materialInfo
    let phrases = materialPhrases
    console.log('lang', lang)
    phrases = makePhrasesArray(materialPhrases)
    // console.log('phrases', phrases)
    setPageParameter(['materialId', materialId])
    setPageParameter(['unit', unit])
    setPageParameter(['order', order])
    setPageParameter(['lang', lang])
    setPageParameter(['title', title])
    setPageParameter(['mediaLink', mediaLink])
    setPageParameter(['phrases', phrases])
    const text = localPhrasesToText(phrases)
    setPageParameter(['text', text])
    setPageParameter(['mediaLinkDownloadUrl', ''])
    //is external link, with full path to file
    if (mediaLink.match('http')) {
      setPageParameter(['mediaLinkDownloadUrl', mediaLink])
    } else {
      //mediaLink is just id to the file on our hosting, we'll get downloadURL
      firebase
        .storage()
        .ref(mediaLink)
        .getDownloadURL()
        .then(url => {
          setPageParameter(['mediaLinkDownloadUrl', url])
        })
    }

    //adding translation
    if (translationInfo) {
      const { lang: trLang, title: trTitle } = translationInfo
      setPageParameter(['trLang', trLang])
      setPageParameter(['trTitle', trTitle])
      if (translationPhrases) {
        phrases = addTranslation(phrases, translationPhrases, trLang)
        const trText = localPhrasesToTrText(phrases, trLang)
        setPageParameter(['trText', trText])
      }
    }

    // const MP = React.memo(props => <MaterialPage />)

    return <MaterialForm />
  } else {
    return <div>loading</div>
  }
}

const mapStateToProps = state => {
  const fs = state.firestore.data
  const pc = state.pageContent
  return {
    materialInfo: fs.materialInfo,
    materialPhrases: fs.materialPhrases,
    translationInfo: fs.translationInfo,
    translationPhrases: fs.translationPhrases,
    trLang: pc.trLang,
    lang: pc.lang
  }
}

const mapDispatchToProps = dispatch => {
  return {
    setPageParameter: payload => dispatch(setPageParameter(payload)),
    setMenuParameter: payload => dispatch(setMenuParameter(payload))
  }
}

export default compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  ),
  firestoreConnect(props => {
    const { materialId } = props.match.params
    const { trLang } = props

    return [
      { collection: 'materialInfo', doc: materialId, storeAs: 'materialInfo' },
      { collection: 'materialPhrases', doc: materialId, storeAs: 'materialPhrases' },
      { collection: 'translationInfo', doc: `${materialId}_${trLang}`, storeAs: 'translationInfo' },
      {
        collection: 'translationPhrases',
        doc: `${materialId}_${trLang}`,
        storeAs: 'translationPhrases'
      }
    ]
  })
)(MaterialFormHOC)