import Vue from 'vue';
import Router from 'vue-router';

Vue.use(Router);

console.log(window.BASE_URL)

export default new Router({
  mode: 'history',
  // 核心新增：添加base属性，值和vite.config.js中的base完全一致
  base: window.BASE_URL,
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