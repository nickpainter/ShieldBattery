import { Map, Record } from 'immutable'
import {
  ADMIN_GET_PERMISSIONS_BEGIN,
  ADMIN_GET_PERMISSIONS,
  ADMIN_SET_PERMISSIONS,
} from '../actions'

export const Permissions = new Record({
  editPermissions: false,
  debug: false,
  acceptInvites: false,

  lastUpdated: 0,
  isRequesting: false,
  lastError: null,
})

export const PermissionState = new Record({
  users: new Map(),
})

const handlers = {
  [ADMIN_GET_PERMISSIONS_BEGIN](state, action) {
    return state.updateIn([ 'users', action.payload.username ],
        new Permissions(),
        p => p.set('isRequesting', true))
  },

  [ADMIN_GET_PERMISSIONS](state, action) {
    if (action.error) {
      const data = {
        lastUpdated: Date.now(),
        lastError: action.payload,
        isRequesting: false,
      }
      return state.updateIn([ 'users', action.meta.username ],
          new Permissions(),
          p => p.merge(data))
    }

    const data = {
      ...action.payload,
      lastUpdated: Date.now(),
      lastError: null,
      isRequesting: false,
    }
    return state.updateIn([ 'users', action.meta.username ],
        new Permissions(),
        p => p.merge(data))
  },

  [ADMIN_SET_PERMISSIONS](state, action) {
    if (action.error) {
      // TODO(2Pac): handle error
      return state
    }
    // TODO(2Pac): display confirmation/error message, preferably in a snackbar/toast
    const data = {
      ...action.payload,
      lastUpdated: Date.now(),
      lastError: null,
      isRequesting: false,
    }
    return state.updateIn([ 'users', action.meta.username ],
        new Permissions(),
        p => p.merge(data))
  },
}

export default function permissionsReducer(state = new PermissionState(), action) {
  return handlers.hasOwnProperty(action.type) ? handlers[action.type](state, action) : state
}