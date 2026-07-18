import { Navigate, type RouteObject } from 'react-router-dom'
import { AppLayout, StaffLayout } from '@/app/layouts'
import { RequireAuth } from '@/app/router/RequireAuth'
import { DiscoverPage } from '@/pages/DiscoverPage'
import { HomePage } from '@/pages/HomePage'
import { MapPage } from '@/pages/MapPage'
import { ResourcesPage } from '@/pages/ResourcesPage'
import { SubmissionsPage } from '@/pages/SubmissionsPage'
import { SubmitResourcePage } from '@/pages/SubmitResourcePage'
import { RequestResourceUpdatePage } from '@/pages/RequestResourceUpdatePage'
import { StaffSignInPage } from '@/pages/StaffSignInPage'
import { StaffHomePage } from '@/pages/StaffHomePage'
import { StaffSubmissionsPage } from '@/pages/StaffSubmissionsPage'
import { StaffUpdateRequestsPage } from '@/pages/StaffUpdateRequestsPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <DiscoverPage /> },
      { path: 'home', element: <HomePage /> },
      { path: 'submit', element: <SubmitResourcePage /> },
      { path: 'request-update', element: <RequestResourceUpdatePage /> },
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
              { path: 'update-requests', element: <StaffUpdateRequestsPage /> },
            ],
          },
        ],
      },
      { path: '404', element: <NotFoundPage /> },
      { path: '*', element: <Navigate to="/404" replace /> },
    ],
  },
]
