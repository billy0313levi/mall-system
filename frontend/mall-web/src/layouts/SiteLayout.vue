<template>
  <div class="site-shell">
    <SiteHeader />
    <main class="site-main">
      <div class="page-width">
        <div class="site-stage">
          <RouterView />
        </div>
      </div>
    </main>
    <footer class="site-footer">
      <div class="page-width site-footer-grid">
        <div>
          <strong>山河商城</strong>
          <p>日用百货、数码配件与常用商品在线选购。</p>
        </div>
        <div>
          <strong>购物指南</strong>
          <p>商品浏览</p>
          <p>加入购物车</p>
          <p>提交订单</p>
        </div>
        <div>
          <strong>会员服务</strong>
          <p>个人中心</p>
          <p>地址管理</p>
          <p>订单查询</p>
        </div>
        <div>
          <strong>售后支持</strong>
          <p>正品保障</p>
          <p>支付记录</p>
          <p>联系客服</p>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import SiteHeader from '../components/SiteHeader.vue';
</script>
