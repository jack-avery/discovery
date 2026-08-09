import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { ApiError } from '@/services/api'
import {
  mapBackendUser,
  mapSetupCredentials,
  sortManagedUsers,
  toUsersApiParams,
  userFormErrorsFromApi,
  type CreateUserInput,
  type UpdateUserInput,
} from '@/services/userService'
import type { BackendManagedUserDto, ManagedUser } from '@/types/user'

describe('mapBackendUser', () => {
  it('maps singular role into roles[]', () => {
    const dto: BackendManagedUserDto = {
      user_id: 7,
      email: 'mod@rrcrc.ca',
      first_name: 'Priya',
      last_name: 'Nair',
      is_active: true,
      created_at: '2024-04-18T14:05:00Z',
      role: 'moderator',
    }

    assert.deepEqual(mapBackendUser(dto), {
      user_id: 7,
      email: 'mod@rrcrc.ca',
      first_name: 'Priya',
      last_name: 'Nair',
      is_active: true,
      created_at: '2024-04-18T14:05:00Z',
      roles: ['moderator'],
    })
  })

  it('maps null role to empty roles', () => {
    const mapped = mapBackendUser({
      user_id: 1,
      email: 'a@b.ca',
      first_name: 'A',
      last_name: 'B',
      is_active: false,
      created_at: null,
      role: null,
    })
    assert.equal(mapped.created_at, '')
    assert.deepEqual(mapped.roles, [])
    assert.equal(mapped.is_active, false)
  })
})

describe('mapSetupCredentials', () => {
  it('maps token and expiry hours without inventing a password', () => {
    assert.deepEqual(
      mapSetupCredentials({
        setup_token: 'raw-token-value',
        setup_token_expires_in_hours: 48,
      }),
      { token: 'raw-token-value', expiresInHours: 48 },
    )
  })
})

describe('toUsersApiParams', () => {
  it('maps pagination, search, role, and active-only filter', () => {
    assert.deepEqual(
      toUsersApiParams({
        search: '  Jordan  ',
        role: 'staff_editor',
        includeInactive: false,
        page: 2,
        perPage: 10,
      }),
      {
        page: 2,
        limit: 10,
        search: 'Jordan',
        role: 'staff_editor',
        is_active: true,
      },
    )
  })

  it('omits is_active when includeInactive is true', () => {
    const params = toUsersApiParams({ includeInactive: true, role: 'all' })
    assert.equal(params.page, 1)
    assert.equal(params.limit, 10)
    assert.equal('is_active' in params, false)
    assert.equal('role' in params, false)
    assert.equal('search' in params, false)
  })
})

describe('sortManagedUsers', () => {
  const users: ManagedUser[] = [
    {
      user_id: 2,
      email: 'b@rrcrc.ca',
      first_name: 'Zoe',
      last_name: 'Bee',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      roles: ['moderator'],
    },
    {
      user_id: 1,
      email: 'a@rrcrc.ca',
      first_name: 'Amy',
      last_name: 'Aye',
      is_active: false,
      created_at: '2025-01-01T00:00:00Z',
      roles: ['administrator'],
    },
  ]

  it('sorts by name on the current page', () => {
    const sorted = sortManagedUsers(users, 'name')
    assert.equal(sorted[0].first_name, 'Amy')
    assert.equal(sorted[1].first_name, 'Zoe')
  })

  it('sorts by created_at descending', () => {
    const sorted = sortManagedUsers(users, 'created_at')
    assert.equal(sorted[0].user_id, 1)
  })
})

describe('userFormErrorsFromApi', () => {
  it('maps field errors and 409 duplicate email', () => {
    const withFields = userFormErrorsFromApi(
      new ApiError('Invalid', 422, {
        errors: { email: 'Must be a valid email.', role: 'Invalid role.' },
      }),
    )
    assert.deepEqual(withFields, {
      email: 'Must be a valid email.',
      role: 'Invalid role.',
    })

    const conflict = userFormErrorsFromApi(
      new ApiError("A user with email 'x' already exists.", 409),
    )
    assert.deepEqual(conflict, {
      email: 'An account with this email already exists.',
    })
  })

  it('returns undefined for non-ApiError', () => {
    assert.equal(userFormErrorsFromApi(new Error('boom')), undefined)
  })
})

describe('create/update request shapes', () => {
  it('create input uses staff role fields only', () => {
    const input: CreateUserInput = {
      email: 'new@rrcrc.ca',
      first_name: 'New',
      last_name: 'User',
      role: 'moderator',
    }
    assert.equal('password' in input, false)
  })

  it('update input supports is_active for enable/disable', () => {
    const disable: UpdateUserInput = { is_active: false }
    const enable: UpdateUserInput = { is_active: true }
    assert.equal(disable.is_active, false)
    assert.equal(enable.is_active, true)
  })
})
