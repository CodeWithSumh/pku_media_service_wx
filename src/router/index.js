import Vue from 'vue';
import Router from 'vue-router';

Vue.use(Router);

export default new Router({
  mode: 'history',
  routes: [
    {
      path: '/',
      redirect: '/model-list'
    },
    {
      path: '/model-list',
      component: () => import("@/components/model-list"),
      props: { msg: '高斯渲染列表' }
    },
    {
      path: '/model',
      component: () => import("@/components/model"),
      props: { msg: '高斯渲染' }
    }
  ]
});