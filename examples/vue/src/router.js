/** @format */

import {createRouter, createWebHistory} from 'vue-router'

import Index from './views/index.vue'
import Sha1 from './views/Sha1.vue'

const routerHistory = createWebHistory()

let routes = [
  {
    path: '/',
    name: 'index',
    component: Index,
  },
  {
    path: '/sha1',
    name: 'sha1',
    component: Sha1,
  },
]

const router = createRouter({
  history: routerHistory,
  routes,
})

export default router
