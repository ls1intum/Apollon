import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/search',
    component: ComponentCreator('/search', '822'),
    exact: true
  },
  {
    path: '/admin',
    component: ComponentCreator('/admin', '885'),
    routes: [
      {
        path: '/admin',
        component: ComponentCreator('/admin', '97a'),
        routes: [
          {
            path: '/admin',
            component: ComponentCreator('/admin', 'a77'),
            routes: [
              {
                path: '/admin/dsms/dpia-prescreen',
                component: ComponentCreator('/admin/dsms/dpia-prescreen', 'c61'),
                exact: true,
                sidebar: "adminSidebar"
              },
              {
                path: '/admin/dsms/overview',
                component: ComponentCreator('/admin/dsms/overview', 'c97'),
                exact: true,
                sidebar: "adminSidebar"
              },
              {
                path: '/admin/dsms/processor-checklist',
                component: ComponentCreator('/admin/dsms/processor-checklist', 'fde'),
                exact: true,
                sidebar: "adminSidebar"
              },
              {
                path: '/admin/dsms/record-of-processing',
                component: ComponentCreator('/admin/dsms/record-of-processing', 'a0f'),
                exact: true,
                sidebar: "adminSidebar"
              },
              {
                path: '/admin/legal-pages',
                component: ComponentCreator('/admin/legal-pages', '431'),
                exact: true,
                sidebar: "adminSidebar"
              },
              {
                path: '/admin/operations',
                component: ComponentCreator('/admin/operations', 'cdd'),
                exact: true,
                sidebar: "adminSidebar"
              },
              {
                path: '/admin/runbook',
                component: ComponentCreator('/admin/runbook', '769'),
                exact: true,
                sidebar: "adminSidebar"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '/contributor',
    component: ComponentCreator('/contributor', '248'),
    routes: [
      {
        path: '/contributor',
        component: ComponentCreator('/contributor', '6e9'),
        routes: [
          {
            path: '/contributor',
            component: ComponentCreator('/contributor', 'c02'),
            routes: [
              {
                path: '/contributor',
                component: ComponentCreator('/contributor', '679'),
                exact: true,
                sidebar: "contributorSidebar"
              },
              {
                path: '/contributor/deployment/github-actions',
                component: ComponentCreator('/contributor/deployment/github-actions', '1aa'),
                exact: true,
                sidebar: "contributorSidebar"
              },
              {
                path: '/contributor/deployment/npm-publishing',
                component: ComponentCreator('/contributor/deployment/npm-publishing', '9cb'),
                exact: true,
                sidebar: "contributorSidebar"
              },
              {
                path: '/contributor/development/project-structure',
                component: ComponentCreator('/contributor/development/project-structure', 'f89'),
                exact: true,
                sidebar: "contributorSidebar"
              },
              {
                path: '/contributor/development/scripts',
                component: ComponentCreator('/contributor/development/scripts', 'ad0'),
                exact: true,
                sidebar: "contributorSidebar"
              },
              {
                path: '/contributor/development/versioning',
                component: ComponentCreator('/contributor/development/versioning', '6d4'),
                exact: true,
                sidebar: "contributorSidebar"
              },
              {
                path: '/contributor/development/visual-tests',
                component: ComponentCreator('/contributor/development/visual-tests', '85a'),
                exact: true,
                sidebar: "contributorSidebar"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '/library',
    component: ComponentCreator('/library', 'ebe'),
    routes: [
      {
        path: '/library',
        component: ComponentCreator('/library', '713'),
        routes: [
          {
            path: '/library',
            component: ComponentCreator('/library', 'bc6'),
            routes: [
              {
                path: '/library',
                component: ComponentCreator('/library', '0f1'),
                exact: true,
                sidebar: "librarySidebar"
              },
              {
                path: '/library/api',
                component: ComponentCreator('/library/api', '69e'),
                exact: true,
                sidebar: "librarySidebar"
              },
              {
                path: '/library/api/collaboration',
                component: ComponentCreator('/library/api/collaboration', '15a'),
                exact: true,
                sidebar: "librarySidebar"
              },
              {
                path: '/library/api/export',
                component: ComponentCreator('/library/api/export', 'bae'),
                exact: true,
                sidebar: "librarySidebar"
              },
              {
                path: '/library/embedding/angular',
                component: ComponentCreator('/library/embedding/angular', '2f9'),
                exact: true,
                sidebar: "librarySidebar"
              },
              {
                path: '/library/embedding/install',
                component: ComponentCreator('/library/embedding/install', '271'),
                exact: true,
                sidebar: "librarySidebar"
              },
              {
                path: '/library/embedding/react',
                component: ComponentCreator('/library/embedding/react', 'af0'),
                exact: true,
                sidebar: "librarySidebar"
              },
              {
                path: '/library/embedding/vanilla',
                component: ComponentCreator('/library/embedding/vanilla', 'bc0'),
                exact: true,
                sidebar: "librarySidebar"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '/user',
    component: ComponentCreator('/user', '905'),
    routes: [
      {
        path: '/user',
        component: ComponentCreator('/user', '42d'),
        routes: [
          {
            path: '/user',
            component: ComponentCreator('/user', '752'),
            routes: [
              {
                path: '/user/getting-started/requirements',
                component: ComponentCreator('/user/getting-started/requirements', 'df3'),
                exact: true,
                sidebar: "userSidebar"
              },
              {
                path: '/user/getting-started/setup',
                component: ComponentCreator('/user/getting-started/setup', 'd8c'),
                exact: true,
                sidebar: "userSidebar"
              },
              {
                path: '/user/mobile/ios-android-setup',
                component: ComponentCreator('/user/mobile/ios-android-setup', '791'),
                exact: true,
                sidebar: "userSidebar"
              },
              {
                path: '/user/troubleshooting/common-issues',
                component: ComponentCreator('/user/troubleshooting/common-issues', '535'),
                exact: true,
                sidebar: "userSidebar"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '/',
    component: ComponentCreator('/', 'e5f'),
    exact: true
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];
