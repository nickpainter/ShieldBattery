import { dispatch } from '../dispatch-registry'
import {
  CHAT_LOADING_COMPLETE,
  SUBSCRIPTIONS_LOADING_COMPLETE,
} from '../actions'

const eventToAction = {
  chatReady() {
    return {
      type: CHAT_LOADING_COMPLETE,
    }
  },

  subscribed() {
    return {
      type: SUBSCRIPTIONS_LOADING_COMPLETE,
    }
  },
}

export default function registerModule({ siteSocket }) {
  siteSocket.registerRoute('/users/:userId/:area?', (route, event) => {
    if (!eventToAction[event.type]) return

    const action = eventToAction[event.type](event, siteSocket)
    if (action) dispatch(action)
  })
}