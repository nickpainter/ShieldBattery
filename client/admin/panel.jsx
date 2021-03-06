import React from 'react'
import { connect } from 'react-redux'
import { Link, Route, Switch } from 'react-router-dom'

import AdminBetaInvites from './invites'
import AdminMapPools from './map-pools'
import AdminMatchmakingTimes from './matchmaking-times'
import { ConditionalRoute } from '../navigation/custom-routes'
import { UserFind } from './user-profile'
import {
  CanAcceptBetaInvitesFilter,
  CanManageMapPoolsFilter,
  CanManageMatchmakingTimesFilter,
  CanViewUserProfileFilter,
} from './admin-route-filters'

const AdminMapManager = IS_ELECTRON ? require('./map-manager').default : null

class AdminDashboard extends React.Component {
  render() {
    const perms = this.props.permissions

    const usersLink =
      perms.editPermissions || perms.banUsers ? (
        <li>
          <Link to='/admin/users'>View user's profile</Link>
        </li>
      ) : null
    const mapsLink =
      (perms.manageMaps || perms.massDeleteMaps) && IS_ELECTRON ? (
        <li>
          <Link to='/admin/map-manager'>Manage maps</Link>
        </li>
      ) : null
    const mapPoolsLink = perms.manageMapPools ? (
      <li>
        <Link to='/admin/map-pools'>Manage matchmaking map pools</Link>
      </li>
    ) : null
    const matchmakingTimesLink = perms.manageMatchmakingTimes ? (
      <li>
        <Link to='/admin/matchmaking-times'>Manage matchmaking times</Link>
      </li>
    ) : null
    const invitesLink = perms.acceptInvites ? (
      <li>
        <Link to='/admin/invites'>View beta invites</Link>
      </li>
    ) : null

    return (
      <ul>
        {usersLink}
        {mapsLink}
        {mapPoolsLink}
        {matchmakingTimesLink}
        {invitesLink}
      </ul>
    )
  }
}

@connect(state => ({ auth: state.auth }))
export default class Panel extends React.Component {
  render() {
    const perms = this.props.auth.permissions

    return (
      <Switch>
        <Route path='/admin' exact={true} render={() => <AdminDashboard permissions={perms} />} />
        <ConditionalRoute
          path='/admin/users'
          filters={[CanViewUserProfileFilter]}
          component={UserFind}
        />
        <ConditionalRoute
          path='/admin/invites'
          filters={[CanAcceptBetaInvitesFilter]}
          component={AdminBetaInvites}
        />
        {AdminMapManager ? <Route path='/admin/map-manager' component={AdminMapManager} /> : null}
        <ConditionalRoute
          path='/admin/map-pools'
          filters={[CanManageMapPoolsFilter]}
          component={AdminMapPools}
        />
        <ConditionalRoute
          path='/admin/matchmaking-times'
          filters={[CanManageMatchmakingTimesFilter]}
          component={AdminMatchmakingTimes}
        />
      </Switch>
    )
  }
}
