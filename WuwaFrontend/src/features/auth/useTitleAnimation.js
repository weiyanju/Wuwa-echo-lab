import { onBeforeUnmount, onMounted, ref } from 'vue'

import {
  TITLE_INDICATOR_STATE,
  TITLE_PHASE,
  createTitleAnimation,
  shouldAnimateTitle,
} from './titleAnimation.js'
import { createTitleFontPreparation } from './titleFont.js'

export function useTitleAnimation(text, {
  windowTarget = globalThis.window,
  documentTarget = globalThis.document,
} = {}) {
  const reducedMotionQuery = windowTarget?.matchMedia?.('(prefers-reduced-motion: reduce)')
  const compactViewportQuery = windowTarget?.matchMedia?.('(max-width: 520px)')
  const shouldPlay = Boolean(reducedMotionQuery && compactViewportQuery)
    && shouldAnimateTitle({
      reduceMotion: reducedMotionQuery.matches,
      compactViewport: compactViewportQuery.matches,
      documentHidden: documentTarget?.hidden ?? true,
    })
  const displayedTitle = ref(shouldPlay ? '' : text)
  const phase = ref(shouldPlay ? TITLE_PHASE.PREPARING : TITLE_PHASE.STATIC)
  const indicatorState = ref(TITLE_INDICATOR_STATE.HIDDEN)
  const isAuthReady = ref(!shouldPlay)
  let animation = null
  let fontPreparation = null
  let stopped = false

  function complete() {
    if (animation) {
      animation.complete()
      return
    }
    displayedTitle.value = text
    phase.value = TITLE_PHASE.STATIC
    indicatorState.value = TITLE_INDICATOR_STATE.HIDDEN
    isAuthReady.value = true
  }

  function handleDocumentVisibility() {
    if (documentTarget?.hidden) complete()
  }

  function handleStaticPreference(event) {
    if (event.matches) complete()
  }

  onMounted(async () => {
    if (!shouldPlay) return
    if (documentTarget?.hidden || reducedMotionQuery.matches || compactViewportQuery.matches) {
      complete()
      return
    }
    documentTarget?.addEventListener('visibilitychange', handleDocumentVisibility)
    reducedMotionQuery.addEventListener('change', handleStaticPreference)
    compactViewportQuery.addEventListener('change', handleStaticPreference)
    fontPreparation = createTitleFontPreparation({
      text,
      fontSet: documentTarget?.fonts,
    })
    fontPreparation.start()
    const fontReady = await fontPreparation.ready
    if (stopped || phase.value === TITLE_PHASE.STATIC) return
    if (!fontReady || documentTarget?.hidden || reducedMotionQuery.matches || compactViewportQuery.matches) {
      complete()
      return
    }
    animation = createTitleAnimation({
      text,
      onFrame: (frame) => {
        displayedTitle.value = frame
      },
      onPhaseChange: (nextPhase) => {
        phase.value = nextPhase
      },
      onIndicatorChange: (nextState) => {
        indicatorState.value = nextState
      },
      onAuthReady: () => {
        isAuthReady.value = true
      },
      onComplete: () => {},
    })
    animation.start()
  })

  onBeforeUnmount(() => {
    stopped = true
    fontPreparation?.cancel()
    animation?.cancel()
    documentTarget?.removeEventListener('visibilitychange', handleDocumentVisibility)
    reducedMotionQuery?.removeEventListener('change', handleStaticPreference)
    compactViewportQuery?.removeEventListener('change', handleStaticPreference)
  })

  return { displayedTitle, phase, indicatorState, isAuthReady }
}
