import { Navigate, type RouteObject } from 'react-router-dom'
import { AppLayout, StaffLayout } from '@/app/layouts'
import { RequireAuth } from '@/app/router/RequireAuth'
import { DISCOVER_OPEN_UPDATE_QUERY } from '@/features/discover/constants'
import { DiscoverPage } from '@/pages/DiscoverPage'
import { HomePage } from '@/pages/HomePage'
import { MapPage } from '@/pages/MapPage'
import { ResourcesPage } from '@/pages/ResourcesPage'
import { SubmissionsPage } from '@/pages/SubmissionsPage'
import { SubmitResourcePage } from '@/pages/SubmitResourcePage'
import { StaffSignInPage } from '@/pages/StaffSignInPage'
import { StaffHomePage } from '@/pages/StaffHomePage'
import { StaffSubmissionsPage } from '@/pages/StaffSubmissionsPage'
import { StaffUsersPage } from '@/pages/StaffUsersPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <DiscoverPage /> },
      { path: 'home', element: <HomePage /> },
      { path: 'submit', element: <SubmitResourcePage /> },
      {
        path: 'request-update',
        element: (
          <Navigate to={`/?${DISCOVER_OPEN_UPDATE_QUERY}=1`} replace />
        ),
      },
      { path: 'sign-in', element: <StaffSignInPage /> },
      { path: 'map', element: <MapPage /> },
      { path: 'resources', element: <ResourcesPage /> },
      { path: 'submissions', element: <SubmissionsPage /> },
      {
        path: 'staff',
        element: <RequireAuth />,
        children: [
          {
            element: <StaffLayout />,
            children: [
              { index: true, element: <StaffHomePage /> },
              { path: 'submissions', element: <StaffSubmissionsPage /> },
              { path: 'users', element: <StaffUsersPage /> },
            ],
          },
        ],
      },
      { path: '404', element: <NotFoundPage /> },
      { path: '*', element: <Navigate to="/404" replace /> },
    ],
  },
]
