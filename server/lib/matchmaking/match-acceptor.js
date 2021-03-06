import { List, Map, Record } from 'immutable'
import cuid from 'cuid'

const STATUS_UNACCEPTED = 0
const STATUS_ACCEPTED = 1
const STATUS_DISCONNECTED = 2

const Match = new Record({
  id: null,
  info: null,
  clients: new Map(), // client -> status
  timer: null,
})

// A service for allowing clients to register acceptance of a matchmaking match, confirming that
// they are active and ready to play. Each client can have at most one active match at any given
// time.
export default class MatchAcceptor {
  // acceptTimeMs is the max time (in milliseconds) that clients will be given to accept. If a match
  //    is not accepted in this time period, it will be declined.
  // onAcceptProgress is a `function(matchInfo, total, accepted)` that will be called whenever a new
  //    player has accepted the match. `total` is the total count of players in the match,
  //    `accepted` is the count of players that have accepted the match
  // onAccepted is a `function(matchInfo, clients)` that will be called when all clients for a match
  //    have accepted it (params will be what is passed into `addMatch` originally)
  // onDeclined is a `function(matchInfo, requeueClients, kickClients)` that will be called when a
  //    match is declined (either due to timeout, or a client leaving the queue before the
  //    match was fully accepted). `requeueClients` is an iterable of clients who should be
  //    requeued, `kickClients` is an iterable of clients who should be removed from the queue.
  // onError is a `function(error, clients)` that will be called whenever any of the above functions
  //    fail.
  constructor(acceptTimeMs, { onAcceptProgress, onAccepted, onDeclined, onError }) {
    this.acceptTimeMs = acceptTimeMs
    this.onAcceptProgress = onAcceptProgress
    this.onAccepted = onAccepted
    this.onDeclined = onDeclined
    this.onError = onError

    this.matches = new Map()
    this.clientToMatchId = new Map()
  }

  // Adds a match for potential acceptance.
  // `matchInfo` can be anything, and will be returned when a match is accepted/declined
  // `clients` is an iterable that will be used as the matching criteria for
  //      accepts/disconnects/timeouts.
  addMatch(matchInfo, clients) {
    const id = cuid()
    const match = new Match({
      id,
      info: matchInfo,
      clients: new Map(clients.map(c => [c, STATUS_UNACCEPTED])),
      timer: setTimeout(this._onMatchTimeout.bind(this, id), this.acceptTimeMs),
    })
    this.matches = this.matches.set(id, match)
    this.clientToMatchId = this.clientToMatchId.merge(new Map(clients.map(c => [c, id])))
  }

  // Registers that a client has disconnected (and will not be accepting their match, if any).
  // Returns true if there was a match, false otherwise.
  registerDisconnect(client) {
    if (!this.clientToMatchId.has(client)) {
      return false
    }

    const id = this.clientToMatchId.get(client)
    // No need to update this.matches since this will be removed right after anyway
    const match = this.matches.get(id).setIn(['clients', client], STATUS_DISCONNECTED)

    this._cleanupMatch(match)

    // Split clients between those who disconnected and those who haven't. Those who haven't
    // disconnected will be requeued, those who have disconnected will be kicked.
    const split = match.clients.groupBy(status => status !== STATUS_DISCONNECTED)
    this._declineMatch(match, split)

    return true
  }

  // Registers that a client has accepted their match (if any). Returns true if there was a match,
  // false otherwise.
  registerAccept(client) {
    if (!this.clientToMatchId.has(client)) {
      return false
    }

    const id = this.clientToMatchId.get(client)
    const oldMatch = this.matches.get(id)
    const match = oldMatch.setIn(['clients', client], STATUS_ACCEPTED)

    if (!match.clients.every(status => status === STATUS_ACCEPTED)) {
      // Still waiting on at least one player
      if (oldMatch !== match) {
        this.matches = this.matches.set(id, match)
        Promise.resolve(
          this.onAcceptProgress(
            match.info,
            match.clients.size,
            match.clients.count(status => status === STATUS_ACCEPTED),
          ),
        ).catch(err => this.onError(err, match.clients.keys()))
      }
    } else {
      // All players have accepted
      this._cleanupMatch(match)
      Promise.resolve(this.onAccepted(match.info, new List(match.clients.keys()))).catch(err =>
        this.onError(err, match.clients.keys()),
      )
    }

    return true
  }

  _onMatchTimeout(id) {
    const match = this.matches.get(id)
    this._cleanupMatch(match)

    // Split clients between those who have accepted and those who haven't. Those who have accepted
    // will be requeued, everyone else will be kicked.
    const split = match.clients.groupBy(status => status === STATUS_ACCEPTED)
    this._declineMatch(match, split)
  }

  _cleanupMatch(match) {
    this.matches = this.matches.delete(match.id)
    this.clientToMatchId = this.clientToMatchId.withMutations(map => {
      for (const c of match.clients.keys()) {
        map.delete(c)
      }
    })
    clearTimeout(match.timer)
  }

  _declineMatch(match, clients) {
    const requeueClients = clients.get(true)
    const kickClients = clients.get(false)
    Promise.resolve(
      this.onDeclined(
        match.info,
        requeueClients ? requeueClients.keys() : [],
        kickClients ? kickClients.keys() : [],
      ),
    ).catch(err => this.onError(err, match.clients.keys()))
  }
}
