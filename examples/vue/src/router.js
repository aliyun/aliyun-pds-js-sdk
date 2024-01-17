import {createRouter, createWebHistory} from 'vue-router'

import Pan from './views/pan/index.vue'
import Calc from './views/calc/index.vue'

const routerHistory = createWebHistory()

let routes = [
  {
    path: '/pan',
    name: 'pan_entry',
    component: Pan,
  },
  {
    path: '/pan/:driveId',
    name: 'pan',
    component: Pan,
  },
  {
    path: '/pan/:driveId/:folderId',
    name: 'folder',
    component: Pan,
  },
  {
    path: '/calc',
    name: 'calc',
    component: Calc,
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/pan',
  },
]

const router = createRouter({
  history: routerHistory,
  routes,
})

export default router
