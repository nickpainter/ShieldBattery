import errors from 'http-errors'
import { Map } from 'immutable'
import { NextFunc, NydusServer } from 'nydus'
import { container, singleton } from 'tsyringe'
import pingRegistry from '../rally-point/ping-registry'
import { Api, Mount, registerApiRoutes } from '../websockets/api-decorators'
import { UserSocketsGroup, UserSocketsManager } from '../websockets/socket-groups'
import validateBody from '../websockets/validate-body'

const MOUNT_BASE = '/rallyPoint'

const serverIndex = (val: number) => val >= 0 && val < pingRegistry.servers.length
const ping = (val: number) => val >= 0 && val <= Number.MAX_VALUE

@singleton()
@Mount(MOUNT_BASE)
class RallyPointApi {
  constructor(private userSockets: UserSocketsManager) {
    this.userSockets
      .on('newUser', user => this.handleNewUser(user))
      .on('userQuit', name => this.handleUserQuit(name))
  }

  @Api(
    '/pingResult',
    validateBody({
      serverIndex,
      ping,
    }),
    'getUser',
  )
  async pingResult(data: Map<string, any>, next: NextFunc) {
    const { serverIndex, ping } = data.get('body')
    const user = data.get('user')
    pingRegistry.addPing(user.name, serverIndex, ping)
  }

  async getUser(data: Map<string, any>, next: NextFunc) {
    const user = this.userSockets.getBySocket(data.get('client'))
    if (!user) throw new errors.Unauthorized('authorization required')
    const newData = data.set('user', user)

    return next(newData)
  }

  private handleNewUser(user: UserSocketsGroup) {
    user.subscribe(`${MOUNT_BASE}/servers`, () => pingRegistry.servers)
  }

  private handleUserQuit(name: string) {
    pingRegistry.clearPings(name)
  }
}

export default function registerApi(nydus: NydusServer) {
  const api = container.resolve(RallyPointApi)
  registerApiRoutes(api, nydus)
  return api
}
